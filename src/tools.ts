/**
 * The chain tools, declared once for MCP, Pi, OMP, the AI SDK and the CLI. Executors load on the
 * first call. `Type` comes from `@agntn/tools`, never a bare `typebox`: OMP rewrites that import to
 * its own facade, and validation then accepts any value.
 */

import { defineTool, type TString, type ToolDefinition, Type } from "@agntn/tools";

type ToolOperations = typeof import("./tool-operations.ts");

let operations: Promise<ToolOperations> | undefined;

/**
 * Loads the executors once. A failed load isn't cached, so a broken `dist` doesn't stick.
 *
 * @returns {Promise<ToolOperations>} The executors.
 */
export function loadOperations(): Promise<ToolOperations> {
  operations ??= import("./tool-operations.ts").catch((error: unknown) => {
    operations = undefined;
    throw error;
  });
  return operations;
}

/** Every input is closed: the core refuses an open object, and an unknown key gets named. */
export const closed = { additionalProperties: false } as const;

/** One chain argument for every tool, so each surface describes it the same way. */
const chainArgument = Type.String({
  description: "Chain key, name, symbol, or alias (for example: ethereum, matic, btc)",
  minLength: 1,
  maxLength: 64,
});

/**
 * One length contract for every address and txid parameter; only the wording differs.
 *
 * @param description - Parameter description.
 * @returns {TString} The bounded string schema.
 */
function valueArgument(description: string): TString {
  return Type.String({ description, minLength: 1, maxLength: 256 });
}

export const lookupTool = defineTool({
  name: "chains_lookup",
  title: "Chain Lookup",
  description:
    "Resolve a blockchain by key, name, symbol, or alias and return its canonical metadata: chain ID, CAIP-2 identifier, BIP-44 coin type, explorer, and default RPC.",
  snippet:
    "Use chains_lookup to resolve a blockchain's canonical key, chain ID, CAIP-2 identifier, or explorer.",
  guidelines: [
    "Accepts aliases such as matic, arb, avax, btc, or a full name such as Ethereum.",
    "Prefer this over hardcoding chain IDs, BIP-44 coin types, or explorer URLs.",
  ],
  effect: "read",
  input: Type.Object({ chain: chainArgument }, closed),
  cli: {
    command: "info",
    aliases: ["lookup"],
    description: "Show canonical metadata for a chain",
    positional: ["chain"],
  },
  execute: async ({ chain }) => (await loadOperations()).lookupChain(chain),
});

export const addressValidateTool = defineTool({
  name: "chains_address_validate",
  title: "Validate Chain Address",
  description:
    "Check an address against the format rules of a specific blockchain, checksum included where the format carries one, so a typo fails there; an EVM address in one case carries none. A valid UTXO address comes back with its kind (p2pkh, p2wpkh, p2tr...) and the hash or witness program it pays to, in hex. Not an on-chain existence check. When the owning chain is unknown, chains_address_identify checks every validator at once.",
  snippet:
    "Use chains_address_validate before sending funds or storing an address, to confirm it matches the target chain's format.",
  guidelines: [
    "A format check with the checksum verified where the format carries one, so a typo fails there; an EVM address in one case carries none. Not an on-chain existence check.",
    "A valid UTXO address comes back with its kind (p2pkh, p2wpkh, p2tr...) and the hash or witness program it pays to, in hex.",
    "A chain without a registered validator fails the call, because nothing was checked.",
    "When the owning chain is unknown, chains_address_identify checks every validator at once.",
  ],
  effect: "read",
  input: Type.Object(
    { chain: chainArgument, address: valueArgument("Address to validate") },
    closed,
  ),
  cli: { command: "validate", positional: ["chain", "address"] },
  execute: async ({ chain, address }) =>
    (await loadOperations()).validateChainAddress(chain, address),
});

export const txidValidateTool = defineTool({
  name: "chains_txid_validate",
  title: "Validate Chain Txid",
  description:
    "Check a transaction id against the format rules of a specific blockchain: 0x and 64 hex digits on EVM chains and Aptos, 64 hex digits on UTXO chains, Monero, TRON and the XRP Ledger, lowercase only on Stellar and Octra, base58 of 64 bytes on Solana and 32 on Sui, hex or padded base64 on TON, 43 base64url characters on Arweave. A format check only, not proof that the transaction exists. Every registered chain carries the check; a custom chain without one answers with isError.",
  snippet:
    "Use chains_txid_validate before looking a transaction up or storing its id, to confirm it fits the target chain's format.",
  guidelines: [
    "A format check only: it says nothing about whether the transaction exists or was mined.",
    "EVM chains and Aptos take 0x and 64 hex digits, UTXO chains, Monero, TRON and the XRP Ledger 64 hex digits, Stellar and Octra lowercase hex only, Solana a base58 signature of 64 bytes, Sui a base58 digest of 32, TON hex or padded base64, Arweave 43 base64url characters. A txid that fails reports valid: false with a reason.",
  ],
  effect: "read",
  input: Type.Object(
    { chain: chainArgument, txid: valueArgument("Transaction id to validate") },
    closed,
  ),
  cli: {
    command: "txid",
    description: "Validate a transaction id against a chain's format rules",
    positional: ["chain", "txid"],
  },
  execute: async ({ chain, txid }) => (await loadOperations()).validateChainTxid(chain, txid),
});

export const addressIdentifyTool = defineTool({
  name: "chains_address_identify",
  title: "Identify Address",
  description:
    "Check an address of unknown origin against every registered validator and report which chains accept its format. A match narrows the family rather than proving ownership, and chains without a validator are listed as unchecked instead of silently skipped.",
  snippet:
    "Use chains_address_identify when an address's origin is unknown, to narrow it down to the chains whose format rules accept it.",
  guidelines: [
    "A format match narrows the family; every EVM chain shares one address format.",
    "Chains without a validator are reported as unchecked, not as non-matches.",
  ],
  effect: "read",
  input: Type.Object({ address: valueArgument("Address of unknown origin") }, closed),
  cli: {
    command: "identify",
    description: "Report which chains accept an address's format",
    positional: ["address"],
  },
  execute: async ({ address }) => (await loadOperations()).identifyAddress(address),
});

export const listTool = defineTool({
  name: "chains_list",
  title: "List Chains",
  description:
    "List every registered blockchain with its key, symbol and family, optionally narrowed to one family. Use this to find out what this server covers instead of guessing a chain name.",
  snippet:
    "Use chains_list to see which blockchains are available, instead of guessing a chain name.",
  guidelines: [
    "Families are evm, utxo, solana, stellar, xrpl, move, ton, tron, octra, arweave and monero.",
    "Every key and name it prints resolves in chains_lookup.",
  ],
  effect: "read",
  input: Type.Object(
    {
      family: Type.Optional(
        Type.String({
          description: "Chain family to filter by (for example: evm, utxo, solana, stellar)",
          minLength: 1,
          maxLength: 32,
        }),
      ),
    },
    closed,
  ),
  cli: {
    command: "list",
    description: "List every registered chain, optionally one family",
    positional: ["family"],
  },
  execute: async ({ family }) => (await loadOperations()).listChains(family),
});

/** Every chain tool in the order MCP lists them, each keeping its literal name for `toAiTools`. */
export const chainTools = [
  lookupTool,
  addressValidateTool,
  txidValidateTool,
  addressIdentifyTool,
  listTool,
] as const satisfies readonly ToolDefinition[];
