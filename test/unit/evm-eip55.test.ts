import { describe, expect, it } from "vitest";
import { keccak256 } from "../../src/core/keccak256.ts";
import { chains, create, identify, InvalidAddressError } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** The test cases in EIP-55 itself: two written all caps, two all lowercase, four mixed. */
const addresses = [
  "0x52908400098527886E0F7030069857D2E4169EE7",
  "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
  "0xde709f2102306220921060314715629080e2fb77",
  "0x27b1fdb04752bbc536007a920d24acb045561c26",
  "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
  "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
  "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
] as const;

/** The UNI token contract, as Etherscan prints it. */
const uni = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const evm = () => chains().filter((key) => create(key).type === "evm");

/**
 * Replaces one digit with the next hex digit in the same case, so the text stays an address.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the digit to replace, counted after `0x`.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number): string {
  const digit = address.charAt(2 + index);
  const alphabet = digit === digit.toUpperCase() ? "0123456789ABCDEF" : "0123456789abcdef";
  const next = alphabet.charAt((alphabet.indexOf(digit) + 1) % 16);
  return `${address.slice(0, 2 + index)}${next}${address.slice(3 + index)}`;
}

/**
 * Flips the case of one letter, which is exactly what the checksum reads.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the letter, counted after `0x`.
 * @returns {string} The address with that letter in the other case.
 */
function recase(address: string, index: number): string {
  const digit = address.charAt(2 + index);
  const flipped = digit === digit.toUpperCase() ? digit.toLowerCase() : digit.toUpperCase();
  return `${address.slice(0, 2 + index)}${flipped}${address.slice(3 + index)}`;
}

/** Around each rate boundary, hashed with @noble/hashes 2.4.0 over the bytes 0, 1, 2 and up. */
const boundaries = [
  [1, "bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"],
  [135, "cbdfd9dee5faad3818d6b06f95a219fd290b0e1706f6a82e5a595b9ce9faca62"],
  [136, "7ce759f1ab7f9ce437719970c26b0a66ff11fe3e38e17df89cf5d29c7d7f807e"],
  [137, "ac73d4fae68b8453f764007c1a20ce95994187861f0c3227a3a8e99a73a3b1db"],
  [200, "bfb0aa97863e797943cf7c33bb7e880bb4543f3d2703c0923c6901c2af57b890"],
  [271, "7c974895b2a88303ff2dc6b58f438ceb0b298cac91099ac0539cc0f477506191"],
  [272, "fdf2ec49e749960d3c8521a0219af8d03e30e2b3bf19bd16150ee0eaf133d66e"],
  [273, "4f707289a9c3ccd0c4a51f2f17339f5dd171d371c04ff7783b735b5b22682eaf"],
] as const;

describe("Keccak-256", () => {
  it("matches the empty-message digest Ethereum uses as the hash of nothing", () => {
    expect(hex(keccak256(new Uint8Array(0)))).toBe(
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
  });

  it("matches the Keccak known-answer test for abc", () => {
    expect(hex(keccak256(new TextEncoder().encode("abc")))).toBe(
      "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
    );
  });

  it.each(boundaries)("hashes %i counted bytes to the digest noble computes", (length, digest) => {
    const message = Uint8Array.from({ length }, (_, index) => index & 0xff);
    expect(hex(keccak256(message))).toBe(digest);
  });
});

describe("EVM address checksum", () => {
  it.each(addresses)("accepts the EIP-55 test case %s on every EVM chain", (address) => {
    for (const key of evm()) expect(create(key).assertAddress(address)).toBe(address);
  });

  it("accepts an address written in one case throughout, which carries no checksum", () => {
    const ethereum = create("ethereum");
    for (const address of [uni, ...addresses]) {
      const lower = `0x${address.slice(2).toLowerCase()}`;
      const upper = `0x${address.slice(2).toUpperCase()}`;
      expect(ethereum.assertAddress(lower)).toBe(lower);
      expect(ethereum.assertAddress(upper)).toBe(upper);
    }
  });

  it.each([uni, ...addresses.slice(4)])(
    "rejects every letter of %s in the other case",
    (address) => {
      for (let index = 0; index < 40; index++) {
        const digit = address.charAt(2 + index);
        if (digit.toLowerCase() === digit.toUpperCase()) continue;
        const typo = recase(address, index);
        expect(() => create("ethereum").assertAddress(typo), typo).toThrow(InvalidAddressError);
      }
    },
  );

  it.each([uni, ...addresses.slice(4)])("rejects every single-digit typo of %s", (address) => {
    for (let index = 0; index < 40; index++) {
      const typo = mistype(address, index);
      expect(() => create("ethereum").assertAddress(typo), typo).toThrow(InvalidAddressError);
    }
  });

  it("keeps the shape rules in front of the hash", () => {
    const ethereum = create("ethereum");
    for (const invalid of [
      "",
      uni.slice(2),
      `0X${uni.slice(2)}`,
      `${uni}0`,
      uni.slice(0, -1),
      ` ${uni}`,
      `${uni}\n`,
      `0x${"g".repeat(40)}`,
    ]) {
      expect(() => ethereum.assertAddress(invalid)).toThrow(InvalidAddressError);
    }
    expect(() => ethereum.assertAddress(recase(uni, 1))).toThrow(
      expect.objectContaining({ chain: "ethereum", address: recase(uni, 1) }),
    );
  });

  it("drops a mis-cased address out of identify instead of naming the whole family", () => {
    const typo = mistype(uni, 39);
    expect(identify(uni).matches.map((chain) => chain.key)).toEqual(evm());
    expect(identify(typo)).toEqual({ matches: [], unchecked: [] });
    expect(identifyAddress(typo).details.matches).toEqual([]);
  });

  it("reaches the shared tool operations", () => {
    expect(validateChainAddress("eth", uni).details).toMatchObject({
      valid: true,
      chain: "ethereum",
    });
    expect(validateChainAddress("arbitrum", mistype(uni, 0)).details).toMatchObject({
      valid: false,
      chain: "arbitrum",
    });
  });
});
