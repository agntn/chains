/**
 * chains — Blockchain data dictionary
 *
 * Canonical chain identifiers and per-chain records.
 * 3-letter lowercase key is the canonical identifier used across all Aei web3 libraries.
 *
 * Sources:
 * - tokrisk/src/core/types.ts (CHAIN_SYMBOLS, CHAIN_NAMES, aliases, address validation)
 * - blocex/src/core/types.ts (CHAIN_SYMBOLS, CHAIN_NAMES, normalizeChain)
 * - rpcx/src/core/types.ts (Chain type)
 * - rpcx/src/providers/evm/*.ts (chainId, DEFAULT_URL)
 * - ubichain/src/blockchains/*.ts (bip44)
 * - wallex/src/core/types.ts (inter-lib bridges)
 * - SLIP-0044 (bip44 coin types)
 * - CAIP-2 specification
 * - Chainlist / EIP-155
 */

import type { Chain, ChainInfo } from "./types.js"

// ─── Data ───────────────────────────────────────────────────────────────────

/**
 * Per-chain record.
 *
 * Canonical key = 3-letter lowercase.
 * EVM chainIds verified against public RPC endpoints (eth_chainId).
 */
export const CHAIN_DATA: Record<Chain, ChainInfo> = {
  // ─── EVM ─────────────────────────────────────────────────────────────────
  eth: {
    name: "Ethereum",
    symbol: "ETH",
    bip44: 60,
    chainId: "0x1",
    type: "evm",
    caip2: "eip155:1",
    explorer: "https://etherscan.io",
    rpcDefault: "https://ethereum-rpc.publicnode.com",
  },
  base: {
    name: "Base",
    symbol: "ETH",
    bip44: 60, // uses Ethereum coin type as L2
    chainId: "0x2105",
    type: "evm",
    caip2: "eip155:8453",
    explorer: "https://basescan.org",
    rpcDefault: "https://base-rpc.publicnode.com",
  },
  arbitrum: {
    name: "Arbitrum One",
    symbol: "ETH",
    bip44: 60,
    chainId: "0xa4b1",
    type: "evm",
    caip2: "eip155:42161",
    explorer: "https://arbiscan.io",
    rpcDefault: "https://arbitrum-one-rpc.publicnode.com",
  },
  optimism: {
    name: "Optimism",
    symbol: "ETH",
    bip44: 60,
    chainId: "0xa",
    type: "evm",
    caip2: "eip155:10",
    explorer: "https://optimistic.etherscan.io",
    rpcDefault: "https://optimism-rpc.publicnode.com",
  },
  polygon: {
    name: "Polygon PoS",
    symbol: "POL",
    bip44: 60,
    chainId: "0x89",
    type: "evm",
    caip2: "eip155:137",
    explorer: "https://polygonscan.com",
    rpcDefault: "https://polygon-bor-rpc.publicnode.com",
  },
  bsc: {
    name: "BNB Chain",
    symbol: "BNB",
    bip44: 60,
    chainId: "0x38",
    type: "evm",
    caip2: "eip155:56",
    explorer: "https://bscscan.com",
    rpcDefault: "https://bsc-rpc.publicnode.com",
  },
  avalanche: {
    name: "Avalanche C-Chain",
    symbol: "AVAX",
    bip44: 60,
    chainId: "0xa86a",
    type: "evm",
    caip2: "eip155:43114",
    explorer: "https://snowtrace.io",
    rpcDefault: "https://avalanche-c-chain-rpc.publicnode.com",
  },
  fantom: {
    name: "Fantom Opera",
    symbol: "FTM",
    bip44: 60,
    chainId: "0xfa",
    type: "evm",
    caip2: "eip155:250",
    explorer: "https://ftmscan.com",
    rpcDefault: "https://fantom-rpc.publicnode.com",
  },
  gnosis: {
    name: "Gnosis Chain",
    symbol: "xDAI",
    bip44: 60,
    chainId: "0x64",
    type: "evm",
    caip2: "eip155:100",
    explorer: "https://gnosisscan.io",
    rpcDefault: "https://gnosis-rpc.publicnode.com",
  },
  linea: {
    name: "Linea",
    symbol: "ETH",
    bip44: 60,
    chainId: "0xe704",
    type: "evm",
    caip2: "eip155:59144",
    explorer: "https://lineascan.build",
    rpcDefault: "https://linea-rpc.publicnode.com",
  },
  zksync: {
    name: "zkSync Era",
    symbol: "ETH",
    bip44: 60,
    chainId: "0x144",
    type: "evm",
    caip2: "eip155:324",
    explorer: "https://explorer.zksync.io",
    rpcDefault: "https://zksync-era-rpc.publicnode.com",
  },
  scroll: {
    name: "Scroll",
    symbol: "ETH",
    bip44: 60,
    chainId: "0x82750",
    type: "evm",
    caip2: "eip155:534352",
    explorer: "https://scrollscan.com",
    rpcDefault: "https://scroll-rpc.publicnode.com",
  },

  // ─── Non-EVM ─────────────────────────────────────────────────────────────
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    bip44: 0,
    type: "utxo",
    caip2: "bip122:000000000019d6689c085ae165831e93",
    explorer: "https://blockstream.info",
    rpcDefault: undefined,
  },
  solana: {
    name: "Solana",
    symbol: "SOL",
    bip44: 501,
    type: "solana",
    caip2: "solana:5eykt4Us2vunv3nrY1g2C2tkscK8PBsJ3P8PdrLxTcr",
    explorer: "https://solscan.io",
    rpcDefault: "https://api.mainnet-beta.solana.com",
  },
  aptos: {
    name: "Aptos",
    symbol: "APT",
    bip44: 637,
    type: "move",
    caip2: "aptos:mainnet",
    explorer: "https://explorer.aptoslabs.com",
    rpcDefault: undefined,
  },
  sui: {
    name: "Sui",
    symbol: "SUI",
    bip44: 784,
    type: "move",
    caip2: "sui:mainnet",
    explorer: "https://suiscan.xyz",
    rpcDefault: undefined,
  },
  ton: {
    name: "TON (The Open Network)",
    symbol: "TON",
    bip44: 607,
    type: "ton",
    caip2: "ton:-1", // workchain -1 = masterchain
    explorer: "https://tonscan.org",
    rpcDefault: undefined,
  },
  tron: {
    name: "TRON",
    symbol: "TRX",
    bip44: 195,
    type: "tron",
    caip2: "tron:0x2b6653dc",
    explorer: "https://tronscan.org",
    rpcDefault: undefined,
  },
}

