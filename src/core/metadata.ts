import { UnknownChainError } from "./errors.ts";
import type { ChainInfo, ChainKey } from "./types.ts";

/** What a wallet or a table prints about a chain: no validator needed, so none comes along. */
export type ChainMetadata = Required<Pick<ChainInfo, "name" | "symbol" | "decimals" | "explorer">>;

/** A literal on purpose: a frozen or computed table is a call, and a bundler keeps calls. */
const METADATA: Readonly<Record<ChainKey, ChainMetadata>> = {
  ethereum: { name: "Ethereum", symbol: "ETH", decimals: 18, explorer: "https://etherscan.io" },
  base: { name: "Base", symbol: "ETH", decimals: 18, explorer: "https://basescan.org" },
  arbitrum: { name: "Arbitrum One", symbol: "ETH", decimals: 18, explorer: "https://arbiscan.io" },
  optimism: {
    name: "Optimism",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://optimistic.etherscan.io",
  },
  polygon: {
    name: "Polygon PoS",
    symbol: "POL",
    decimals: 18,
    explorer: "https://polygonscan.com",
  },
  bsc: { name: "BNB Chain", symbol: "BNB", decimals: 18, explorer: "https://bscscan.com" },
  avalanche: {
    name: "Avalanche C-Chain",
    symbol: "AVAX",
    decimals: 18,
    explorer: "https://snowtrace.io",
  },
  fantom: { name: "Fantom Opera", symbol: "FTM", decimals: 18, explorer: "https://ftmscan.com" },
  gnosis: { name: "Gnosis Chain", symbol: "xDAI", decimals: 18, explorer: "https://gnosisscan.io" },
  linea: { name: "Linea", symbol: "ETH", decimals: 18, explorer: "https://lineascan.build" },
  zksync: {
    name: "zkSync Era",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://explorer.zksync.io",
  },
  scroll: { name: "Scroll", symbol: "ETH", decimals: 18, explorer: "https://scrollscan.com" },
  berachain: { name: "Berachain", symbol: "BERA", decimals: 18, explorer: "https://berascan.com" },
  bitcoin: { name: "Bitcoin", symbol: "BTC", decimals: 8, explorer: "https://blockstream.info" },
  litecoin: { name: "Litecoin", symbol: "LTC", decimals: 8, explorer: "https://litecoinspace.org" },
  pepecoin: { name: "Pepecoin", symbol: "PEP", decimals: 8, explorer: "https://peppool.space" },
  ecash: { name: "eCash", symbol: "XEC", decimals: 2, explorer: "https://explorer.e.cash" },
  cardano: { name: "Cardano", symbol: "ADA", decimals: 6, explorer: "https://cardanoscan.io" },
  solana: { name: "Solana", symbol: "SOL", decimals: 9, explorer: "https://solscan.io" },
  stellar: {
    name: "Stellar",
    symbol: "XLM",
    decimals: 7,
    explorer: "https://stellar.expert/explorer/public",
  },
  xrpl: { name: "XRP Ledger", symbol: "XRP", decimals: 6, explorer: "https://livenet.xrpl.org" },
  aptos: { name: "Aptos", symbol: "APT", decimals: 8, explorer: "https://explorer.aptoslabs.com" },
  sui: { name: "Sui", symbol: "SUI", decimals: 9, explorer: "https://suiscan.xyz" },
  ton: {
    name: "TON (The Open Network)",
    symbol: "TON",
    decimals: 9,
    explorer: "https://tonscan.org",
  },
  tron: { name: "TRON", symbol: "TRX", decimals: 6, explorer: "https://tronscan.org" },
  octra: { name: "Octra", symbol: "OCT", decimals: 6, explorer: "https://octrascan.io" },
  arweave: {
    name: "Arweave",
    symbol: "AR",
    decimals: 12,
    explorer: "https://viewblock.io/arweave",
  },
  monero: { name: "Monero", symbol: "XMR", decimals: 12, explorer: "https://xmrchain.net" },
  decred: { name: "Decred", symbol: "DCR", decimals: 8, explorer: "https://dcrdata.decred.org" },
  arc: { name: "Arc", symbol: "USDC", decimals: 18, explorer: "https://explorer.arc.io" },
  dogecoin: {
    name: "Dogecoin",
    symbol: "DOGE",
    decimals: 8,
    explorer: "https://blockchair.com/dogecoin",
  },
  bitcoincash: {
    name: "Bitcoin Cash",
    symbol: "BCH",
    decimals: 8,
    explorer: "https://blockchair.com/bitcoin-cash",
  },
  bitcoinsv: {
    name: "Bitcoin SV",
    symbol: "BSV",
    decimals: 8,
    explorer: "https://whatsonchain.com",
  },
  bitcoingold: {
    name: "Bitcoin Gold",
    symbol: "BTG",
    decimals: 8,
    explorer: "https://btgexplorer.com",
  },
  dash: { name: "Dash", symbol: "DASH", decimals: 8, explorer: "https://insight.dash.org/insight" },
  zcash: { name: "Zcash", symbol: "ZEC", decimals: 8, explorer: "https://blockchair.com/zcash" },
  near: { name: "NEAR Protocol", symbol: "NEAR", decimals: 24, explorer: "https://nearblocks.io" },
  waves: { name: "Waves", symbol: "WAVES", decimals: 8, explorer: "https://wavesexplorer.com" },
};

/**
 * Reads a built-in chain's display fields off a table, so printing `DCR` ships no BLAKE-256.
 *
 * @param {ChainKey} key - Canonical key of a built-in chain. Aliases are `getChain`'s job.
 * @returns {ChainMetadata} A fresh copy, so one caller's edit stays with that caller.
 * @throws {UnknownChainError} When no built-in chain has that key.
 */
export function metadata(key: ChainKey): ChainMetadata {
  if (typeof key !== "string" || !Object.hasOwn(METADATA, key)) {
    throw new UnknownChainError(String(key));
  }
  return { ...METADATA[key] };
}
