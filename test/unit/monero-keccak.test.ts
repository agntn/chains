import { describe, expect, it } from "vitest";
import { keccak256 } from "../../src/core/keccak256.ts";
import { create, identify, InvalidAddressError } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * The address monero-project's tests/unit_tests/base58.cpp writes for its serialized
 * test keys, then the standard, integrated and subaddress from docs.getmonero.org.
 */
const live = [
  "4AzKEX4gXdJdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGy9kXCb",
  "4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge",
  "4LL9oSLmtpccfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2bYXZKKQePHES9khPK",
  "8BTd81B7syWcfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv25pnJx6",
] as const;

/**
 * Written by monero-python 1.1.1 `base58.encode` with a PyCryptodome Keccak-256 over
 * the upstream test keys: the same keys under every testnet and stagenet byte, then
 * under a mainnet byte that does not fit the length. Every checksum holds.
 */
const foreign = [
  "A2XrimiwozQdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGyp8ye5",
  "BhYarqustfadNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGzu6ea3",
  "ACEXjaYSRFvdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oQaszVgCweAhEVGdY6B",
  "5BCMKMyeBEQdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGzMDNhH",
  "7BcRV3oZUScdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGuwhwPq",
  "5Lu2LAo8nVvdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oQaszVgCweAhETsZHpZ",
  "4LgzFKtB8tpdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oGzj8CyH",
  "4AzKEX4gXdJdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oQaszVgCweAhESBqw8k",
  "8BpTZtiX83idNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oQaszVgCweAhEWYYJzA",
] as const;

/** The same keys as an integrated address and a subaddress, from the same encoder. */
const produced = [
  "4LgzFKtB8tpdNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oQaszVgCweAhET3HmL5",
  "8BpTZtiX83idNeM6dfiBFL7kqund3HYGvMBF3ttsNd9SfzgYB6L7ep1Yg1osYJzLdaKAYSLVh6e6jKnAuzj3bw1oH1y4L4Q",
] as const;

/**
 * Decodes the blocks the way the reference does, without any check.
 * @param {string} address - Address to decode.
 * @returns {number[]} The bytes.
 */
function bytesOf(address: string): number[] {
  const bytes: number[] = [];
  for (let offset = 0; offset < address.length; offset += 11) {
    const block = address.slice(offset, offset + 11);
    let value = 0n;
    for (const character of block) value = value * 58n + BigInt(ALPHABET.indexOf(character));
    for (let byte = (block.length === 11 ? 8 : 5) - 1; byte >= 0; byte--) {
      bytes.push(Number((value >> BigInt(8 * byte)) & 0xffn));
    }
  }
  return bytes;
}

/**
 * Replaces one character with another base58 digit, so the text stays an address.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the character to replace.
 * @param {number} step - How many digits further along the alphabet to take, 1 to 57.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number, step = 1): string {
  const digit = ALPHABET.indexOf(address.charAt(index));
  return `${address.slice(0, index)}${ALPHABET.charAt((digit + step) % 58)}${address.slice(index + 1)}`;
}

describe("Monero address checksum", () => {
  const monero = create("monero");

  it("reads the four bytes the upstream test address ends with", () => {
    const bytes = bytesOf(live[0]);
    expect(bytes).toHaveLength(69);
    expect(bytes.slice(65)).toEqual([0x88, 0xca, 0xf2, 0xd0]);
    expect(Array.from(keccak256(bytes.slice(0, 65)).subarray(0, 4))).toEqual([
      0x88, 0xca, 0xf2, 0xd0,
    ]);
  });

  it.each([...live, ...produced])("accepts %s", (address) => {
    expect(monero.assertAddress(address)).toBe(address);
  });

  it.each([live[0], live[2]])(
    "rejects every character of %s replaced by every other digit",
    (address) => {
      for (let index = 0; index < address.length; index++) {
        for (let step = 1; step < 58; step++) {
          const typo = mistype(address, index, step);
          expect(() => monero.assertAddress(typo), typo).toThrow(InvalidAddressError);
        }
      }
    },
  );

  it.each(foreign)("keeps the mainnet rule on %s, whose checksum holds", (address) => {
    expect(() => monero.assertAddress(address)).toThrow(
      expect.objectContaining({ chain: "monero", address }),
    );
  });

  it("drops a mistyped address out of identify instead of attributing it", () => {
    const typo = mistype(live[0], 47);
    expect(identify(live[0]).matches.map((chain) => chain.key)).toEqual(["monero"]);
    expect(identify(typo)).toEqual({ matches: [], unchecked: [] });
    expect(identifyAddress(typo).details.matches).toEqual([]);
  });

  it("reaches the shared tool operations", () => {
    expect(validateChainAddress("xmr", live[2]).details).toMatchObject({
      valid: true,
      chain: "monero",
    });
    expect(validateChainAddress("xmr", mistype(live[2], 60)).details).toMatchObject({
      valid: false,
      chain: "monero",
    });
  });
});
