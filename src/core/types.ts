export type ChainKey =
  | "ethereum"
  | "base"
  | "arbitrum"
  | "optimism"
  | "polygon"
  | "bsc"
  | "avalanche"
  | "fantom"
  | "gnosis"
  | "linea"
  | "zksync"
  | "scroll"
  | "berachain"
  | "bitcoin"
  | "litecoin"
  | "pepecoin"
  | "ecash"
  | "cardano"
  | "solana"
  | "stellar"
  | "xrpl"
  | "aptos"
  | "sui"
  | "ton"
  | "tron"
  | "octra"
  | "arweave"
  | "monero"
  | "decred";
export type ChainType =
  | "evm"
  | "utxo"
  | "solana"
  | "stellar"
  | "xrpl"
  | "move"
  | "ton"
  | "tron"
  | "octra"
  | "arweave"
  | "monero";
export interface ChainInfo {
  readonly name: string;
  readonly symbol: string;
  readonly bip44?: number;
  readonly chainId?: string;
  readonly type: ChainType;
  readonly caip2?: string;
  readonly explorer: string;
  readonly rpcDefault?: string;
}
