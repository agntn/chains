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
  | "decred"
  | "arc"
  | "dogecoin"
  | "bitcoincash"
  | "bitcoinsv"
  | "bitcoingold"
  | "dash"
  | "zcash";
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
/**
 * The work a miner grinds to seal a block. Equihash carries its (n, k), because Zcash
 * and Bitcoin Gold both run it with different parameters.
 */
export type PowAlgorithm =
  | "sha256d"
  | "scrypt"
  | "x11"
  | "equihash-200-9"
  | "equihash-144-5"
  | "blake3"
  | "randomx";
export interface ChainInfo {
  readonly name: string;
  readonly symbol: string;
  /** Native currency precision: one whole unit is 10^decimals base units. */
  readonly decimals?: number;
  readonly bip44?: number;
  readonly chainId?: string;
  readonly type: ChainType;
  readonly caip2?: string;
  /** Mainnet P2P message start, four bytes as lowercase hex in wire order. */
  readonly magic?: string;
  /** Mainnet proof-of-work algorithm. */
  readonly pow?: PowAlgorithm;
  readonly explorer: string;
  readonly rpcDefault?: string;
}
