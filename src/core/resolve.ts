import type { Chain } from "./chain.js";
import { UnsupportedChainError } from "./errors.js";
import type { ChainKey } from "./types.js";
import { create } from "./registry.js";
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
export function getChain(input?: string): Chain {
  if (!input) return create("eth");
  const alias = input.toLowerCase().trim();
  const key = Object.hasOwn(aliases, alias) ? aliases[alias] : undefined;
  if (!key) throw new UnsupportedChainError(input);
  return create(key);
}
