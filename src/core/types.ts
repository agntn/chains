export type ChainKey =
  | "eth"
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
  | "bera"
  | "bitcoin"
  | "litecoin"
  | "solana"
  | "aptos"
  | "sui"
  | "ton"
  | "tron"
  | "oct";
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
