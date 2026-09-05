import { describe, expect, it } from "vitest";
import { Bitcoin, InvalidAddressError, identify } from "../../src/index.ts";

/** Published address vectors: https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki */
const validMainnet = [
  "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
  "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
  "BC1SW50QGDZ25J",
  "bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs",
  "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
];
const invalid = [
  ["Invalid human-readable part", "tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut"],
  [
    "Invalid checksum (Bech32 instead of Bech32m)",
    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd",
  ],
  [
    "Invalid checksum (Bech32 instead of Bech32m)",
    "tb1z0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqglt7rf",
  ],
  [
    "Invalid checksum (Bech32 instead of Bech32m)",
    "BC1S0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ54WELL",
  ],
  ["Invalid checksum (Bech32m instead of Bech32)", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh"],
  [
    "Invalid checksum (Bech32m instead of Bech32)",
    "tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47",
  ],
  [
    "Invalid character in checksum",
    "bc1p38j9r5y49hruaue7wxjce0updqjuyyx0kh56v8s25huc6995vvpql3jow4",
  ],
  ["Invalid witness version", "BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R"],
  ["Invalid program length (1 byte)", "bc1pw5dgrnzv"],
  [
    "Invalid program length (41 bytes)",
    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav",
  ],
  [
    "Invalid program length for witness version 0 (per BIP141)",
    "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P",
  ],
  ["Mixed case", "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47Zagq"],
  [
    "zero padding of more than 4 bits",
    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf",
  ],
  [
    "Non-zero padding in 8-to-5 conversion",
    "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vpggkg4j",
  ],
  ["Empty data section", "bc1gmk9yu"],
];
const testnet = [
  "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
  "tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy",
  "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c",
];

/** Extra mainnet vectors encoded with sipa/bech32's reference Python encoder. */
const programBoundaries = [
  "bc1qqqqsyqcyq5rqwzqfpg9scrgwpugpzysnzs23v9ccrydpk8qarc0szrtjt7",
  "bc1pqqqs4em24r",
  "bc1pqqqsyqcyq5rqwzqfpg9scrgwpugpzysnzs23v9ccrydpk8qarc0jqgfzyvjz2f38wjxkpz",
  "bc1sqqqsyqcyq5rqwzqfpg9scrgwpugpzysnzs23v9ccrydpk8qarc0jqgfzyvjz2f3888928t",
];

const bitcoin = new Bitcoin();

describe("Bitcoin SegWit validation", () => {
  it.each(validMainnet)("accepts the BIP-350 mainnet vector %s in either case", (address) => {
    for (const candidate of [address.toLowerCase(), address.toUpperCase()]) {
      expect(bitcoin.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each(invalid)("rejects BIP-350 invalid input: %s", (_reason, address) => {
    expect(() => bitcoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(programBoundaries)("accepts a valid witness program boundary: %s", (address) => {
    expect(bitcoin.assertAddress(address)).toBe(address);
  });

  it.each([
    ["a 21-byte v0 program", "bc1qqqqsyqcyq5rqwzqfpg9scrgwpugpzysnzsf6edgu"],
    ["nonzero padding", "bc1pqqqsyqcyq5rqwzqfpg9scrgwpugpzysnzs23v9ccrydpk8qarc034zlwws"],
  ])("rejects %s even with a correct mainnet checksum", (_reason, address) => {
    expect(() => bitcoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(validMainnet)("rejects a checksum substitution in %s", (address) => {
    const replacement = address.endsWith("q") ? "p" : "q";
    expect(() => bitcoin.assertAddress(address.toLowerCase().slice(0, -1) + replacement)).toThrow(
      InvalidAddressError,
    );
  });

  it.each(["", "bc1" + "q".repeat(1000), "bc1pqqqs4em24r\n", "bc1pqqqs4em24r\u0000"])(
    "rejects malformed input %j",
    (address) => {
      expect(() => bitcoin.assertAddress(address)).toThrow(InvalidAddressError);
    },
  );

  it("does not case fold Unicode into the Bech32 alphabet", () => {
    const address = "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4";
    expect(() => bitcoin.assertAddress(address.replace("K", "\u212A"))).toThrow(
      InvalidAddressError,
    );
  });

  it.each(testnet)("rejects a valid testnet address: %s", (address) => {
    expect(() => bitcoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it("rejects the checksum typo from issue #21 through validation and identification", () => {
    const valid = "bc1qaxm5p35r3yl25rdh5ex0j6wx33peht9r735x90";
    const typo = "bc1qaxm5p35r3yl25rdh5ex0j6wx33peht9r735x9q";
    expect(bitcoin.assertAddress(valid)).toBe(valid);
    expect(() => bitcoin.assertAddress(typo)).toThrow(InvalidAddressError);
    expect(identify(typo).matches.map((chain) => chain.key)).not.toContain("bitcoin");
  });
});
