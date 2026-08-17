import type { Chain } from "./chain.js";
import { UnsupportedChainError } from "./errors.js";
import type { ChainKey } from "./types.js";
import { chains, create } from "./registry.js";
const aliases: Readonly<Record<string, ChainKey>> = {
  eth: "eth",
  ethereum: "eth",
  mainnet: "eth",
  base: "base",
  coinbase: "base",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  arb1: "arbitrum",
  optimism: "optimism",
  op: "optimism",
  polygon: "polygon",
  matic: "polygon",
  pol: "polygon",
  bsc: "bsc",
  bnb: "bsc",
  binance: "bsc",
  bnbchain: "bsc",
  avalanche: "avalanche",
  avax: "avalanche",
  fantom: "fantom",
  ftm: "fantom",
  gnosis: "gnosis",
  xdai: "gnosis",
  linea: "linea",
  zksync: "zksync",
  "zksync-era": "zksync",
  scroll: "scroll",
  bera: "bera",
  berachain: "bera",
  bitcoin: "bitcoin",
  btc: "bitcoin",
  solana: "solana",
  sol: "solana",
  aptos: "aptos",
  apt: "aptos",
  sui: "sui",
  ton: "ton",
  tron: "tron",
  trx: "tron",
  oct: "oct",
  octra: "oct",
};
/**
 * Matches a display name against the registry rather than a second hand-written table.
 *
 * The lookup tools print `name`, and the obvious next call feeds that name back in.
 * Reading names off the registered classes keeps that round trip working for chains
 * added later, and for renames, without anyone remembering to edit the alias table.
 * Symbols stay out of it: six chains report ETH, so indexing them would make the
 * answer depend on registration order.
 */
function keyByName(name: string): ChainKey | undefined {
  for (const key of chains()) {
    if (create(key).name.toLowerCase() === name) return key;
  }
  return undefined;
}

export function getChain(input?: string): Chain {
  if (input === undefined) return create("eth");
  const alias = input.toLowerCase().trim();
  // An empty or blank string is a caller mistake, not a request for the default.
  if (!alias) throw new UnsupportedChainError(input);
  const key = (Object.hasOwn(aliases, alias) ? aliases[alias] : undefined) ?? keyByName(alias);
  if (!key) throw new UnsupportedChainError(input);
  return create(key);
}
