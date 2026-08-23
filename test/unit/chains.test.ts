import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decodeBase58 } from "../../src/core/base58.ts";
import {
  AddressValidationUnsupportedError,
  Arbitrum,
  Bitcoin,
  Chain,
  ChainsError,
  Ethereum,
  EVM,
  InvalidAddressError,
  Octra,
  Solana,
  UnsupportedChainError,
  chains,
  create,
  getChain,
  has,
  identify,
  type ChainKey,
} from "../../src/index.ts";

/**
 * Every registered chain now overrides assertAddress, so the base contract -
 * throw instead of quietly saying yes - is exercised through this stand-in.
 */
class Unvalidated extends Chain {
  static readonly key = "unvalidated" as ChainKey;
  readonly type = "octra" as const;
  readonly name = "Unvalidated";
  readonly symbol = "NONE";
  readonly explorer = "https://example.com";
}

describe("chain registry", () => {
  it("self-registers every concrete chain class", () => {
    expect(chains()).toEqual([
      "eth",
      "base",
      "arbitrum",
      "optimism",
      "polygon",
      "bsc",
      "avalanche",
      "fantom",
      "gnosis",
      "linea",
      "zksync",
      "scroll",
      "bera",
      "bitcoin",
      "solana",
      "aptos",
      "sui",
      "ton",
      "tron",
      "oct",
    ]);
    expect(has("eth")).toBe(true);
  });

  it("constructs a fresh concrete instance", () => {
    const first = create("eth");
    const second = create("eth");
    expect(first).toBeInstanceOf(Ethereum);
    expect(first).toBeInstanceOf(EVM);
    expect(first).toBeInstanceOf(Chain);
    expect(first).not.toBe(second);
  });

  it("preserves concrete runtime identities", () => {
    expect(create("arbitrum")).toBeInstanceOf(Arbitrum);
    expect(create("bitcoin")).toBeInstanceOf(Bitcoin);
    expect(create("solana")).toBeInstanceOf(Solana);
    expect(create("oct")).toBeInstanceOf(Octra);
  });
});

