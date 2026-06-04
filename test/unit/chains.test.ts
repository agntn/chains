import { describe, it, expect } from "vitest"
import {
  CHAIN_DATA,
  CHAIN_ALIASES,
  normalizeChain,
  isEvm,
  isSolana,
  isUtxo,
  isMove,
  isTon,
  isTron,
} from "../../src/index.ts"
import {
  blocexChain,
  rpcxChain,
  ubichainChain,
  webriChain,
  tokriskChain,
  chainpexChain,
} from "../../src/index.ts"
import {
  assertEvmAddress,
  assertSolanaAddress,
  assertBitcoinAddress,
} from "../../src/index.ts"

// ─── CHAIN_DATA ─────────────────────────────────────────────────────────────

describe("CHAIN_DATA", () => {
  it("has all expected chains", () => {
    const keys = Object.keys(CHAIN_DATA)
    expect(keys).toContain("eth")
    expect(keys).toContain("bitcoin")
    expect(keys).toContain("solana")
    expect(keys).toContain("base")
    expect(keys).toContain("arbitrum")
    expect(keys).toContain("optimism")
    expect(keys).toContain("polygon")
    expect(keys).toContain("bsc")
    expect(keys).toContain("avalanche")
    expect(keys).toContain("fantom")
    expect(keys).toContain("gnosis")
    expect(keys).toContain("linea")
    expect(keys).toContain("zksync")
    expect(keys).toContain("scroll")
    expect(keys).toContain("aptos")
    expect(keys).toContain("sui")
    expect(keys).toContain("ton")
    expect(keys).toContain("tron")
  })

  it("has all required fields for ethereum", () => {
    const eth = CHAIN_DATA.eth!
    expect(eth.name).toBe("Ethereum")
    expect(eth.symbol).toBe("ETH")
    expect(eth.bip44).toBe(60)
    expect(eth.chainId).toBe("0x1")
    expect(eth.type).toBe("evm")
    expect(eth.caip2).toBe("eip155:1")
    expect(eth.explorer).toContain("etherscan")
  })

  it("has correct chainId for each EVM chain", () => {
    const checks: Record<string, string> = {
      eth: "0x1",
      base: "0x2105",
      arbitrum: "0xa4b1",
      optimism: "0xa",
      polygon: "0x89",
      bsc: "0x38",
      avalanche: "0xa86a",
      fantom: "0xfa",
      gnosis: "0x64",
      linea: "0xe704",
      zksync: "0x144",
      scroll: "0x82750",
    }
    for (const [key, expected] of Object.entries(checks)) {
      expect(CHAIN_DATA[(key as keyof typeof CHAIN_DATA)]!.chainId).toBe(
        expected,
      )
    }
  })

  it("has correct bip44 for non-EVM chains", () => {
    expect(CHAIN_DATA.bitcoin!.bip44).toBe(0)
    expect(CHAIN_DATA.solana!.bip44).toBe(501)
    expect(CHAIN_DATA.aptos!.bip44).toBe(637)
    expect(CHAIN_DATA.sui!.bip44).toBe(784)
    expect(CHAIN_DATA.ton!.bip44).toBe(607)
    expect(CHAIN_DATA.tron!.bip44).toBe(195)
  })

  it("has correct type for each chain", () => {
    expect(isEvm("eth")).toBe(true)
    expect(isEvm("base")).toBe(true)
    expect(isEvm("bitcoin")).toBe(false)
    expect(isEvm("solana")).toBe(false)

    expect(isSolana("solana")).toBe(true)
    expect(isSolana("eth")).toBe(false)

    expect(isUtxo("bitcoin")).toBe(true)
    expect(isUtxo("eth")).toBe(false)

    expect(isMove("aptos")).toBe(true)
    expect(isMove("sui")).toBe(true)
    expect(isMove("eth")).toBe(false)

    expect(isTon("ton")).toBe(true)
    expect(isTon("eth")).toBe(false)

    expect(isTron("tron")).toBe(true)
    expect(isTron("eth")).toBe(false)
  })
})

// ─── normalizeChain ─────────────────────────────────────────────────────────

