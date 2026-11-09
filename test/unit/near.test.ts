import { describe, expect, it } from "vite-plus/test";
import { InvalidAddressError, InvalidTxidError, create, identify } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

/* `OK_ACCOUNT_IDS` and `BAD_ACCOUNT_IDS` from near-account-id-rs `src/test_data.rs`. */
const ok = [
  "aa",
  "a-a",
  "a-aa",
  "100",
  "0o",
  "com",
  "near",
  "bowen",
  "b-o_w_e-n",
  "b.owen",
  "bro.wen",
  "a.ha",
  "a.b-a.ra",
  "system",
  "over.9000",
  "google.com",
  "illia.cheapaccounts.near",
  "0o0ooo00oo00o",
  "alex-skidanov",
  "10-4.8-2",
  "no_lols",
  "0123456789012345678901234567890123456789012345678901234567890123",
  "near.a",
];
const bad = [
  "a",
  "A",
  "Abc",
  "-near",
  "near-",
  "-near-",
  "near.",
  ".near",
  "near@",
  "@near",
  "неар",
  "@@@@@",
  "0__0",
  "0_-_0",
  "..",
  "a..near",
  "nEar",
  "_bowen",
  "hello world",
  "abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz",
  "01234567890123456789012345678901234567890123456789012345678901234",
  "some-complex-address@gmail.com",
  "sub.buy_d1gitz@atata@b0-rg.c_0_m",
];

/* Typed forms from the `get_account_type` tests in near-account-id-rs `account_id_ref.rs`. */
const ethImplicit = "0xb794f5ea0ba39494ce839613fffba74279579268";
const deterministic = "0s0123456789abcdef0123456789abcdef01234567";
const universal = [
  "0u0000000000000000000000000000000000000000000000000000",
  "0uzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzg",
  "0u000g40r40m30e209185gr38e1w8124gk2gahc5rr34d1p70x3rfg",
];

/* Accounts in mainnet block 223804153, read through `chunk` on rpc.mainnet.near.org, 2026-11-09. */
const nearImplicit = "3b1096233f9d1203bf562eeee05df3b5bba67e382f87f2a0502627fb6e711294";
const live = ["aggregate-oracle.near", "0here.tg", "usdt.tether-token.near", "intents.near"];

/* Transaction hashes from the same block, the first one 43 characters long. */
const txids = [
  "uWzGEH9oBqoxkDeHfz2DzZNcYQGSSAozxav7HBURxEd",
  "D3YUvY2khDCLiDiBQTXYq4pNWPyUKwXwqyk3cSs4Z4bu",
];

const near = create("near");

describe("NEAR address validation", () => {
  it("accepts every account ID near-account-id-rs accepts", () => {
    for (const account of [
      ...ok,
      ...live,
      nearImplicit,
      ethImplicit,
      deterministic,
      ...universal,
    ]) {
      expect(near.assertAddress(account), account).toBe(account);
    }
  });

  it("refuses every account ID near-account-id-rs refuses", () => {
    for (const account of bad) {
      expect(() => near.assertAddress(account), account).toThrow(InvalidAddressError);
    }
  });

  it.each([
    ["a", "shorter than the 2 characters an account ID needs"],
    ["0".repeat(65), "65 characters, over the 64 an account ID allows"],
    ["nEar", "uppercase letters, and an account ID is lowercase only"],
    ["near@", "characters outside a-z, 0-9, '-', '_' and '.'"],
    ["a..near", "a '-', '_' or '.' at either end or two in a row"],
    ["-near", "a '-', '_' or '.' at either end or two in a row"],
    ["near.", "a '-', '_' or '.' at either end or two in a row"],
  ])("says why %s fails", (account, reason) => {
    expect(() => near.assertAddress(account)).toThrow(
      expect.objectContaining({ chain: "near", reason }),
    );
  });

  it("names the rule through the validate tool", () => {
    const answer = validateChainAddress("near", "Alice.near");
    expect(answer.details.valid).toBe(false);
    expect(answer.content[0]?.text).toContain("uppercase letters");
    expect(validateChainAddress("near", "aurora").details.valid).toBe(true);
  });
});

describe("NEAR in identify", () => {
  it("names NEAR for dotted names and every typed account", () => {
    for (const account of [...live, nearImplicit, deterministic, ...universal]) {
      expect(
        identify(account).matches.map((chain) => chain.key),
        account,
      ).toEqual(["near"]);
    }
  });

  it("puts an ETH-implicit account next to the EVM chains that share it", () => {
    const keys = identify(ethImplicit).matches.map((chain) => chain.key);
    expect(keys).toContain("ethereum");
    expect(keys.at(-1)).toBe("near");
  });

  /* BIP-173 P2WPKH, BIP-350 P2TR and the CashAddr spec's first example without its prefix. */
  it.each([
    ["bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "bitcoin"],
    ["bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0", "bitcoin"],
    ["qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a", "bitcoincash"],
  ])("keeps %s to its own chain, though NEAR's grammar takes it", (address, owner) => {
    expect(near.assertAddress(address)).toBe(address);
    expect(identify(address).matches.map((chain) => chain.key)).toEqual([owner]);
  });

  it("leaves a bare name and a non-canonical universal account unclaimed", () => {
    for (const account of [
      "aurora",
      "near",
      "0u0000000000000000000000000000000000000000000000000001",
    ]) {
      expect(near.assertAddress(account), account).toBe(account);
      expect(identify(account).matches, account).toEqual([]);
    }
    expect(identifyAddress("aurora").content[0]?.text).toContain("matches none");
  });
});

describe("NEAR transaction hashes", () => {
  it("accepts a 32-byte hash in base58", () => {
    for (const txid of txids) expect(near.assertTxid(txid), txid).toBe(txid);
  });

  it.each([
    ["1".repeat(20), "decodes to 20 bytes, not the 32 of a hash"],
    [`${txids[1]}1`, "not base58 of at most 44 characters"],
    [`0x${"ab".repeat(32)}`, "not base58 of at most 44 characters"],
    [txids[1]?.replace("Y", "l") ?? "", "not base58 of at most 44 characters"],
  ])("refuses %s", (txid, reason) => {
    expect(() => near.assertTxid(txid)).toThrow(InvalidTxidError);
    expect(() => near.assertTxid(txid)).toThrow(expect.objectContaining({ reason }));
  });
});
