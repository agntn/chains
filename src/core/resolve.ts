import type { Chain } from "./chain.js";
import { UnsupportedChainError } from "./errors.js";
import type { ChainKey } from "./types.js";
import { chains, create } from "./registry.js";
/**
 * Only spellings the registry cannot answer itself. Canonical keys resolve
 * straight off the registry, so a chain listed here under its own key is dead
 * weight; the table used to require exactly that, and a chain whose display
 * name shares no spelling with its key could not be resolved by key at all.
 */
const aliases: Readonly<Record<string, ChainKey>> = {
  eth: "ethereum",
  mainnet: "ethereum",
  coinbase: "base",
  arb: "arbitrum",
  arb1: "arbitrum",
  op: "optimism",
  matic: "polygon",
  pol: "polygon",
  bnb: "bsc",
  binance: "bsc",
  bnbchain: "bsc",
  avax: "avalanche",
  ftm: "fantom",
  xdai: "gnosis",
  "zksync-era": "zksync",
  bera: "berachain",
  btc: "bitcoin",
  ltc: "litecoin",
  pep: "pepecoin",
  xec: "ecash",
  ada: "cardano",
  sol: "solana",
  xlm: "stellar",
  xrp: "xrpl",
  ripple: "xrpl",
  apt: "aptos",
  trx: "tron",
  oct: "octra",
};
/**
 * Matches a display name against the registry rather than a second hand-written table.
 *
 * The lookup tools print `name`, and the obvious next call feeds that name back in.
 * Reading names off the registered classes keeps that round trip working for chains
 * added later, and for renames, without anyone remembering to edit the alias table.
 * Symbols stay out of it: six chains report ETH, so indexing them would make the
 * answer depend on registration order.
 *
 * @param {string} name - Lowercase display name to resolve.
 * @returns {ChainKey | undefined} Matching canonical key, if registered.
 */
function keyByName(name: string): ChainKey | undefined {
  for (const key of chains()) {
    if (create(key).name.toLowerCase() === name) return key;
  }
  return undefined;
}

export function getChain(input?: string): Chain {
  if (input === undefined) return create("ethereum");
  const alias = input.toLowerCase().trim();
  // An empty or blank string is a caller mistake, not a request for the default.
  if (!alias) throw new UnsupportedChainError(input);
  const key =
    chains().find((registered) => registered === alias) ??
    (Object.hasOwn(aliases, alias) ? aliases[alias] : undefined) ??
    keyByName(alias);
  if (!key) throw new UnsupportedChainError(input);
  return create(key);
}
