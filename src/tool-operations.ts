/**
 * Tool executors shared by the MCP server and the Pi and OMP extensions.
 *
 * Each executor returns the text a caller reads plus the structured details the
 * agent harnesses attach to the call. An MCP client sees only the text, so every
 * fact needed for a follow-up call has to be in it.
 *
 * Imports go through the package entrypoint so the chain classes are registered.
 */

import type { Chain } from "./index.js";
import {
  AddressValidationUnsupportedError,
  chains,
  ChainsError,
  create,
  getChain,
  InvalidAddressError,
} from "./index.js";

/** Canonical metadata for a resolved chain. */
export interface ChainLookup {
  key: string;
  name: string;
  symbol: string;
  type: string;
  bip44?: number;
  chainId?: string;
  caip2?: string;
  explorer: string;
  rpcDefault?: string;
  /** False when the chain inherits the base validator, which only throws. */
  validatesAddress: boolean;
}

/** One registry row, as listed by {@link listChains}. */
export interface ChainSummary {
  key: string;
  name: string;
  symbol: string;
  type: string;
}

/** The registry, optionally narrowed to one family. */
export interface ChainListing {
  chains: ChainSummary[];
  families: string[];
  family?: string;
}

/** Returned when the input matched no known chain. */
export interface LookupFailure {
  error: string;
  input: string;
  knownChains: string[];
}

/** Which registered chains accept an address, and which could not be checked. */
export interface AddressIdentification {
  address: string;
  /** Keys of every chain whose format check accepted the address. */
  matches: string[];
  /** Keys of chains without a validator; a miss says nothing about them. */
  unchecked: string[];
}

/** Outcome of checking one address against one chain's format rules. */
export interface AddressCheck {
  /** Canonical key, or null when the chain itself could not be resolved. */
  chain: string | null;
  address: string;
  valid: boolean;
  reason?: string;
}

/** Text for the model plus details for the harness, shared by every tool surface. */
export interface ToolResult<Details> {
  content: Array<{ type: "text"; text: string }>;
  details: Details;
  /** Set when the tool could not answer. MCP forwards it, the agent harnesses drop it. */
  isError?: boolean;
}

/** Keeps a failed resolution actionable by naming what the registry does hold. */
function resolutionHelp(): string {
  return `Known chain keys: ${chains().join(", ")}. Display names, symbols, and aliases such as matic or btc resolve too. Call chains_list for the whole registry.`;
}

/**
 * Resolves a key, name, symbol, or alias to its canonical chain metadata.
 *
 * @param input - Chain key, name, symbol, or alias.
 */
export function lookupChain(input: string): ToolResult<ChainLookup | LookupFailure> {
  let chain: Chain;
  try {
    chain = getChain(input);
  } catch (error) {
    if (!(error instanceof ChainsError)) throw error;
    return {
      content: [{ type: "text", text: `${error.message}\n${resolutionHelp()}` }],
      details: { error: error.message, input, knownChains: chains() },
      isError: true,
    };
  }

  const details: ChainLookup = {
    key: chain.key,
    name: chain.name,
    symbol: chain.symbol,
    type: chain.type,
    bip44: chain.bip44,
    chainId: chain.chainId,
    caip2: chain.caip2,
    explorer: chain.explorer,
    rpcDefault: chain.rpcDefault,
    validatesAddress: chain.validatesAddress,
  };

  const lines = [
    `${details.name} (${details.key})`,
    `symbol: ${details.symbol}`,
    `type: ${details.type}`,
    details.chainId ? `chainId: ${details.chainId}` : undefined,
    // caip2 and bip44 are printed even when absent. An omitted coin type reads as
    // "not shown" rather than "does not exist", which invites the caller to supply
    // one from memory — and a derivation path on an invented coin type silently
    // produces the wrong addresses. Absent chainId and rpc need no such line: the
    // type line already explains them.
    `caip2: ${details.caip2 ?? "none (no registered CAIP-2 namespace)"}`,
    `bip44: ${details.bip44 ?? "none (no registered SLIP-0044 coin type)"}`,
    `explorer: ${details.explorer}`,
    details.rpcDefault ? `rpc: ${details.rpcDefault}` : undefined,
    details.validatesAddress ? undefined : "addressValidation: unsupported",
  ].filter(Boolean);

  return { content: [{ type: "text", text: lines.join("\n") }], details };
}

/**
 * Lists the registered chains, optionally narrowed to one family.
 *
 * Without a listing, the only way to discover the registry is to send a value you
 * expect to fail and read the recovery text — which names keys and nothing else.
 *
 * @param family - Chain family to filter by, or undefined for the whole registry.
 */
