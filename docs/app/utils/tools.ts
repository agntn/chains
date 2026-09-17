import { chains, create, identify, type Chain } from "@agntn/chains";

/**
 * The text the five tools hand a model, rebuilt here because `src/tool-operations.ts` is
 * not a package export. Mirrors `lookupChain`, `validateChainAddress`, `validateChainTxid`,
 * `identifyAddress` and `listChains` in the library line for line; a change there is a
 * change here.
 */

/** Mirrors `quoted` in `src/core/text.ts`: JSON quotes, control characters blanked. */
export function quoted(value: string): string {
  return JSON.stringify(value).replaceAll(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ");
}

/** Mirrors the `chains_lookup` text for a resolved chain. */
export function lookupText(chain: Chain): string {
  return [
    `${chain.name} (${chain.key})`,
    `symbol: ${chain.symbol}`,
    `decimals: ${chain.decimals ?? "unknown"}`,
    `type: ${chain.type}`,
    chain.chainId ? `chainId: ${chain.chainId}` : undefined,
    `caip2: ${chain.caip2 ?? "none (no registered CAIP-2 namespace)"}`,
    `bip44: ${chain.bip44 ?? "none (no registered SLIP-0044 coin type)"}`,
    `explorer: ${chain.explorer}`,
    chain.rpcDefault ? `rpc: ${chain.rpcDefault}` : undefined,
    chain.validatesAddress ? undefined : "addressValidation: unsupported",
    chain.validatesTxid ? undefined : "txidValidation: unsupported",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mirrors the `chains_validate_address` text for a checked address. */
export function validateText(chain: Chain, address: string, valid: boolean): string {
  return `${valid ? "Valid" : "Invalid"} ${chain.name} (${chain.key}) address: ${quoted(address)}`;
}

/** Mirrors the `chains_validate_txid` text for a checked transaction id. */
export function validateTxidText(chain: Chain, txid: string, valid: boolean): string {
  return `${valid ? "Valid" : "Invalid"} ${chain.name} (${chain.key}) txid: ${quoted(txid)}`;
}

/** Mirrors the `chains_identify_address` text: the partition grouped by family. */
export function identifyText(address: string): string {
  const { matches, unchecked } = identify(address);
  const checked = chains().length - unchecked.length;
  const byFamily = new Map<string, Chain[]>();
  for (const chain of matches) {
    byFamily.set(chain.type, [...(byFamily.get(chain.type) ?? []), chain]);
  }
  return [
    matches.length === 0
      ? `${quoted(address)} matches none of the ${checked} checked chains.`
      : `${quoted(address)} matches ${matches.length} of ${checked} checked chains.`,
    ...[...byFamily].map(
      ([family, group]) =>
        `${family} (${group.length}): ${group.map((chain) => chain.key).join(", ")}`,
    ),
    matches.length === 0
      ? undefined
      : "A format match narrows the family; it does not prove the address is used on any of these chains.",
    unchecked.length === 0
      ? undefined
      : `Not checked (no validator): ${unchecked.map((chain) => chain.key).join(", ")}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mirrors the `chains_list` text, optionally narrowed to one family. */
export function listText(family?: string): string {
  const all = chains().map((key) => create(key));
  const families = [...new Set(all.map((chain) => chain.type))];
  const rows = all.filter((chain) => family === undefined || chain.type === family);
  return [
    family === undefined
      ? `${rows.length} chains registered.`
      : `${rows.length} registered ${family} chain${rows.length === 1 ? "" : "s"}.`,
    ...rows.map(
      (chain) =>
        `${chain.key.padEnd(10)} ${chain.symbol.padEnd(6)} ${chain.type.padEnd(7)} ${chain.name}`,
    ),
    `Families: ${families.join(", ")}. Every key and name above resolves in chains_lookup.`,
  ].join("\n");
}
