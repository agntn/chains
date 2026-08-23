import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
} from "../../src/index.ts";

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

  it("rejects validation for unsupported families", () => {
    expect(() => create("aptos").assertAddress("0x1")).toThrow(
      "Address validation is not supported for aptos",
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
    expect(() => create("aptos").assertAddress("0x1")).toThrow(AddressValidationUnsupportedError);
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
});

describe("validator capability", () => {
  it("reports which chains can check an address at all", () => {
    const without = chains()
      .map((key) => create(key))
      .filter((chain) => !chain.validatesAddress)
      .map((chain) => chain.key);

    expect(without).toEqual(["aptos", "sui", "ton", "tron"]);
    for (const key of without) {
      expect(() => create(key).assertAddress("anything")).toThrow(
        AddressValidationUnsupportedError,
      );
    }
  });
});
