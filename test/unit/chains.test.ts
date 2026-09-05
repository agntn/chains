import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { decodeBase58 } from "../../src/core/base58.ts";
import { XRP_ALPHABET } from "../../src/chains/xrpl.ts";
import {
  AddressValidationUnsupportedError,
  Arbitrum,
  Arweave,
  Bitcoin,
  Cardano,
  Chain,
  ChainsError,
  Ecash,
  Ethereum,
  EVM,
  InvalidAddressError,
  Litecoin,
  Monero,
  Octra,
  Pepecoin,
  Solana,
  Stellar,
  UnsupportedChainError,
  Xrpl,
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
  it("registers every built-in chain in list order", () => {
    expect(chains()).toEqual([
      "ethereum",
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
      "berachain",
      "bitcoin",
      "litecoin",
      "pepecoin",
      "ecash",
      "cardano",
      "solana",
      "stellar",
      "xrpl",
      "aptos",
      "sui",
      "ton",
      "tron",
      "octra",
      "arweave",
      "monero",
    ]);
    expect(has("ethereum")).toBe(true);
  });

  /** Catches a chain file that was written but never added to `builtins`. */
  it("lists every chain file in the registry", () => {
    const files = readdirSync(new URL("../../src/chains/", import.meta.url)).filter(
      (name) => name.endsWith(".ts") && name !== "index.ts",
    );
    expect(chains()).toHaveLength(files.length);
  });

  it("constructs a fresh concrete instance", () => {
    const first = create("ethereum");
    const second = create("ethereum");
    expect(first).toBeInstanceOf(Ethereum);
    expect(first).toBeInstanceOf(EVM);
    expect(first).toBeInstanceOf(Chain);
    expect(first).not.toBe(second);
  });

  it("preserves concrete runtime identities", () => {
    expect(create("arbitrum")).toBeInstanceOf(Arbitrum);
    expect(create("bitcoin")).toBeInstanceOf(Bitcoin);
    expect(create("litecoin")).toBeInstanceOf(Litecoin);
    expect(create("pepecoin")).toBeInstanceOf(Pepecoin);
    expect(create("ecash")).toBeInstanceOf(Ecash);
    expect(create("cardano")).toBeInstanceOf(Cardano);
    expect(create("solana")).toBeInstanceOf(Solana);
    expect(create("stellar")).toBeInstanceOf(Stellar);
    expect(create("xrpl")).toBeInstanceOf(Xrpl);
    expect(create("octra")).toBeInstanceOf(Octra);
    expect(create("arweave")).toBeInstanceOf(Arweave);
    expect(create("monero")).toBeInstanceOf(Monero);
  });
});

