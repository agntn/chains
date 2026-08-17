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
    expect(() => getChain("foobar")).toThrow("Unsupported chain: foobar");
  });

  it("rejects inherited object properties as aliases", () => {
    for (const inherited of ["constructor", "__proto__", "tostring", "hasownproperty"]) {
      expect(() => getChain(inherited)).toThrow(`Unsupported chain: ${inherited}`);
    }
  });
});

describe("address validation", () => {
  it("is inherited by concrete EVM chains", () => {
    const ethereum = create("eth");
    const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    expect(ethereum.assertAddress(address)).toBe(address);
    expect(() => ethereum.assertAddress("0x0000")).toThrow("Invalid EVM address");
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
      expect(invalid.chain).toBe("Bitcoin");
      expect(invalid.address).toBe("nope");
      expect(invalid.name).toBe("InvalidAddressError");
    }
  });
});
