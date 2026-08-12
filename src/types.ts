/**
 * chains — Type definitions
 */

/** Canonical chain identifier (3-letter lowercase) */
export type Chain =
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
  | "solana"
  | "aptos"
  | "sui"
  | "ton"
  | "tron"
  | "oct";

/** Blockchain type category */
export type ChainType = "evm" | "utxo" | "solana" | "move" | "ton" | "tron" | "octra"; // EVM-compatible (Ethereum, L2s, sidechains) // UTXO model (Bitcoin, Litecoin, Dogecoin) // Solana (Solana VM) // Move-based (Aptos, Sui) // TON (The Open Network) // TRON (TVM) // Octra

/** Per-chain data record */
export interface ChainInfo {
  /** Full human-readable name */
  name: string;
  /** Native token symbol */
  symbol: string;
  /** BIP-44 / SLIP-0044 coin type, when registered */
  bip44?: number;
  /** EVM chainId (hex), undefined for non-EVM */
  chainId?: string;
  /** Chain type category */
  type: ChainType;
  /** CAIP-2 chain identifier, when standardized */
  caip2?: string;
  /** Block explorer base URL */
  explorer: string;
  /** Default RPC endpoint, undefined if not applicable */
  rpcDefault?: string;
}
