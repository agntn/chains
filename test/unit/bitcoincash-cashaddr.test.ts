import { describe, expect, it } from "vitest";
import { BitcoinCash, InvalidAddressError, identify } from "../../src/index.ts";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/**
 * The prize address of RetiredCoder's mini-puzzle for puzzle 130, hash160
 * a24922852051a9002ebf4c864a55acb75bb4cf75, the same hash `1Fo65aKq8s8iquMt6weF1rku1moWVEd5Ua` carries.
 */
const prize = "bitcoincash:qz3yjg59ypg6jqpwhaxgvjj44jm4hdx0w5wsxw2qez";

/**
 * The CashTokens CHIP's mainnet vectors: types 0 and 2 over 20 bytes, types 1 and 3 over 20 and
 * over 32, the pay-to-script-hash-32 form. https://github.com/cashtokens/cashtokens/blob/master/test-vectors/cashaddr.json
 */
const specified = [
  "bitcoincash:qr6m7j9njldwwzlg9v7v53unlr4jkmx6eylep8ekg2",
  "bitcoincash:zr6m7j9njldwwzlg9v7v53unlr4jkmx6eycnjehshe",
  "bitcoincash:ppawqn2h74a4t50phuza84kdp3794pq3ccvm92p8sh",
  "bitcoincash:rpawqn2h74a4t50phuza84kdp3794pq3cct3k50p0y",
  "bitcoincash:pvqqqqqqqqqqqqqqqqqqqqqqzg69v7ysqqqqqqqqqqqqqqqqqqqqqpkp7fqn0",
  "bitcoincash:rvqqqqqqqqqqqqqqqqqqqqqqzg69v7ysqqqqqqqqqqqqqqqqqqqqqn9alsp2y",
  "bitcoincash:p0llllllllllllllllllllllllllllllllllllllllllllllllll7x3vthu35",
];

/**
 * Read off the chain through Blockchair on 2026-09-24: the largest balance, a 20-byte script
 * hash, and two 32-byte script hashes paid in the same listing.
 */
const live = [
  "qre24q38ghy6k3pegpyvtxahu8q8hqmxmqqn28z85p",
  "pqe8h7ela67alylmh4wxs63s9yjeng0q6gu37chgum",
  "p023vgef20u202932zvv9plt28nsldsxfsrext4ccsvlfu7gyp4vun3d2rxy7",
  "pwsu8f4ftnsugunzy8wruhuayvtpz9mt88euwvwtp5jvv58wnd95c0td3wpdp",
];

/**
 * Checksums that hold under `bitcoincash` over payloads Bitcoin Cash Node turns away: a 32-byte
 * pay-to-pubkey-hash, the 24 and 64 byte type 0 vectors, and type 15, which no node defines.
 */
const refused = [
  "bitcoincash:qvch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxq5nlegake",
  "bitcoincash:q9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h2ws4mr9g0",
  "bitcoincash:qlg0x333p4238k0qrc5ej7rzfw5g8e4a4r6vvzyrcy8j3s5k0en7calvclhw46hudk5flttj6ydvjc0pv3nchp52amk97tqa5zygg96mtky5sv5w",
];

const bitcoinCash = new BitcoinCash();
const bare = (address: string) => address.slice(address.indexOf(":") + 1);

describe("Bitcoin Cash CashAddr validation", () => {
  it.each([prize, ...specified, ...live])("accepts %s prefixed, bare and uppercase", (address) => {
    const payload = bare(address);
    const prefixed = `bitcoincash:${payload}`;
    for (const candidate of [prefixed, payload, prefixed.toUpperCase(), payload.toUpperCase()]) {
      expect(bitcoinCash.assertAddress(candidate)).toBe(candidate);
    }
  });

  it("rejects a one-character corruption of the prize address", () => {
    expect(() =>
      bitcoinCash.assertAddress("bitcoincash:qz3yjg59ypg6jqpwhaxgvjj44jm4hdx0w5wsxw2qe2"),
    ).toThrow(InvalidAddressError);
  });

  it.each([prize, live[2] ?? ""])("rejects a substitution at every position of %s", (address) => {
    const payload = bare(address);
    for (let index = 0; index < payload.length; index++) {
      const digit = ALPHABET.indexOf(payload[index] ?? "");
      const replacement = ALPHABET[(digit + 1) % ALPHABET.length];
      const candidate = payload.slice(0, index) + replacement + payload.slice(index + 1);
      expect(() => bitcoinCash.assertAddress(candidate), candidate).toThrow(InvalidAddressError);
    }
  });

  it.each(refused)("rejects %s despite its checksum", (address) => {
    expect(() => bitcoinCash.assertAddress(address)).toThrow(InvalidAddressError);
  });

  /** The same hash under the eCash and testnet prefixes, then eCash's own vector. */
  it.each([
    "ecash:qz3yjg59ypg6jqpwhaxgvjj44jm4hdx0w5haj936l4",
    "bchtest:pr6m7j9njldwwzlg9v7v53unlr4jkmx6eyvwc0uz5t",
    "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
  ])("rejects %s with and without its prefix", (address) => {
    expect(() => bitcoinCash.assertAddress(address)).toThrow(InvalidAddressError);
    expect(() => bitcoinCash.assertAddress(bare(address))).toThrow(InvalidAddressError);
  });

  /** Legacy base58 carries Bitcoin's version bytes, so it says nothing about Bitcoin Cash. */
  it("rejects the prize hash in legacy base58", () => {
    expect(() => bitcoinCash.assertAddress("1Fo65aKq8s8iquMt6weF1rku1moWVEd5Ua")).toThrow(
      InvalidAddressError,
    );
  });

  it.each([
    "",
    "bitcoincash:",
    `bitcoincash:${prize}`,
    "bitcoincash:Qz3yjg59ypg6jqpwhaxgvjj44jm4hdx0w5wsxw2qez",
    `${prize}\n`,
    "q".repeat(1000),
  ])("rejects malformed input %j", (address) => {
    expect(() => bitcoinCash.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it("attributes a bare CashAddr payload to Bitcoin Cash alone", () => {
    expect(identify(bare(prize)).matches.map((chain) => chain.key)).toEqual(["bitcoincash"]);
  });
});
