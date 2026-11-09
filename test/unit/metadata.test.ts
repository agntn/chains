import { describe, expect, it } from "vite-plus/test";
import { builtins } from "../../src/chains/index.ts";
import { UnknownChainError, metadata } from "../../src/index.ts";
import type { ChainKey } from "../../src/index.ts";

describe("metadata without the class", () => {
  it.each(builtins.map((chainClass) => [chainClass.key, chainClass] as const))(
    "holds %s to its class",
    (key, ChainClass) => {
      const { name, symbol, decimals, explorer } = new ChainClass();
      expect(metadata(key)).toEqual({ name, symbol, decimals, explorer });
    },
  );

  it("pins a few rows by hand, so table and class can't drift together", () => {
    expect(metadata("bitcoin")).toEqual({
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      explorer: "https://blockstream.info",
    });
    expect(metadata("ecash").decimals).toBe(2);
    expect(metadata("near").decimals).toBe(24);
    expect(metadata("decred").symbol).toBe("DCR");
  });

  it.each(["btc", "Bitcoin", "", "constructor", "__proto__", "toString"])(
    "throws UnknownChainError for %j, which is no canonical key",
    (key) => {
      expect(() => metadata(key as ChainKey)).toThrow(UnknownChainError);
      expect(() => metadata(key as ChainKey)).toThrow(`Unknown chain: ${key}`);
    },
  );

  it.each([["bitcoin"], Symbol("bitcoin"), undefined])(
    "refuses a key that is no string, as a JavaScript caller can pass one",
    (key) => {
      expect(() => {
        Reflect.apply(metadata, undefined, [key]);
      }).toThrow(UnknownChainError);
    },
  );

  it("hands out a copy, so an edit never reaches the next reader", () => {
    const first = metadata("ethereum");
    Reflect.set(first, "symbol", "WETH");
    expect(metadata("ethereum").symbol).toBe("ETH");
  });
});
