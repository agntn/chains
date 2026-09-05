import { describe, expect, it } from "vitest";
import { Chain, InvalidAddressError, getChain, identify } from "../../src/index.ts";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
} from "../../src/tool-operations.ts";

/** Vectors from decred/dcrd txscript/stdaddr/address_test.go at b9634e0. */
const addresses = [
  "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJu",
  "DeeUhrRoTp4DftsqddVW96yMGMW4sgQFYUE",
  "DSXcZv4oSRiEoWL2a9aD8sgfptRo1YEXNKj",
  "DcuQKx8BES9wU7C6Q5VmLBjw436r27hayjS",
  "DkM3ZigNyiwHrsXRjkDQ8t8tW6uKGW9g61qEkG3bMqQPQWYEf5X3J",
  "DkRM4ZcdejbYRu4AbcEdfDLzU9w1ZTqPXatXvL1g8Q77ibDjz7gwF",
  "DkM5zR8tqWNAHngZQDTyAeqzabZxMKrkSbCFULDhmvySn3uHmm221",
  "DkM7TD2qsne9DKo4uA2ZNt3XhejYVwT5mmQWtUXtjdPhRHXTSKxN4",
  "DkRQx3y6YoJPnMKom23nuDFdfhmEnu8oDLTp4YVyWC6RjND19UxHk",
] as const;

/**
 * Encode format fixtures with zero payload and unchecked checksum bytes.
 * @param {number} version - Network/type prefix occupying two bytes.
 * @param {number} size - Total decoded size.
 * @param {number} signature - Public key signature selector.
 * @returns {string} Base58 envelope.
 */
function envelope(version: number, size: number, signature = 0): string {
  const bytes = Buffer.alloc(size);
  bytes.writeUInt16BE(version);
  bytes[2] = signature;
  let value = BigInt(`0x${bytes.toString("hex")}`);
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let encoded = "";
  while (value > 0n) {
    encoded = alphabet[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  return encoded;
}

describe("Decred", () => {
  it("resolves the name and ticker to mainnet metadata", () => {
    for (const input of ["decred", "Decred", " DCR "]) {
      const chain = getChain(input);
      expect(chain).toBeInstanceOf(Chain);
      expect(chain).toMatchObject({
        key: "decred",
        name: "Decred",
        symbol: "DCR",
        type: "utxo",
        bip44: 42,
        explorer: "https://dcrdata.decred.org",
        validatesAddress: true,
      });
      expect(chain.chainId).toBeUndefined();
      expect(chain.caip2).toBeUndefined();
      expect(chain.rpcDefault).toBeUndefined();
    }
  });

  it.each(addresses)("preserves the upstream address %s", (address) => {
    expect(getChain("dcr").assertAddress(address)).toBe(address);
    expect(identify(address).matches.map((chain) => chain.key)).toEqual(["decred"]);
  });

  it("requires the decoded length for each version", () => {
    for (const [version, size] of [
      [0x073f, 26],
      [0x071f, 26],
      [0x0701, 26],
      [0x071a, 26],
      [0x1386, 39],
    ] as const) {
      const valid = envelope(version, size);
      expect(getChain("dcr").assertAddress(valid)).toBe(valid);
      for (const wrongSize of [size - 1, size + 1]) {
        expect(() => getChain("dcr").assertAddress(envelope(version, wrongSize))).toThrow(
          InvalidAddressError,
        );
      }
    }
  });

  it("accepts only signature selectors emitted by the public key encoders", () => {
    for (const signature of [0, 0x80, 1, 2, 0x82]) {
      const address = envelope(0x1386, 39, signature);
      expect(getChain("dcr").assertAddress(address)).toBe(address);
    }
    for (const signature of [3, 0x7f, 0x81, 0x83, 0xff]) {
      expect(() => getChain("dcr").assertAddress(envelope(0x1386, 39, signature))).toThrow(
        InvalidAddressError,
      );
    }
  });

  it("rejects test networks and unknown versions, including a wrong first byte", () => {
    for (const [version, size] of [
      [0x0f21, 26],
      [0x0f01, 26],
      [0x0ee3, 26],
      [0x0efc, 26],
      [0x28f7, 39],
      [0x0e91, 26],
      [0x276f, 39],
      [0x0e00, 26],
      [0x25e5, 39],
      [0x073e, 26],
      [0x083f, 26],
      [0x1486, 39],
      [0x1385, 39],
    ] as const) {
      expect(() => getChain("dcr").assertAddress(envelope(version, size))).toThrow(
        InvalidAddressError,
      );
    }
  });

  it("rejects malformed text and keeps error attribution", () => {
    const address = addresses[0];
    for (const invalid of [
      "",
      `${address}\n`,
      ` ${address}`,
      `decred:${address}`,
      `${address.slice(0, -1)}0`,
      `${address.slice(0, -1)}é`,
      `1${address}`,
      "D".repeat(100_000),
    ]) {
      expect(() => getChain("dcr").assertAddress(invalid)).toThrow(InvalidAddressError);
    }
    expect(() => getChain("dcr").assertAddress("bad")).toThrow(
      expect.objectContaining({ chain: "decred", address: "bad" }),
    );
  });

  it("leaves checksum verification outside the format check", () => {
    const address = "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJv";
    expect(getChain("dcr").assertAddress(address)).toBe(address);
  });

  it("reaches the shared tool operations", () => {
    const address = "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJu";
    expect(lookupChain("DCR").details).toMatchObject({ key: "decred", bip44: 42 });
    expect(listChains("utxo").details.chains).toContainEqual({
      key: "decred",
      name: "Decred",
      symbol: "DCR",
      type: "utxo",
    });
    expect(validateChainAddress("dcr", address).details).toMatchObject({
      valid: true,
      chain: "decred",
    });
    expect(validateChainAddress("dcr", "bad").details).toMatchObject({
      valid: false,
      chain: "decred",
    });
    expect(identifyAddress(address).details.matches).toEqual(["decred"]);
  });
});