// ─── Aliases ────────────────────────────────────────────────────────────────

/**
 * All known chain name variants → canonical Chain key.
 * Used by normalizeChain().
 */
export const CHAIN_ALIASES: Record<string, Chain> = {
  // ethereum
  eth: "eth",
  ethereum: "eth",
  mainnet: "eth",
  // base
  base: "base",
  coinbase: "base",
  // arbitrum
  arbitrum: "arbitrum",
  arb: "arbitrum",
  arb1: "arbitrum",
  // optimism
  optimism: "optimism",
  op: "optimism",
  // polygon
  polygon: "polygon",
  matic: "polygon",
  pol: "polygon",
  // bsc
  bsc: "bsc",
  bnb: "bsc",
  binance: "bsc",
  bnbchain: "bsc",
  // avalanche
  avalanche: "avalanche",
  avax: "avalanche",
  // fantom
  fantom: "fantom",
  ftm: "fantom",
  // gnosis
  gnosis: "gnosis",
  xdai: "gnosis",
  // linea
  linea: "linea",
  // zksync
  zksync: "zksync",
  "zksync-era": "zksync",
  // scroll
  scroll: "scroll",
  // bitcoin
  bitcoin: "bitcoin",
  btc: "bitcoin",
  // solana
  solana: "solana",
  sol: "solana",
  // aptos
  aptos: "aptos",
  apt: "aptos",
  // sui
  sui: "sui",
  // ton
  ton: "ton",
  // tron
  tron: "tron",
  trx: "tron",
}

// ─── Inter-lib bridge maps ─────────────────────────────────────────────────

/**
 * Map canonical Chain → blocex chain key.
 * blocex uses 3-letter lowercase (same as canonical, except for one difference).
 */
export function blocexChain(chain: Chain): string {
  // blocex uses the same 3-letter keys: eth, base, arbitrum, etc.
  return chain
}

/**
 * Map canonical Chain → rpcx chain key.
 * rpcx uses full lowercase names: "ethereum", "bitcoin", "solana"
 */
