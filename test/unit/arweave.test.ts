import { describe, expect, it } from "vitest";
import { Chain, InvalidAddressError, getChain, identify } from "../../src/index.ts";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
} from "../../src/tool-operations.ts";

/** Published address examples from arweave-js and the Arweave CAIP-10 namespace. */
const addresses = [
  "1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY",
  "kY9RAgTJEImkBpiKgVeXrsGV02T-D4dI3ZvSpnn7HSk",
] as const;

describe("Arweave", () => {
  it("resolves its name and ticker to mainnet metadata", () => {
    for (const input of ["arweave", "Arweave", " AR "]) {
      const chain = getChain(input);
      expect(chain).toBeInstanceOf(Chain);
      expect(chain).toMatchObject({
        key: "arweave",
        name: "Arweave",
        symbol: "AR",
        type: "arweave",
        bip44: 472,
        caip2: "arweave:7wIU",
        explorer: "https://viewblock.io/arweave",
        rpcDefault: "https://arweave.net",
        validatesAddress: true,
      });
      expect(chain.chainId).toBeUndefined();
    }
  });

  it.each(addresses)("preserves the published address %s", (address) => {
    const decoded = Buffer.from(address, "base64url");
    expect(decoded).toHaveLength(32);
    expect(decoded.toString("base64url")).toBe(address);
    expect(getChain("ar").assertAddress(address)).toBe(address);
    expect(identify(address).matches.map((chain) => chain.key)).toContain("arweave");
  });

  it("accepts every final byte in canonical base64url", () => {
    const chain = getChain("ar");
    for (let byte = 0; byte < 256; byte++) {
      const payload = Buffer.alloc(32, byte);
      const address = payload.toString("base64url");
      expect(chain.assertAddress(address)).toBe(address);
    }
  });

  it("rejects every nonzero unused-bit encoding", () => {
    const chain = getChain("ar");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (let digit = 0; digit < alphabet.length; digit++) {
      if (digit % 4 === 0) continue;
      const address = `${"A".repeat(42)}${alphabet[digit]}`;
      expect(() => chain.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  it("rejects wrong widths, alphabets, padding and surrounding text", () => {
    const address = addresses[0];
    const invalid = [
      "",
      address.slice(1),
      `${address}A`,
      `${address}=`,
      address.replace("_", "/"),
      `${"+".repeat(42)}A`,
      `${address}\n`,
      ` ${address}`,
      `${address}:AAAAAA`,
      `arweave:${address}`,
      `${"é".repeat(42)}A`,
    ];
    for (const candidate of invalid) {
      expect(() => getChain("ar").assertAddress(candidate), candidate).toThrow(InvalidAddressError);
    }
  });

  it("exposes the same chain through the shared tool operations", () => {
    const address = addresses[0];
    expect(lookupChain("AR").details).toMatchObject({ key: "arweave", bip44: 472 });
    expect(listChains("arweave").details.chains).toEqual([
      { key: "arweave", name: "Arweave", symbol: "AR", type: "arweave" },
    ]);
    expect(validateChainAddress("ar", address).details).toMatchObject({
      valid: true,
      chain: "arweave",
    });
    expect(identifyAddress(address).details.matches).toContain("arweave");
  });
});
