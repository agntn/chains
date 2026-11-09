import { describe, expect, it } from "vitest";
import { InvalidAddressError, InvalidTxidError, create, identify } from "../../src/index.ts";
import { validateChainAddress, validateChainTxid } from "../../src/tool-operations.ts";

/* Mainnet address the Waves docs derive from key HBqhfd… in "Cryptographic practical details". */
const documented = "3PPbMwqLtwBGcJrTA5whqJfY95GqnNnFMDX";

/* Senders in mainnet block 5481572, read through nodes.wavesnodes.com on 2026-11-09. */
const live = ["3PBitcoinAVGJvpSe6jevepPbT3M8SoMZjb", "3P4MRJvttkghWsXxGZ61kqd2M79GtLujoey"];

/* Ids from that block, 43 and 44 characters, then 64-byte genesis and height 2000 payment ids. */
const txids = [
  "kD9ahh6vk5AQKQnnAGW797Qxwadidzf6Jty6r4imDQX",
  "DJjZcVo3RCFsNiVqVgRTPKZYR34LbYTdnPoMfxTdNkDk",
  "2DVtfgXjpMeFf2PQCqvwxAiaGbiDsxDjSdNQkc5JQ74eWxjWFYgwvqzC4dn7iB1AhuM32WxEiVi1SGijsBtYQwn8",
  "3gzk9QyfqQGvsU8A4zMMorpKTcFpdG7UtC4c5E7ds9MGMCMSyp6JZymQJoCjUSJQ8AaSWQDQwNmQ5F46ud4ofA5o",
];

const waves = create("waves");

describe("Waves address validation", () => {
  it("accepts the documented address and live mainnet ones", () => {
    for (const address of [documented, ...live]) {
      expect(waves.assertAddress(address), address).toBe(address);
    }
  });

  it.each([
    /* Testnet sender and recipient from the transfer example in the same docs page. */
    [
      "3N9Q2sdkkhAnbR4XCveuRaSMLiVtvebZ3wp",
      'chain byte "T", Waves testnet, where mainnet writes "W"',
    ],
    [
      "3NBVqYXrapgJP9atQccdBPAgJPwHDKkh6A8",
      'chain byte "T", Waves testnet, where mainnet writes "W"',
    ],
    /* Generator of stagenet block 3374888, read through nodes-stagenet.wavesnodes.com. */
    [
      "3Ma5mfhzVfaCtDmLNzbRSAHyhqAxbyzKdBB",
      'chain byte "S", Waves stagenet, where mainnet writes "W"',
    ],
    /* The 3PBitcoin… hash under entity type 2 with a valid checksum, built with encodings. */
    ["5ACFJgc2XvftcHn8pN8vWnv4zaBJcVUveS8", "entity type 2, where an address writes 1"],
    [`${documented.slice(0, -1)}x`, "the checksum does not hold, so a character is wrong"],
    ["1", "too short to carry a checksum"],
    ["", "empty"],
    [`${documented}0`, '1 character that is not a base58 digit, the first "0" at position 36'],
    ["3".repeat(37), "37 characters, more than the 36 this chain writes"],
  ])("says why %s fails", (address, reason) => {
    expect(() => waves.assertAddress(address)).toThrow(InvalidAddressError);
    expect(() => waves.assertAddress(address)).toThrow(
      expect.objectContaining({ chain: "waves", reason }),
    );
  });

  it("lists every fault of a truncated address at once", () => {
    expect(() => waves.assertAddress(documented.slice(0, -1))).toThrow(
      / - decodes to 25 bytes, not 26; .*; the checksum does not hold/,
    );
  });

  it("names the rule through the validate tool", () => {
    const answer = validateChainAddress("waves", "3N9Q2sdkkhAnbR4XCveuRaSMLiVtvebZ3wp");
    expect(answer.details.valid).toBe(false);
    expect(answer.content[0]?.text).toContain("Waves testnet");
    expect(validateChainAddress("waves", documented).details.valid).toBe(true);
  });

  it("reads an address back as an account", () => {
    expect(waves.decodeAddress(documented)).toEqual({ kind: "account" });
  });
});

describe("Waves in identify", () => {
  it("names Waves alone for a mainnet address", () => {
    for (const address of [documented, ...live]) {
      expect(
        identify(address).matches.map((chain) => chain.key),
        address,
      ).toEqual(["waves"]);
    }
  });

  it("leaves a testnet address unclaimed", () => {
    expect(identify("3N9Q2sdkkhAnbR4XCveuRaSMLiVtvebZ3wp").matches).toEqual([]);
  });
});

describe("Waves transaction ids", () => {
  it("accepts 32-byte hashes and 64-byte genesis and payment ids", () => {
    for (const txid of txids) expect(waves.assertTxid(txid), txid).toBe(txid);
  });

  it.each([
    ["1".repeat(20), "decodes to 20 bytes, not 32, or 64 for a genesis or payment"],
    [`0x${"ab".repeat(32)}`, "not base58 of at most 88 characters"],
    [txids[0]?.replace("h", "l") ?? "", "not base58 of at most 88 characters"],
    [`${txids[2]}1`, "not base58 of at most 88 characters"],
  ])("refuses %s", (txid, reason) => {
    expect(() => waves.assertTxid(txid)).toThrow(InvalidTxidError);
    expect(() => waves.assertTxid(txid)).toThrow(expect.objectContaining({ reason }));
  });

  it("answers through the txid tool", () => {
    expect(validateChainTxid("waves", txids[0] ?? "").details.valid).toBe(true);
  });
});