describe("chain metadata", () => {
  it("is owned by the concrete class", () => {
    expect(create("eth")).toMatchObject({
      key: "eth",
      name: "Ethereum",
      symbol: "ETH",
      bip44: 60,
      chainId: "0x1",
      type: "evm",
      caip2: "eip155:1",
      explorer: "https://etherscan.io",
    });
  });

  it("keeps CAIP-2 references within the 32-character limit", () => {
    for (const key of chains()) {
      const { caip2 } = create(key);
      if (!caip2) continue;
      const [namespace, reference] = caip2.split(":");
      expect(namespace, caip2).toMatch(/^[-a-z0-9]{3,8}$/);
      expect(reference, caip2).toMatch(/^[-_a-zA-Z0-9]{1,32}$/);
    }
  });

  it("carries the truncated Solana genesis hash", () => {
    expect(create("solana").caip2).toBe("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
  });

  it("does not invent unregistered Octra identifiers", () => {
    const octra = create("oct");
    expect(octra).toMatchObject({
      key: "oct",
      name: "Octra",
      symbol: "OCT",
      type: "octra",
      explorer: "https://octrascan.io",
      rpcDefault: "https://octra.network/rpc",
    });
    expect(octra.bip44).toBeUndefined();
    expect(octra.caip2).toBeUndefined();
  });
});

describe("chain resolution", () => {
  it("resolves aliases to concrete classes", () => {
    expect(getChain()).toBeInstanceOf(Ethereum);
    expect(getChain("Ethereum")).toBeInstanceOf(Ethereum);
    expect(getChain("matic").key).toBe("polygon");
    expect(getChain("BTC")).toBeInstanceOf(Bitcoin);
    expect(getChain("octra")).toBeInstanceOf(Octra);
  });

  it("rejects unknown chains", () => {
    expect(() => getChain("foobar")).toThrow('Unsupported chain: "foobar"');
  });

  it("rejects inherited object properties as aliases", () => {
    for (const inherited of ["constructor", "__proto__", "tostring", "hasownproperty"]) {
      expect(() => getChain(inherited)).toThrow(`Unsupported chain: ${JSON.stringify(inherited)}`);
    }
  });
});

describe("address validation", () => {
  it("is inherited by concrete EVM chains", () => {
    const ethereum = create("eth");
    const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    expect(ethereum.assertAddress(address)).toBe(address);
    expect(() => ethereum.assertAddress("0x0000")).toThrow("Invalid eth address");
  });

  it("uses chain-family validators", () => {
    expect(create("bitcoin").assertAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    );
    expect(create("solana").assertAddress("So11111111111111111111111111111111111111112")).toBe(
      "So11111111111111111111111111111111111111112",
    );
  });

  it("rejects validation when a chain carries no validator", () => {
    expect(() => new Unvalidated().assertAddress("0x1")).toThrow(
      "Address validation is not supported for unvalidated",
    );
  });
});

describe("agent extensions", () => {
  it("keeps the OMP copy identical to the Pi extension", () => {
    const pi = readFileSync(new URL("../../packages/pi/extensions/chains.ts", import.meta.url));
    const omp = readFileSync(new URL("../../packages/omp/extensions/chains.ts", import.meta.url));
    expect(omp.toString()).toBe(pi.toString());
  });
});

describe("error hierarchy", () => {
  it("throws typed errors that all descend from ChainsError", () => {
    expect(() => getChain("foobar")).toThrow(UnsupportedChainError);
    expect(() => getChain("foobar")).toThrow(ChainsError);
    expect(() => create("eth").assertAddress("0x0")).toThrow(InvalidAddressError);
    expect(() => new Unvalidated().assertAddress("0x1")).toThrow(AddressValidationUnsupportedError);
  });

  it("carries structured context instead of only a message", () => {
    try {
      create("bitcoin").assertAddress("nope");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAddressError);
      const invalid = error as InvalidAddressError;
      expect(invalid.chain).toBe("bitcoin");
      expect(invalid.address).toBe("nope");
      expect(invalid.name).toBe("InvalidAddressError");
      expect(create(invalid.chain).key).toBe("bitcoin");
    }
  });

  /**
   * EVM chains used to report the family and the rest a display name, so the
   * field could not be fed back into getChain or compared across chains.
   */
  it("names the canonical key on every invalid-address error", () => {
    for (const key of chains()) {
      const chain = create(key);
      if (!chain.validatesAddress) continue;
      try {
        chain.assertAddress("!");
        expect.unreachable(`${key} accepted "!"`);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidAddressError);
        expect((error as InvalidAddressError).chain).toBe(key);
      }
    }
  });
});

