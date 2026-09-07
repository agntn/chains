import { describe, expect, it } from "vitest";
import { Cardano, InvalidAddressError, identify } from "../../src/index.ts";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const enterprise = "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";
const stake = "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw";

/**
 * The mainnet table of CIP-19, payment types 0 through 7 and both stake types:
 * https://github.com/cardano-foundation/CIPs/blob/master/CIP-0019/README.md
 */
const spec = [
  "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
  "addr1z8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs9yc0hh",
  "addr1yx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerkr0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs2z78ve",
  "addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrzqf96k",
  "addr128phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtupnz75xxcrtw79hu",
  enterprise,
  "addr1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx",
  stake,
  "stake178phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcccycj5",
];

/** Outputs of mainnet block 13910065 and the first account Koios lists, one per header wallets write. */
const live = [
  "addr1q9h4f2vhh5vnqgnsejan3psw6mj3a504fxlqm2eh3262qufesdvfs83ulr22vprsv9mwnt0vgkfwxlflxkns32twqzdqjpq2na",
  "addr1z84q0denmyep98ph3tmzwsmw0j7zau9ljmsqx6a4rvaau66j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq777e2a",
  "addr1x8vtd879xcmme7kmc3rfpqlhq67zj06dn53fvervtjsk0wl9e0e4uhxmjljsvyuv6tf3aedsznuzg4gjmtn7mclule2qyc9709",
  "addr1vyzvaej9uanx9a5jmjef7xwn298swrz0rcu34x28ygrn0ugqemevx",
  "addr1w8p79rpkcdz8x9d6tft0x0dx5mwuzac2sa4gm8cvkw5hcnqst2ctf",
  "stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zctvm3rc",
];

/**
 * Pointers at the ledger's limits, then coordinates padded to their full width, which its
 * decoder reads as long as the value still fits. Built with the CIP-19 payment credential.
 */
const pointers = [
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer50llll7lcpqy77h773",
  "addr128phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcps0lh7qgv0ltv3",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersqqqqqhu230x",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5qszqgqqqqqq9e3rm8",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersqszqqqqqper08l",
];

/**
 * Checksums that hold over what the format rules out, from the CIP-19 credentials: the testnet
 * header under the mainnet prefix, reserved network tags, the Byron and reserved types, stake
 * headers under `addr` and payment headers under `stake`, payloads a byte short or long, a
 * pointer with a trailing byte, two coordinates, a slot or index one past its width, a slot
 * padded wider than five bytes, a coordinate cut mid-byte, Bech32m, and a padding bit set.
 */
const wrongPayload = [
  "addr1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsg8a6rm",
  "addr1v22fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers69welw",
  "addr1d72fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers2fz7q4",
  "addr1sx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersl3mr28",
  "addr1jx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerske8ra8",
  "addr16x2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersmsvrn8",
  "addr1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5g3zl0gu",
  "stake1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersuzp9l4",
  "stake1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5ghgecgf",
  "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5fn0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsv46xul",
  "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywg42u60y",
  "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsq8h9s3a",
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersqz8wg7z",
  "addr1yx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzershnur38",
  "addr1vy5ecqvg",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrqqhky2kd",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxc9702q8",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5sszqgqqqpqy3mhcht",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspsjqqqqg5d4t8k",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5zszqgpqqqqyqsk50zeh",
  "addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzersqqzqqncck5l",
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers0x8069",
  "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5f2vau4u",
];

/** The CIP-19 testnet table for the same types: another prefix and network tag. */
const testnet = [
  "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae",
  "addr_test1gz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrdw5vky",
  "addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz",
  "stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn",
];

const cardano = new Cardano();
const body = (address: string) => address.slice(address.indexOf("1") + 1);

describe("Cardano Shelley validation", () => {
  it.each([...spec, ...live, ...pointers])("accepts %s in either case", (address) => {
    for (const candidate of [address, address.toUpperCase()]) {
      expect(cardano.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each([...spec, ...live])("rejects a substitution at every position of %s", (address) => {
    const prefix = address.slice(0, address.indexOf("1") + 1);
    const payload = body(address);
    for (let index = 0; index < payload.length; index++) {
      const digit = ALPHABET.indexOf(payload[index] ?? "");
      const replacement = ALPHABET[(digit + 1) % ALPHABET.length];
      const candidate = prefix + payload.slice(0, index) + replacement + payload.slice(index + 1);
      expect(() => cardano.assertAddress(candidate), candidate).toThrow(InvalidAddressError);
    }
  });

  it.each(wrongPayload)("rejects %s despite its checksum", (address) => {
    expect(() => cardano.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(testnet)("rejects the testnet vector %s", (address) => {
    expect(() => cardano.assertAddress(address)).toThrow(InvalidAddressError);
  });

  /** The Kelvin sign lowercases to `k`, so the charset has to be checked before the case. */
  it.each([
    "",
    "addr1",
    "stake1",
    `addr1${enterprise}`,
    `stake1${stake}`,
    "addr1VX2FXV2UMYHTTKXYXP8X0DLPDT3K6CWNG5PXJ3JHSYDZERS66HRL8",
    `${enterprise}\n`,
    `staKe1${body(stake)}`,
    `addr1${"q".repeat(1000)}`,
  ])("rejects malformed input %j", (address) => {
    expect(() => cardano.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it("attributes a stake address to Cardano alone", () => {
    expect(identify(stake).matches.map((chain) => chain.key)).toEqual(["cardano"]);
  });
});
