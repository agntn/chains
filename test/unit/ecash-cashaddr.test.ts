import { describe, expect, it } from "vitest";
import { Ecash, InvalidAddressError, identify } from "../../src/index.ts";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const p2pkh = "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2";

/**
 * The spec's legacy address table, its 20-byte type 0 vector, then the miner fund address
 * every coinbase pays: https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/cashaddr.md
 */
const valid = [
  p2pkh,
  "ecash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ykdcjcn6n",
  "ecash:qqq3728yw0y47sqn6l2na30mcw6zm78dzq653y7pv5",
  "ecash:ppm2qsznhks23z7629mms6s4cwef74vcwv2zrv3l8h",
  "ecash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4ypg9alspw",
  "ecash:pqq3728yw0y47sqn6l2na30mcw6zm78dzqd3vtezhf",
  "ecash:qr6m7j9njldwwzlg9v7v53unlr4jkmx6eyx54vzvwa",
  "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07",
];

/**
 * Checksums that hold under `ecash` over payloads the format rules out: the spec's checksum
 * vector with no room for a hash, its 24 and 32 byte vectors, then its 20-byte hash under
 * size bits claiming 192, with a padding bit set, and under the reserved version bit.
 */
const wrongPayload = [
  "ecash:qpzry9x8gf2tvdw0s3jn54khce6mua7llmm0t7vm",
  "ecash:q9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h24pj4gqrx",
  "ecash:qvch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxqwwcjq6wn",
  "ecash:q86m7j9njldwwzlg9v7v53unlr4jkmx6eyfdsf96na",
  "ecash:pr6m7j9njldwwzlg9v7v53unlr4jkmx6e9zj3guvxp",
  "ecash:sr6m7j9njldwwzlg9v7v53unlr4jkmx6eyhkq2f4qg",
];

/**
 * The first table hash under the Bitcoin Cash, eToken and eCash testnet prefixes.
 * Bare, only the checksum tells them from the eCash address.
 */
const otherPrefixes = [
  "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a",
  "etoken:qpm2qsznhks23z7629mms6s4cwef74vcwvnehpqmca",
  "ectest:qpm2qsznhks23z7629mms6s4cwef74vcwvmvqr33lm",
];

const ecash = new Ecash();
const bare = (address: string) => address.slice(address.indexOf(":") + 1);

describe("eCash CashAddr validation", () => {
  it.each(valid)("accepts the spec vector %s prefixed, bare and uppercase", (address) => {
    const payload = bare(address);
    for (const candidate of [address, payload, address.toUpperCase(), payload.toUpperCase()]) {
      expect(ecash.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each(valid)("rejects a substitution at every position of %s", (address) => {
    const payload = bare(address);
    for (let index = 0; index < payload.length; index++) {
      const digit = ALPHABET.indexOf(payload[index] ?? "");
      const replacement = ALPHABET[(digit + 1) % ALPHABET.length];
      const candidate = payload.slice(0, index) + replacement + payload.slice(index + 1);
      expect(() => ecash.assertAddress(candidate), candidate).toThrow(InvalidAddressError);
      expect(() => ecash.assertAddress(`ecash:${candidate}`), candidate).toThrow(
        InvalidAddressError,
      );
    }
  });

  it.each(wrongPayload)("rejects %s despite its checksum", (address) => {
    expect(() => ecash.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(otherPrefixes)("rejects %s with and without its prefix", (address) => {
    expect(() => ecash.assertAddress(address)).toThrow(InvalidAddressError);
    expect(() => ecash.assertAddress(bare(address))).toThrow(InvalidAddressError);
  });

  /** The Kelvin sign lowercases to `k`, so the charset has to be checked before the case. */
  it.each([
    "",
    "ecash:",
    `ecash:${p2pkh}`,
    "ecash:Qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
    `${p2pkh}\n`,
    "ecash:qpm2qsznhKs23z7629mms6s4cwef74vcwva87rkuu2",
    "q".repeat(1000),
  ])("rejects malformed input %j", (address) => {
    expect(() => ecash.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it("attributes a bare CashAddr payload to eCash alone", () => {
    expect(identify(bare(p2pkh)).matches.map((chain) => chain.key)).toEqual(["ecash"]);
  });
});