describe("normalizeChain", () => {
  it("returns eth for undefined", () => {
    expect(normalizeChain()).toBe("eth")
  })

  it("returns eth for empty string", () => {
    expect(normalizeChain("")).toBe("eth")
  })

  it("handles 3-letter canonical keys", () => {
    expect(normalizeChain("eth")).toBe("eth")
    expect(normalizeChain("btc")).toBe("bitcoin")
    expect(normalizeChain("sol")).toBe("solana")
  })

  it("handles full names", () => {
    expect(normalizeChain("ethereum")).toBe("eth")
    expect(normalizeChain("bitcoin")).toBe("bitcoin")
    expect(normalizeChain("solana")).toBe("solana")
    expect(normalizeChain("polygon")).toBe("polygon")
  })

  it("handles aliases", () => {
    expect(normalizeChain("matic")).toBe("polygon")
    expect(normalizeChain("bnb")).toBe("bsc")
    expect(normalizeChain("avax")).toBe("avalanche")
    expect(normalizeChain("arb")).toBe("arbitrum")
    expect(normalizeChain("xdai")).toBe("gnosis")
  })

  it("handles case insensitivity", () => {
    expect(normalizeChain("ETH")).toBe("eth")
    expect(normalizeChain("Ethereum")).toBe("eth")
    expect(normalizeChain("MATIC")).toBe("polygon")
  })

  it("throws for unknown chain", () => {
    expect(() => normalizeChain("foobar")).toThrow("Unsupported chain: foobar")
  })

  it("has all expected key variants in CHAIN_ALIASES", () => {
    // Every canonical chain should have at least itself as alias
    for (const key of Object.keys(CHAIN_DATA)) {
      expect(CHAIN_ALIASES[key]).toBe(key)
    }
  })
})

// ─── Inter-lib bridges ──────────────────────────────────────────────────────

describe("inter-lib bridges", () => {
  it("blocexChain returns 3-letter keys", () => {
    expect(blocexChain("eth")).toBe("eth")
    expect(blocexChain("bitcoin")).toBe("bitcoin")
    expect(blocexChain("solana")).toBe("solana")
  })

  it("rpcxChain returns correct names", () => {
    expect(rpcxChain("eth")).toBe("ethereum")
    expect(rpcxChain("bitcoin")).toBe("bitcoin")
    expect(rpcxChain("solana")).toBe("solana")
    expect(rpcxChain("polygon")).toBe("polygon")
  })

  it("ubichainChain returns correct names", () => {
    expect(ubichainChain("eth")).toBe("ethereum")
    expect(ubichainChain("bitcoin")).toBe("bitcoin")
    expect(ubichainChain("solana")).toBe("solana")
    expect(ubichainChain("base")).toBe("base")
    expect(ubichainChain("aptos")).toBe("aptos")
  })

  it("webriChain returns correct names", () => {
    expect(webriChain("eth")).toBe("ethereum")
    expect(webriChain("solana")).toBe("solana")
    expect(webriChain("ton")).toBeUndefined()
  })

  it("tokriskChain returns 3-letter keys", () => {
    expect(tokriskChain("eth")).toBe("eth")
    expect(tokriskChain("solana")).toBe("solana")
  })

  it("chainpexChain returns 3-letter keys", () => {
    expect(chainpexChain("eth")).toBe("eth")
    expect(chainpexChain("solana")).toBe("solana")
  })
})

// ─── Address validation ────────────────────────────────────────────────────

describe("assertEvmAddress", () => {
  it("accepts valid EVM addresses", () => {
    expect(assertEvmAddress("0x0000000000000000000000000000000000000000")).toBe(
      "0x0000000000000000000000000000000000000000",
    )
    expect(assertEvmAddress("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984")).toBe(
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    )
  })

  it("rejects invalid EVM addresses", () => {
    expect(() => assertEvmAddress("0x0000")).toThrow()
    expect(() => assertEvmAddress("not-an-address")).toThrow()
    expect(() => assertEvmAddress("")).toThrow()
  })
})

describe("assertSolanaAddress", () => {
  it("accepts valid Solana addresses", () => {
    expect(assertSolanaAddress("11111111111111111111111111111111")).toBe(
      "11111111111111111111111111111111",
    )
    expect(
      assertSolanaAddress("So11111111111111111111111111111111111111112"),
    ).toBe("So11111111111111111111111111111111111111112")
  })

  it("rejects invalid Solana addresses", () => {
    expect(() => assertSolanaAddress("0x0000")).toThrow()
    expect(() => assertSolanaAddress("")).toThrow()
  })
})

describe("assertBitcoinAddress", () => {
  it("accepts valid legacy Bitcoin addresses", () => {
    // P2PKH
    expect(assertBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )
  })

  it("rejects invalid Bitcoin addresses", () => {
    expect(() => assertBitcoinAddress("0x0000")).toThrow()
    expect(() => assertBitcoinAddress("")).toThrow()
    expect(() => assertBitcoinAddress("abc")).toThrow()
  })
})