describe("chain metadata", () => {
  it("is owned by the concrete class", () => {
    expect(create("ethereum")).toMatchObject({
      key: "ethereum",
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

  it("carries Stellar pubnet metadata", () => {
    expect(create("stellar")).toMatchObject({
      key: "stellar",
      name: "Stellar",
      symbol: "XLM",
      type: "stellar",
      bip44: 148,
      caip2: "stellar:pubnet",
      explorer: "https://stellar.expert/explorer/public",
      rpcDefault: "https://soroban-rpc.mainnet.stellar.gateway.fm",
    });
  });

  it("carries XRP Ledger livenet metadata", () => {
    expect(create("xrpl")).toMatchObject({
      key: "xrpl",
      name: "XRP Ledger",
      symbol: "XRP",
      type: "xrpl",
      bip44: 144,
      caip2: "xrpl:0",
      explorer: "https://livenet.xrpl.org",
    });
  });

  it("does not invent unregistered Octra identifiers", () => {
    const octra = create("octra");
    expect(octra).toMatchObject({
      key: "octra",
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
    expect(getChain("ltc")).toBeInstanceOf(Litecoin);
    expect(getChain("pep")).toBeInstanceOf(Pepecoin);
    expect(getChain("xec")).toBeInstanceOf(Ecash);
    expect(getChain("ada")).toBeInstanceOf(Cardano);
    expect(getChain("xlm")).toBeInstanceOf(Stellar);
    expect(getChain("xrp")).toBeInstanceOf(Xrpl);
    expect(getChain("ripple")).toBeInstanceOf(Xrpl);
    expect(getChain("oct")).toBeInstanceOf(Octra);
  });

  /** These three were canonical keys, so anything already holding one has to land on the same chain. */
  it("keeps the old short spellings resolvable", () => {
    expect(getChain("eth").key).toBe("ethereum");
    expect(getChain("bera").key).toBe("berachain");
    expect(getChain("oct").key).toBe("octra");
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
    const ethereum = create("ethereum");
    const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    expect(ethereum.assertAddress(address)).toBe(address);
    expect(() => ethereum.assertAddress("0x0000")).toThrow("Invalid ethereum address");
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
  it("shares tool definitions with the Pi extension", () => {
    const pi = readFileSync(
      new URL("../../packages/pi/extensions/chains.ts", import.meta.url),
      "utf8",
    );
    const omp = readFileSync(
      new URL("../../packages/omp/extensions/chains.ts", import.meta.url),
      "utf8",
    );
    expect(omp.slice(omp.indexOf("export default"))).toBe(pi.slice(pi.indexOf("export default")));
  });
});

describe("error hierarchy", () => {
  it("throws typed errors that all descend from ChainsError", () => {
    expect(() => getChain("foobar")).toThrow(UnsupportedChainError);
    expect(() => getChain("foobar")).toThrow(ChainsError);
    expect(() => create("ethereum").assertAddress("0x0")).toThrow(InvalidAddressError);
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
    expect(getChain("eth").key).toBe("ethereum");
    expect(getChain("matic").key).toBe("polygon");
  });

  it("treats blank input as a mistake but no input as the default", () => {
    expect(getChain().key).toBe("ethereum");
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

describe("Stellar address validation", () => {
  const stellar = create("stellar");

  it("accepts the SEP-23 account, muxed-account and contract vectors", () => {
    for (const address of [
      "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
      "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAACJUQ",
      "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUWDA",
    ]) {
      expect(stellar.assertAddress(address)).toBe(address);
    }
  });

  it("rejects the SEP-23 invalid length, algorithm, trailing-bit and checksum vectors", () => {
    for (const address of [
      "GAAAAAAAACGC6",
      "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZA",
      "G47QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVP2I",
      "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAACJUR",
      "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAACJUO",
    ]) {
      expect(() => stellar.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  it("rejects non-address Strkey types", () => {
    for (const address of [
      "BAAD6DBUX6J22DMZOHIEZTEQ64CVCHEDRKWZONFEUL5Q26QD7R76RGR4TU",
      "LA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUPJN",
    ]) {
      expect(() => stellar.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });
});

describe("XRP Ledger address validation", () => {
  const xrpl = create("xrpl");

  /**
   * Three accounts funded on mainnet, one of them a character short of the usual 34,
   * then ACCOUNT_ZERO and ACCOUNT_ONE, whose leading zero bytes write the shortest
   * addresses the format has.
   */
  it("accepts classic addresses, down to the special accounts", () => {
    for (const address of [
      "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh",
      "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
      "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      "rrrrrrrrrrrrrrrrrrrrBZbvji",
    ]) {
      expect(xrpl.assertAddress(address), address).toBe(address);
    }
  });

  /** The genesis account again, encoded with no tag, tag 42 and tag 2^32-1. */
  it("accepts X-addresses with and without a destination tag", () => {
    for (const address of [
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3m4sBhsrA4XtnBECTAc",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mTCLZc5ZAoh11sd5nY",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mX6ZcxNZjq2wMvKo8a",
    ]) {
      expect(xrpl.assertAddress(address), address).toBe(address);
    }
  });

  /**
   * Each one checksums over the genesis account and is a single field off a real
   * X-address: testnet prefix, flag 2, flag 0 over a tagged payload, a 32-bit tag with
   * a reserved byte set, prefix 0x06 0x44, prefix 0x05 0x45, then 34 payload bytes.
   * ripple-address-codec takes three of them, and reads the fourth as a plain tag 42.
   */
  it("rejects X-address payloads the format does not define", () => {
    for (const address of [
      "TVK3SYvMLZR6rEtLDZh3saYHaqFSeMf6Hj2w1dpb7SnJgqn",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mX5CatGoVBtxjSUpBU",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3m4wqRZUR1Lkjcu3iKc",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mTCLZc5ZAohtiHB4Ms",
      "dHs1rzwkm7bFd92d7dLjs4DpfY26KPtNfcwddrqLvgxnPsz",
      "XW6eoXeSRsSueWqkhDEWhYCu3jocZWakT3NFyZ8DtTori2z",
      "fuekHBFCQpfsPFqUKJh6F9ZVrYZKP95jc2kv3srhA3LaXb",
    ]) {
      expect(() => xrpl.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /**
   * Bitcoin, TRON and Solana, then an address holding a `0` the ledger has no digit
   * for, the genesis address two characters short at 24 bytes, and a tagged
   * X-address one digit long at 36.
   */
  it("rejects the other base58 chains and near misses", () => {
    for (const address of [
      "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "rHb9CJAWyB4rj91VRWn96DkukG4bwdty0h",
      "rHb9CJAWyB4rj91VRWn96DkukG4bwdty",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mTCLZc5ZAoh11sd5nYr",
    ]) {
      expect(() => xrpl.assertAddress(address), address).toThrow(InvalidAddressError);
    }
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

describe("Litecoin address validation", () => {
  const litecoin = create("litecoin");

  it("accepts both legal bech32 cases under the ltc prefix", () => {
    expect(litecoin.assertAddress("ltc1qnnvfl0aguajj3ugfwx02zk5kzqznrd0dv2lwya")).toBeTruthy();
    expect(litecoin.assertAddress("LTC1QNNVFL0AGUAJJ3UGFWX02ZK5KZQZNRD0DV2LWYA")).toBeTruthy();
  });

  it("rejects mixed case, which BIP-173 makes invalid", () => {
    expect(() => litecoin.assertAddress("ltc1QNNVFL0AGUAJJ3UGFWX02ZK5KZQZNRD0DV2LWYA")).toThrow(
      InvalidAddressError,
    );
  });

  it("accepts legacy base58 addresses under versions 0x30 and 0x32", () => {
    expect(litecoin.assertAddress("LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe")).toBeTruthy();
    expect(litecoin.assertAddress("MUB2Z9EcLdxHkiyWJXqAfPAkVpnH9xVFB1")).toBeTruthy();
  });

  /**
   * Bitcoin's 0x00 and 0x05 versions stay rejected, the deprecated shared
   * 0x05 script-hash format included, so `identify` never reports a `3...`
   * address as both chains. Litecoin does not accept them either way.
   */
  it("rejects Bitcoin base58 versions", () => {
    expect(() => litecoin.assertAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toThrow(
      InvalidAddressError,
    );
    expect(() => litecoin.assertAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toThrow(
      InvalidAddressError,
    );
  });

  it("keeps Litecoin base58 versions out of Bitcoin", () => {
    expect(() => create("bitcoin").assertAddress("LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe")).toThrow(
      InvalidAddressError,
    );
    expect(() => create("bitcoin").assertAddress("MUB2Z9EcLdxHkiyWJXqAfPAkVpnH9xVFB1")).toThrow(
      InvalidAddressError,
    );
  });
});

describe("Pepecoin address validation", () => {
  const pepecoin = create("pepecoin");

  /** Two vectors from the chain's own base58_keys_valid.json, then a live address. */
  it("accepts base58 addresses under version 0x38", () => {
    expect(pepecoin.assertAddress("PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb")).toBeTruthy();
    expect(pepecoin.assertAddress("Ppz7uceiVaUdYY7nC5qCAKJ9ktxJCkeLjT")).toBeTruthy();
    expect(pepecoin.assertAddress("PqqJgKpAcMqoBaiy3aNHuR4SSLPdTz194q")).toBeTruthy();
  });

  /** Version 0x16 writes a leading `9` or an `A`, so both ends of the range are here. */
  it("accepts script-hash addresses under version 0x16", () => {
    expect(pepecoin.assertAddress("9xgJusiTHMsinDmj4KyxVj8LNskVaGkSGn")).toBeTruthy();
    expect(pepecoin.assertAddress("ABqjF3xMMj67obtrKiCSoM6MxFCNhtVTvu")).toBeTruthy();
  });

  /** Bitcoin, Litecoin and TRON versions, plus Dogecoin's 0x1e, which the fork dropped. */
  it("rejects base58 addresses under another chain's version", () => {
    for (const address of [
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      "LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe",
      "MUB2Z9EcLdxHkiyWJXqAfPAkVpnH9xVFB1",
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "DD4KSSuBJqcjuTcvUg1CgUKeurPUFeEZkE",
    ]) {
      expect(() => pepecoin.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /** The first vector above cut to 24 bytes, still 0x38, then a 32-byte Solana key. */
  it("rejects base58 payloads that are not 25 bytes", () => {
    expect(() => pepecoin.assertAddress("68uNm2Fup6DmwzwE1BWdohK3N6TpSqtN4")).toThrow(
      InvalidAddressError,
    );
    expect(() => pepecoin.assertAddress("11111111111111111111111111111111")).toThrow(
      InvalidAddressError,
    );
  });

  it("keeps Pepecoin base58 versions out of Bitcoin and Litecoin", () => {
    for (const key of ["bitcoin", "litecoin"] as const) {
      expect(() => create(key).assertAddress("PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb")).toThrow(
        InvalidAddressError,
      );
      expect(() => create(key).assertAddress("9xgJusiTHMsinDmj4KyxVj8LNskVaGkSGn")).toThrow(
        InvalidAddressError,
      );
    }
  });
});

describe("eCash address validation", () => {
  const ecash = create("ecash");

  /** Three vectors from the chain's own cashaddrenc tests, prefixed and bare. */
  it("accepts pay-to-pubkey-hash CashAddr under a leading `q`", () => {
    expect(ecash.assertAddress("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2")).toBeTruthy();
    expect(ecash.assertAddress("ecash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ykdcjcn6n")).toBeTruthy();
    expect(ecash.assertAddress("ecash:qqq3728yw0y47sqn6l2na30mcw6zm78dzq653y7pv5")).toBeTruthy();
    expect(ecash.assertAddress("qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2")).toBeTruthy();
  });

  /** An upstream vector, then the live miner-fund address every coinbase pays. */
  it("accepts pay-to-script-hash CashAddr under a leading `p`", () => {
    expect(ecash.assertAddress("ecash:ppm2qsznhks23z7629mms6s4cwef74vcwv2zrv3l8h")).toBeTruthy();
    expect(ecash.assertAddress("ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07")).toBeTruthy();
  });

  /** Uppercase is what QR encoders emit; mixed case must be rejected. */
  it("accepts all-uppercase and rejects mixed case", () => {
    expect(ecash.assertAddress("ECASH:QPM2QSZNHKS23Z7629MMS6S4CWEF74VCWVA87RKUU2")).toBeTruthy();
    expect(ecash.assertAddress("QPM2QSZNHKS23Z7629MMS6S4CWEF74VCWVA87RKUU2")).toBeTruthy();
    expect(() => ecash.assertAddress("ecash:QPM2QSZNHKS23Z7629MMS6S4CWEF74VCWVA87RKUU2")).toThrow(
      InvalidAddressError,
    );
    expect(() => ecash.assertAddress("ecash:Qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2")).toThrow(
      InvalidAddressError,
    );
  });

  /** The same hash the first vector carries, under Bitcoin Cash's prefix. */
  it("rejects a foreign CashAddr prefix", () => {
    expect(() =>
      ecash.assertAddress("bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a"),
    ).toThrow(InvalidAddressError);
  });

  /**
   * The spec's own 24-byte vector, the first vector cut by one character, a
   * version head the used types never write, and a charset violation.
   */
  it("rejects payloads that are not one version byte and a 20-byte hash", () => {
    for (const address of [
      "ecash:q9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h24pj4gqrx",
      "qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu",
      "ecash:zpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
      "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkub2",
    ]) {
      expect(() => ecash.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /** The first vector's own legacy twin leads: eCash kept Bitcoin's versions. */
  it("rejects legacy base58 and other chains' formats", () => {
    for (const address of [
      "1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu",
      "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      "ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8",
    ]) {
      expect(() => ecash.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  it("keeps a bare CashAddr payload out of Bitcoin and Litecoin", () => {
    for (const key of ["bitcoin", "litecoin"] as const) {
      expect(() => create(key).assertAddress("qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2")).toThrow(
        InvalidAddressError,
      );
    }
  });
});

describe("Cardano address validation", () => {
  const cardano = create("cardano");
  /** The 114-character Byron bootstrap example from CIP-19. */
  const byron =
    "37btjrVyb4KDXBNC4haBVPCrro8AQPHwvCMp3RFhhSVWwfFmZ6wwzSK6JK1hY6wHNmtrpTf1kdbva8TCneM2YsiXT7mrzT21EacHnPpz5YyUdj64na";

  /** Payment types 0 through 7, then both stake credential kinds. */
  it("accepts the CIP-19 mainnet vectors", () => {
    for (const address of [
      "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
      "addr1z8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs9yc0hh",
      "addr1yx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerkr0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs2z78ve",
      "addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g",
      "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrzqf96k",
      "addr128phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtupnz75xxcrtw79hu",
      "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8",
      "addr1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx",
      "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw",
      "stake178phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcccycj5",
    ]) {
      expect(cardano.assertAddress(address)).toBe(address);
    }
  });

  it("accepts uppercase, which QR encoders emit", () => {
    expect(
      cardano.assertAddress("ADDR1VX2FXV2UMYHTTKXYXP8X0DLPDT3K6CWNG5PXJ3JHSYDZERS66HRL8"),
    ).toBeTruthy();
    expect(
      cardano.assertAddress("STAKE1UYEHKCK0LAJQ8GR28T9UXNUVGCQRC6070X3K9R8048Z8Y5GH6FFGW"),
    ).toBeTruthy();
  });

  it("rejects mixed case, which BIP-173 makes invalid", () => {
    expect(() =>
      cardano.assertAddress("addr1VX2FXV2UMYHTTKXYXP8X0DLPDT3K6CWNG5PXJ3JHSYDZERS66HRL8"),
    ).toThrow(InvalidAddressError);
  });

  it("rejects the testnet prefixes", () => {
    expect(() =>
      cardano.assertAddress("addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz"),
    ).toThrow(InvalidAddressError);
    expect(() =>
      cardano.assertAddress("stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn"),
    ).toThrow(InvalidAddressError);
  });

  /**
   * The CIP-19 example, then a synthetic minimal envelope, whose base58
   * lands on the familiar Ae2 prefix purely by construction.
   */
  it("accepts a Byron bootstrap address", () => {
    expect(cardano.assertAddress(byron)).toBe(byron);
    expect(
      cardano.assertAddress("Ae2tdPwUPEYwWS5R2H6DTA2XJnBULNKZrrxpHiiEnkDzcdDg2rmtjdAXs6T"),
    ).toBeTruthy();
  });

  /**
   * The first three fail the prefix; the crafted trio then dies one gate at
   * a time: payload below the 33-byte minimum, wrong array opener, and a
   * CRC head claiming more bytes than remain.
   */
  it("rejects base58 that is not a Byron CBOR envelope", () => {
    expect(() => cardano.assertAddress("11111111111111111111111111111111")).toThrow(
      InvalidAddressError,
    );
    expect(() => cardano.assertAddress("LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe")).toThrow(
      InvalidAddressError,
    );
    expect(() => cardano.assertAddress(byron.slice(0, -1))).toThrow(InvalidAddressError);
    expect(() => cardano.assertAddress("5xb5UCMiej")).toThrow(InvalidAddressError);
    expect(() =>
      cardano.assertAddress("Ae2tdPwUXpBWfnybBCEByAo5PB5GWTopJ4cehzSQENMZ4yKAWcVB4phhGEP"),
    ).toThrow(InvalidAddressError);
    expect(() =>
      cardano.assertAddress("VhLXUZmS1gXF9DUMPMU6SdiQxAmT6brEid4taqdutAgEG3ewdw55Zh29"),
    ).toThrow(InvalidAddressError);
  });

  it("keeps Cardano addresses out of the other base58 chains", () => {
    for (const key of ["bitcoin", "litecoin", "solana"] as const) {
      expect(() => create(key).assertAddress(byron)).toThrow(InvalidAddressError);
    }
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

describe("Octra address validation", () => {
  const octra = create("octra");
  /** The mainnet validator, read off https://octra.network/status at epoch 1727197. */
  const live = "oct7xCozDD9JEsbeVpo5C7HXp2BJbKqfmNUHmDDCCTtWcGb";

  it("accepts a live mainnet address", () => {
    expect(octra.assertAddress(live)).toBe(live);
  });

  /**
   * The OCS01 contract from octra-labs/ocs01-test, then one whose body runs past
   * 2^256 because its tail comes from a second hash. Decoding drops one in twenty four.
   */
  it("accepts contract addresses, which carry no 32-byte payload", () => {
    expect(octra.assertAddress("octBUHw585BrAMPMLQvGuWx4vqEsybYH9N7a3WNj1WBwrDn")).toBeTruthy();
    expect(octra.assertAddress("octhKkg4gHoCePAX12mSQtthX6xsRKo4QwyPRqVMrbR3Q64")).toBeTruthy();
  });

  /** The node takes 47 characters and nothing else, so neither reaches an account. */
  it("rejects an address one character short or one long", () => {
    expect(() => octra.assertAddress(live.slice(0, -1))).toThrow(InvalidAddressError);
    expect(() => octra.assertAddress(`${live}A`)).toThrow(InvalidAddressError);
  });

  /** No prefix, a 44-character body off the alphabet, and two foreign chains. */
  it("rejects a missing prefix, a foreign charset and a foreign chain", () => {
    for (const address of [
      live.slice(3),
      `oct${"0".repeat(44)}`,
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    ]) {
      expect(() => octra.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  it("keeps a live Octra address out of the other base58 chains", () => {
    for (const key of ["bitcoin", "litecoin", "solana", "tron", "cardano", "xrpl"] as const) {
      expect(() => create(key).assertAddress(live), key).toThrow(InvalidAddressError);
    }
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

  /**
   * The alphabet decides what the bytes are, not whether there are any: the genesis
   * address opens on 0x00 under the ledger's digits and on 0x7a under Bitcoin's, and
   * ACCOUNT_ZERO's 21 leading `r` are zero bytes only where `r` is the zero digit.
   */
  it("reads a string against the alphabet it was given", () => {
    const genesis = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

    expect(decodeBase58(genesis, 48, XRP_ALPHABET)?.[0]).toBe(0x00);
    expect(decodeBase58(genesis, 48)?.[0]).toBe(0x7a);
    expect(decodeBase58("rrrrrrrrrrrrrrrrrrrrrhoLvTp", 48, XRP_ALPHABET)?.slice(0, 21)).toEqual(
      new Uint8Array(21),
    );
    expect(decodeBase58("rrrrrrrrrrrrrrrrrrrrrhoLvTp", 48)?.[0]).not.toBe(0x00);
  });
});

describe("address identification", () => {
  it("checks the whole registry and narrows an EVM address to its family", () => {
    const { matches, unchecked } = identify("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");

    expect(matches.map((chain) => chain.key)).toEqual([
      "ethereum",
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
      "berachain",
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

  it("attributes a Pepecoin address to Pepecoin alone", () => {
    const { matches } = identify("PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb");

    expect(matches.map((chain) => chain.key)).toEqual(["pepecoin"]);
  });

  it("attributes an eCash address to eCash alone, prefixed or bare", () => {
    for (const address of [
      "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
      "qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
    ]) {
      const { matches } = identify(address);

      expect(
        matches.map((chain) => chain.key),
        address,
      ).toEqual(["ecash"]);
    }
  });

  it("attributes classic and X-addresses to the XRP Ledger alone", () => {
    for (const address of [
      "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "XVPcpSm47b1CZkf5AkKM9a84dQHe3mTCLZc5ZAoh11sd5nY",
    ]) {
      const { matches } = identify(address);

      expect(
        matches.map((chain) => chain.key),
        address,
      ).toEqual(["xrpl"]);
    }
  });

  it("attributes a Shelley address to Cardano alone", () => {
    const { matches } = identify("addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8");

    expect(matches.map((chain) => chain.key)).toEqual(["cardano"]);
  });

  it("attributes a Stellar account to Stellar alone", () => {
    const { matches } = identify("GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ");

    expect(matches.map((chain) => chain.key)).toEqual(["stellar"]);
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