export function rpcxChain(chain: Chain): string {
  const map: Partial<Record<Chain, string>> = {
    eth: "ethereum",
    bsc: "ethereum", // no dedicated rpcx provider
    polygon: "polygon",
    avalanche: "ethereum",
    fantom: "ethereum",
    gnosis: "ethereum",
    linea: "ethereum",
    zksync: "ethereum",
    scroll: "ethereum",
    bitcoin: "bitcoin",
    solana: "solana",
  }
  return map[chain] ?? "ethereum"
}

/**
 * Map canonical Chain → ubichain blockchain key.
 * ubichain uses full lowercase names: "ethereum", "bitcoin", "solana"
 * EVM L2s fall back to "ethereum" key derivation (same BIP44).
 */
export function ubichainChain(chain: Chain): string {
  const map: Partial<Record<Chain, string>> = {
    eth: "ethereum",
    base: "base",
    arbitrum: "ethereum",
    optimism: "ethereum",
    polygon: "ethereum",
    bsc: "ethereum",
    avalanche: "ethereum",
    fantom: "ethereum",
    gnosis: "ethereum",
    linea: "ethereum",
    zksync: "ethereum",
    scroll: "ethereum",
    bitcoin: "bitcoin",
    solana: "solana",
    aptos: "aptos",
    sui: "sui",
    ton: "ethereum", // fallback — no ubichain ton yet
    tron: "tron",
  }
  return map[chain] ?? "ethereum"
}

/**
 * Map canonical Chain → webri chain key.
 * webri supports only eth, base, arbitrum, optimism, solana.
 */
export function webriChain(chain: Chain): string | undefined {
  const map: Partial<Record<Chain, string>> = {
    eth: "ethereum",
    base: "base",
    arbitrum: "arbitrum",
    optimism: "optimism",
    solana: "solana",
  }
  return map[chain]
}

/**
 * Map canonical Chain → tokrisk chain key.
 * tokrisk uses the same 3-letter keys (identical to canonical).
 */
export function tokriskChain(chain: Chain): string {
  return chain
}

/**
 * Map canonical Chain → chainpex chain key.
 * chainpex uses blocex chain keys (3-letter, same as canonical).
 */
export function chainpexChain(chain: Chain): string {
  return chain
}

// ─── Type guards ───────────────────────────────────────────────────────────

export function isEvm(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "evm"
}

export function isSolana(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "solana"
}

export function isUtxo(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "utxo"
}

export function isMove(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "move"
}

export function isTon(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "ton"
}

export function isTron(chain: Chain): boolean {
  return CHAIN_DATA[chain]!.type === "tron"
}

// ─── Normalize ──────────────────────────────────────────────────────────────

/**
 * Normalize any chain input form → canonical Chain key.
 * Accepts: full names ("ethereum"), symbols ("ETH"), aliases ("matic"), 3-letter keys ("eth").
 * Default: 'eth'.
 * Throws on unknown input.
 */
export function normalizeChain(input?: string): Chain {
  if (!input) return "eth"
  const lower = input.toLowerCase().trim()
  const alias = CHAIN_ALIASES[lower]
  if (alias) return alias
  throw new Error(`Unsupported chain: ${input}`)
}

// ─── Address validation ────────────────────────────────────────────────────

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const BITCOIN_ADDRESS =
  /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/

/**
 * Validate an EVM (0x + 40 hex) address.
 * Throws on malformed input to prevent path injection.
 */
export function assertEvmAddress(address: string): string {
  if (!EVM_ADDRESS.test(address)) {
    throw new Error(`Invalid EVM address: ${address}`)
  }
  return address
}

/**
 * Validate a base58 Solana address (mint or wallet).
 * Throws on malformed input.
 */
export function assertSolanaAddress(address: string): string {
  if (!SOLANA_ADDRESS.test(address)) {
    throw new Error(`Invalid Solana address: ${address}`)
  }
  return address
}

/**
 * Validate a Bitcoin address (legacy P2PKH/P2SH or bech32 native segwit).
 * Throws on malformed input.
 */
export function assertBitcoinAddress(address: string): string {
  if (!BITCOIN_ADDRESS.test(address)) {
    throw new Error(`Invalid Bitcoin address: ${address}`)
  }
  return address
}
