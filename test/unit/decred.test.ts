import { describe, expect, it } from "vitest";
import { blake256 } from "../../src/core/blake256.ts";
import { Chain, InvalidAddressError, getChain, identify } from "../../src/index.ts";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
} from "../../src/tool-operations.ts";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

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
 * Encodes a fixture with a zero payload under the version, closed with the checksum dcrd writes.
 * @param {number} version - Network/type prefix occupying two bytes.
 * @param {number} size - Total decoded size.
 * @param {number} signature - Public key signature selector.
 * @returns {string} Base58 envelope.
 */
function envelope(version: number, size: number, signature = 0): string {
  const bytes = Buffer.alloc(size);
  bytes.writeUInt16BE(version);
  bytes[2] = signature;
  bytes.set(blake256(blake256(bytes.subarray(0, -4))).subarray(0, 4), size - 4);
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let encoded = "";
  while (value > 0n) {
    encoded = ALPHABET[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  return encoded;
}

/**
 * Replaces one character with the next digit of the alphabet, so the text stays base58.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the character to replace.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number): string {
  const digit = ALPHABET.indexOf(address.charAt(index));
  return address.slice(0, index) + ALPHABET.charAt((digit + 1) % 58) + address.slice(index + 1);
}

/** Around each padding boundary, hashed with @noble/hashes 2.4.0 over the bytes 0, 1, 2 and up. */
const boundaries = [
  [0, "716f6e863f744b9ac22c97ec7b76ea5f5908bc5b2f67c61510bfc4751384ea7a"],
  [54, "6df0b232d9b4e86db83389705549c7f562b0700f7832d8a45062c7a87f550b59"],
  [55, "d7ec78bc615d99e41d371cf6401449969144b5f789bde014a9aeafd8987257f2"],
  [56, "26ca422697c9fabc642129b1a5669be07fb0a3c31f14f1c7859e048ad5958e44"],
  [63, "cfce445066d35322557b432540bd2f0af4caf9f426568236d9944426a5df792a"],
  [64, "4432b2c1e983b0c326583516920f3949c2acf5d85a99353601228cab40c867bc"],
  [65, "106cdd00dc14e257b1130d026b9fcc2c5ecbaae08fec13af0002ad6054c7bbd5"],
  [119, "7271691baf3f4ea7795006522897316eccd614816fa4fe10c546c11e882ac016"],
  [120, "6b4831d9c2ab2403b17ce7063f804ce559db6951563678294acd9a0a418bab35"],
  [128, "70a7b33d6d251c06757362fa717d0b19ceb0ebdccf48300a98156b5bb6b8c9a5"],
  [129, "e382768b94ee0f9e7539b78c6252dbd3dcf54bc53de9670a02d85b6fc92d7e76"],
] as const;

describe("BLAKE-256", () => {
  it("matches the two vectors in the BLAKE specification", () => {
    expect(hex(blake256(new Uint8Array(1)))).toBe(
      "0ce8d4ef4dd7cd8d62dfded9d4edb0a774ae6a41929a74da23109e8f11139c87",
    );
    expect(hex(blake256(new Uint8Array(72)))).toBe(
      "d419bad32d504fb7d44d460c42c5593fe544fa4c135dec31e21bd9abdcc22d41",
    );
  });

  it.each(boundaries)("hashes %i counted bytes to the digest noble computes", (length, digest) => {
    const message = Uint8Array.from({ length }, (_, index) => index & 0xff);
    expect(hex(blake256(message))).toBe(digest);
  });
});

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

  it.each(addresses)("rejects every single-character typo of %s", (address) => {
    for (let index = 0; index < address.length; index++) {
      const typo = mistype(address, index);
      expect(() => getChain("dcr").assertAddress(typo), typo).toThrow(InvalidAddressError);
    }
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

  it("rejects the checksum typo dcrdata answers with a 422", () => {
    const typo = "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJv";
    expect(() => getChain("dcr").assertAddress(typo)).toThrow(InvalidAddressError);
    expect(identify(typo).matches.map((chain) => chain.key)).not.toContain("decred");
    expect(validateChainAddress("dcr", typo).details).toMatchObject({
      valid: false,
      chain: "decred",
    });
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
