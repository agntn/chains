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
  | "aptos"
  | "sui"
  | "ton"
  | "tron"
  | "octra";
export type ChainType = "evm" | "utxo" | "solana" | "move" | "ton" | "tron" | "octra";
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
