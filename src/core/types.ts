/** The chain by name, never by ticker: `ethereum`, not `eth`. Tickers live in the alias table. */
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
  | "zcash"
  | "near"
  | "waves";
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
  | "monero"
  | "near"
  | "waves";
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
  /** Mainnet P2P start, four bytes as lowercase hex in wire order: `netMagic`, not `diskMagic`. */
  readonly magic?: string;
  /** The work the node's own header check demands, read from its code, not a pool's coin list. */
  readonly pow?: PowAlgorithm;
  readonly explorer: string;
  readonly rpcDefault?: string;
}