export function listChains(family?: string): ToolResult<ChainListing> {
  const all = chains().map((key) => create(key));
  const families = [...new Set(all.map((chain) => chain.type))];

  if (family !== undefined && !families.some((known) => known === family)) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown chain family: ${JSON.stringify(family)}\nKnown families: ${families.join(", ")}.`,
        },
      ],
      details: { chains: [], families, family },
      isError: true,
    };
  }

  const rows = all.filter((chain) => family === undefined || chain.type === family);
  const lines = [
    family === undefined
      ? `${rows.length} chains registered.`
      : `${rows.length} registered ${family} chain${rows.length === 1 ? "" : "s"}.`,
    ...rows.map(
      (chain) =>
        `${chain.key.padEnd(10)} ${chain.symbol.padEnd(6)} ${chain.type.padEnd(7)} ${chain.name}`,
    ),
    `Families: ${families.join(", ")}. Every key and name above resolves in chains_lookup.`,
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    details: {
      chains: rows.map((chain) => ({
        key: chain.key,
        name: chain.name,
        symbol: chain.symbol,
        type: chain.type,
      })),
      families,
      family,
    },
  };
}

/**
 * Runs an address through every registered validator at once.
 *
 * The reverse of {@link validateChainAddress}: instead of confirming a known
 * chain, it narrows an address of unknown origin down to the chains whose format
 * rules accept it. A match is about format only, and every EVM chain shares one
 * format, so the text spells out how far the answer reaches. Chains without a
 * validator are named rather than skipped, because a silent skip would let
 * "matches none" read as "belongs to no registered chain".
 *
 * @param rawAddress - Address of unknown origin; surrounding whitespace is stripped first.
 */
export function identifyAddress(rawAddress: string): ToolResult<AddressIdentification> {
  const address = rawAddress.trim();
  const all = chains().map((key) => create(key));
  const matches: Chain[] = [];
  const unchecked: string[] = [];

  for (const chain of all) {
    if (!chain.validatesAddress) {
      unchecked.push(chain.key);
      continue;
    }
    try {
      chain.assertAddress(address);
      matches.push(chain);
    } catch (error) {
      if (!(error instanceof InvalidAddressError)) throw error;
    }
  }

  const checked = all.length - unchecked.length;
  const byFamily = new Map<string, string[]>();
  for (const chain of matches) {
    byFamily.set(chain.type, [...(byFamily.get(chain.type) ?? []), chain.key]);
  }

  const lines = [
    matches.length === 0
      ? `${address} matches none of the ${checked} checked chains.`
      : `${address} matches ${matches.length} of ${checked} checked chains.`,
    ...[...byFamily.entries()].map(
      ([family, keys]) => `${family} (${keys.length}): ${keys.join(", ")}`,
    ),
    matches.length === 0
      ? undefined
      : "A format match narrows the family; it does not prove the address is used on any of these chains.",
    unchecked.length === 0 ? undefined : `Not checked (no validator): ${unchecked.join(", ")}.`,
  ].filter(Boolean);

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    details: { address, matches: matches.map((chain) => chain.key), unchecked },
  };
}

/**
 * Checks an address against the format rules of one chain.
 *
 * A rejected address is an answer, not a failure. Only an unresolvable chain or
 * a chain without a validator sets `isError`, because then nothing was checked.
 *
 * @param input - Chain key, name, symbol, or alias.
 * @param rawAddress - Address to check; surrounding whitespace is stripped first.
 */
export function validateChainAddress(input: string, rawAddress: string): ToolResult<AddressCheck> {
  // getChain trims the chain argument, so the address is trimmed to match. An
  // address lifted out of a file, a log line or a chat message keeps its trailing
  // newline, and one invisible byte should not turn a good address into a bad one.
  const address = rawAddress.trim();
  let chain: Chain;
  try {
    chain = getChain(input);
  } catch (error) {
    if (!(error instanceof ChainsError)) throw error;
    return {
      content: [{ type: "text", text: `${error.message}\n${resolutionHelp()}` }],
      details: { chain: null, address, valid: false, reason: error.message },
      isError: true,
    };
  }

  try {
    chain.assertAddress(address);
    return {
      content: [{ type: "text", text: `Valid ${chain.name} (${chain.key}) address: ${address}` }],
      details: { chain: chain.key, address, valid: true },
    };
  } catch (error) {
    if (error instanceof InvalidAddressError) {
      return {
        content: [
          { type: "text", text: `Invalid ${chain.name} (${chain.key}) address: ${address}` },
        ],
        details: { chain: chain.key, address, valid: false, reason: error.message },
      };
    }
    if (!(error instanceof AddressValidationUnsupportedError)) throw error;
    return {
      content: [
        { type: "text", text: `${chain.name} (${chain.key}) carries no address validator` },
      ],
      details: { chain: chain.key, address, valid: false, reason: error.message },
      isError: true,
    };
  }
}