describe("metadata cross-checks", () => {
  it("agrees between chainId and the CAIP-2 reference on every EVM chain", () => {
    // The two encode the same number in different bases, so a typo in one shows up
    // as a disagreement rather than as anything a type or a lint rule can see.
    // Linea shipped 0xe704 (Goerli) against eip155:59144 (mainnet) until this ran.
    const mismatches = chains()
      .map((key) => create(key))
      .filter((chain) => chain.chainId && chain.caip2?.startsWith("eip155:"))
      .filter(
        (chain) =>
          Number.parseInt(chain.chainId as string, 16) !==
          Number(chain.caip2?.slice("eip155:".length)),
      )
      .map((chain) => `${chain.key}: ${chain.chainId} vs ${chain.caip2}`);

    expect(mismatches).toEqual([]);
  });

  it("declares an https explorer and RPC for every chain that has one", () => {
    for (const chain of chains().map((key) => create(key))) {
      expect(chain.explorer).toMatch(/^https:\/\//);
      if (chain.rpcDefault) expect(chain.rpcDefault).toMatch(/^https:\/\//);
    }
  });
});

describe("display name resolution", () => {
  it("round-trips every registered name back to its own key", () => {
    // chains_lookup prints `name`, and the obvious next call feeds it back in.
    for (const key of chains()) {
      const chain = create(key);
      expect(getChain(chain.name).key).toBe(key);
      expect(getChain(chain.name.toUpperCase()).key).toBe(key);
    }
  });

  it("still prefers the curated alias table over a name match", () => {
    expect(getChain("eth").key).toBe("eth");
    expect(getChain("matic").key).toBe("polygon");
  });

  it("treats blank input as a mistake but no input as the default", () => {
    expect(getChain().key).toBe("eth");
    expect(() => getChain("")).toThrow(UnsupportedChainError);
    expect(() => getChain("   ")).toThrow(UnsupportedChainError);
    // Quoted, so a blank subject stays visible in a log line.
    expect(() => getChain("   ")).toThrow('Unsupported chain: "   "');
  });
});

describe("Solana address validation", () => {
  const solana = create("solana");

  it("accepts real accounts across the full base58 length range", () => {
    // All three decode to 32 bytes; the System Program is all zero bytes, which
    // base58 writes as 32 ones, so a character-length window cannot cover them.
    expect(solana.assertAddress("11111111111111111111111111111111")).toBeTruthy();
    expect(solana.assertAddress("So11111111111111111111111111111111111111112")).toBeTruthy();
    expect(solana.assertAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBeTruthy();
  });

  it("rejects addresses from other base58 chains", () => {
    // 25-byte payloads: the old {32,44} window called all three valid Solana.
    expect(() => solana.assertAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toThrow(
      InvalidAddressError,
    );
    expect(() => solana.assertAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toThrow(
      InvalidAddressError,
    );
    expect(() => solana.assertAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects non-base58 characters", () => {
    expect(() => solana.assertAddress("0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl")).toThrow(
      InvalidAddressError,
    );
  });
});

describe("Bitcoin address validation", () => {
  const bitcoin = create("bitcoin");

  it("accepts both legal bech32 cases, including the BIP-173 uppercase vector", () => {
    // Uppercase is what QR encoders emit, so rejecting it breaks scanned addresses.
    expect(bitcoin.assertAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBeTruthy();
    expect(bitcoin.assertAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4")).toBeTruthy();
    expect(
      bitcoin.assertAddress("bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297"),
    ).toBeTruthy();
  });

  it("rejects mixed case, which BIP-173 makes invalid", () => {
    expect(() => bitcoin.assertAddress("bc1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4")).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects characters outside the bech32 charset", () => {
    // b, i, o and 1 are not in the charset; the old pattern accepted them.
    expect(() => bitcoin.assertAddress("bc1biobiobiobiobiobiobiobiobiobiobiobiobio")).toThrow(
      InvalidAddressError,
    );
    expect(() => bitcoin.assertAddress("bc1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toThrow(
      InvalidAddressError,
    );
  });

  it("still accepts legacy base58 addresses", () => {
    expect(bitcoin.assertAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBeTruthy();
    expect(bitcoin.assertAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBeTruthy();
  });

  /**
   * Base58Check is 25 bytes: version, 20-byte hash, checksum. The System
   * Program is a 32-byte key that fits the old character-length window, and the
   * TRON address is 25 bytes under version 0x41 - decoding rejects both.
   */
  it("rejects base58 payloads with the wrong byte length or version", () => {
    expect(() => bitcoin.assertAddress("11111111111111111111111111111111")).toThrow(
      InvalidAddressError,
    );
    expect(() => bitcoin.assertAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toThrow(
      InvalidAddressError,
    );
  });
});

describe("TRON address validation", () => {
  const tron = create("tron");

  it("accepts mainnet base58check addresses under version 0x41", () => {
    expect(tron.assertAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBeTruthy();
    expect(tron.assertAddress("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb")).toBeTruthy();
  });

  /** Bitcoin's 25 bytes under 0x00, and two 32-byte Solana keys. */
  it("rejects base58 payloads with another version or byte length", () => {
    expect(() => tron.assertAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toThrow(
      InvalidAddressError,
    );
    expect(() => tron.assertAddress("11111111111111111111111111111111")).toThrow(
      InvalidAddressError,
    );
    expect(() => tron.assertAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toThrow(
      InvalidAddressError,
    );
  });
});

describe("TON address validation", () => {
  const ton = create("ton");

  /**
   * The USDT jetton master, bounceable and non-bounceable, then the standard
   * alphabet spelling of the first, then the masterchain burn address. The
   * final pair pins base64 digit 62, which the jetton vectors never reach:
   * the alphabets differ in two characters, 62 as + or - and 63 as / or _.
   */
  it("accepts both tags, both workchains and both base64 alphabets", () => {
    expect(ton.assertAddress("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs")).toBeTruthy();
    expect(ton.assertAddress("UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_p0p")).toBeTruthy();
    expect(ton.assertAddress("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id/sDs")).toBeTruthy();
    expect(ton.assertAddress("Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF")).toBeTruthy();
    expect(ton.assertAddress("EQATExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTE-Nt")).toBeTruthy();
    expect(ton.assertAddress("EQATExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTE+Nt")).toBeTruthy();
  });

  it("rejects the testnet-only flag, unknown tags and unknown workchains", () => {
    expect(() => ton.assertAddress("kQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_ntm")).toThrow(
      InvalidAddressError,
    );
    expect(() => ton.assertAddress("IgCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_oEp")).toThrow(
      InvalidAddressError,
    );
    expect(() => ton.assertAddress("EQGxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_k0w")).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects the raw form and strings that are not 48 base64 characters", () => {
    expect(() =>
      ton.assertAddress("0:b113a994b5024a16719f691393532eb75959b8e2897d64211458bd57ecdc3623"),
    ).toThrow(InvalidAddressError);
    expect(() => ton.assertAddress("EQCxE6mU")).toThrow(InvalidAddressError);
  });
});

describe("Move address validation", () => {
  const aptos = create("aptos");
  const sui = create("sui");

  it("accepts the full 32-byte hex form on both chains", () => {
    const framework = `0x${"0".repeat(63)}1`;
    expect(aptos.assertAddress(framework)).toBe(framework);
    expect(sui.assertAddress(`0x${"0".repeat(63)}5`)).toBeTruthy();
  });

  it("accepts the AIP-40 short form of the special addresses", () => {
    expect(aptos.assertAddress("0x1")).toBe("0x1");
    expect(sui.assertAddress("0x2")).toBe("0x2");
  });

  /** Only 1 or 64 digits pass; dropped leading zeros would admit EVM addresses. */
  it("rejects intermediate short forms, and with them every EVM address", () => {
    expect(() => aptos.assertAddress("0x12")).toThrow(InvalidAddressError);
    expect(() => sui.assertAddress("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984")).toThrow(
      InvalidAddressError,
    );
    expect(() => aptos.assertAddress(`0x${"0".repeat(62)}1`)).toThrow(InvalidAddressError);
  });
});

describe("base58 decoding", () => {
  /**
   * Decoding grows a BigInt per character, so its cost is quadratic in length.
   * The required bound rejects oversized input before that work starts; MCP
   * caps the address at the schema, but the library and CLI have no such gate.
   */
  it("rejects input past the caller's bound before decoding", () => {
    expect(decodeBase58("z".repeat(36), 35)).toBeUndefined();
    expect(decodeBase58("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", 35)).toHaveLength(25);
  });
});

describe("address identification", () => {
  it("checks the whole registry and narrows an EVM address to its family", () => {
    const { matches, unchecked } = identify("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");

    expect(matches.map((chain) => chain.key)).toEqual([
      "eth",
      "base",
      "arbitrum",
      "optimism",
      "polygon",
      "bsc",
      "avalanche",
      "fantom",
      "gnosis",
      "linea",
      "zksync",
      "scroll",
      "bera",
    ]);
    expect(unchecked).toEqual([]);
  });

  it("attributes a TRON address to TRON alone", () => {
    const { matches } = identify("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");

    expect(matches.map((chain) => chain.key)).toEqual(["tron"]);
  });

  it("attributes a TON friendly address to TON alone", () => {
    const { matches } = identify("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs");

    expect(matches.map((chain) => chain.key)).toEqual(["ton"]);
  });

  it("narrows a 32-byte hex address to the move family", () => {
    const { matches } = identify(`0x${"0".repeat(63)}1`);

    expect(matches.map((chain) => chain.key)).toEqual(["aptos", "sui"]);
  });

  it("narrows the short special-address form to the move family too", () => {
    const { matches } = identify("0x1");

    expect(matches.map((chain) => chain.key)).toEqual(["aptos", "sui"]);
  });

  /**
   * The System Program sat inside Bitcoin's old character-length window, so
   * identify used to report a false bitcoin match here. Decoding settles it.
   */
  it("attributes the Solana System Program to Solana alone", () => {
    const { matches } = identify("11111111111111111111111111111111");

    expect(matches.map((chain) => chain.key)).toEqual(["solana"]);
  });
});

describe("validator capability", () => {
  it("is carried by every registered chain", () => {
    expect(chains().filter((key) => !create(key).validatesAddress)).toEqual([]);
  });

  it("stays false on a chain that never overrode the base validator", () => {
    expect(new Unvalidated().validatesAddress).toBe(false);
  });
});
