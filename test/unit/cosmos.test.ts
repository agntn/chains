import { describe, expect, it } from "vite-plus/test";
import { InvalidAddressError, InvalidTxidError, create, identify } from "../../src/index.ts";
import { validateChainAddress, validateChainTxid } from "../../src/tool-operations.ts";

/* The BIP39 test words abandon…about at m/44'/118'/0'/0/0, derived by @agntn/keys. */
const derived = "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4";

/* Sender of a MsgSend at height 34026315, read through rest.cosmos.directory on 2026-11-24. */
const sender = "cosmos1f7qvypfaee56km5rp8lvay4f0saq9xn4neeq4p";

/* The Hub's fee_collector module account, 20 bytes cut from SHA-256 of its name. */
const feeCollector = "cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta";

/* A CosmWasm contract under code 1, 32 bytes, from the same REST endpoint. */
const contract = "cosmos1cp28gxjul0eht3axzdd5npxq7zqzy07r9y36rnsdf3r4s2g6d8hszw5k3s";

/* The validator operator of MsgDelegate 74573FF8… at height 34026314. */
const validator = "cosmosvaloper15gyzcp2kas2yntv9k3p0zm4k8y6e89ecmkeqee";

const cosmos = create("cosmos");

describe("Cosmos Hub address validation", () => {
  it("accepts key, module and contract accounts, in one case either way", () => {
    for (const address of [derived, sender, feeCollector, contract, sender.toUpperCase()]) {
      expect(cosmos.assertAddress(address), address).toBe(address);
    }
  });

  it.each([
    [validator, "does not start with cosmos1"],
    /* The sender's key hash under Osmosis' prefix, built with encodings. */
    ["osmo1f7qvypfaee56km5rp8lvay4f0saq9xn4mz2srn", "does not start with cosmos1"],
    /* The sender's hash a byte longer, then shorter, checksums valid, built with encodings. */
    ["cosmos1f7qvypfaee56km5rp8lvay4f0saq9xn4qqcc6clv", "decodes to 21 bytes, not 20 or 32"],
    ["cosmos1f7qvypfaee56km5rp8lvay4f0saq9xsmqv0wt", "decodes to 19 bytes, not 20 or 32"],
    /* The contract with a padding bit set in its last digit, Bech32 checksum valid. */
    [
      "cosmos1cp28gxjul0eht3axzdd5npxq7zqzy07r9y36rnsdf3r4s2g6d8h3lcqrvz",
      "digits that do not pack into whole bytes with zero padding",
    ],
    /* The sender under a Bech32m checksum, which the SDK never writes. */
    [
      "cosmos1f7qvypfaee56km5rp8lvay4f0saq9xn4x9fvsr",
      "the Bech32 checksum does not hold, so a character is wrong",
    ],
    [sender.slice(0, -1) + "q", "the Bech32 checksum does not hold, so a character is wrong"],
    ["C" + sender.slice(1), "upper and lower case mixed, which Bech32 forbids"],
    [
      "cosmos1" + "q".repeat(59),
      "59 characters after cosmos1, more than the 58 this format writes",
    ],
  ])("says why %s fails", (address, reason) => {
    expect(() => cosmos.assertAddress(address)).toThrow(InvalidAddressError);
    expect(() => cosmos.assertAddress(address)).toThrow(
      expect.objectContaining({ chain: "cosmos", reason }),
    );
  });

  it("names the rule through the validate tool", () => {
    const answer = validateChainAddress("atom", validator);
    expect(answer.details.valid).toBe(false);
    expect(answer.content[0]?.text).toContain("does not start with cosmos1");
    expect(validateChainAddress("cosmos", derived).details.valid).toBe(true);
  });

  it("reads an address back as an account", () => {
    expect(cosmos.decodeAddress(contract)).toEqual({ kind: "account" });
  });
});

describe("Cosmos Hub in identify", () => {
  it("names the Hub alone for every account it accepts", () => {
    for (const address of [derived, sender, feeCollector, contract]) {
      expect(
        identify(address).matches.map((chain) => chain.key),
        address,
      ).toEqual(["cosmos"]);
    }
  });

  it("leaves a validator address unclaimed", () => {
    expect(identify(validator).matches).toEqual([]);
  });
});

describe("Cosmos Hub transaction hashes", () => {
  /* That MsgSend's hash, uppercase as the node's REST and RPC print it. */
  const hash = "20D19763115DDE807A9502B61A6A2139E93B21040137BA7EC7E4FFF3659DD46E";

  it("takes the uppercase hex the node prints, and lowercase", () => {
    expect(cosmos.assertTxid(hash)).toBe(hash);
    expect(cosmos.assertTxid(hash.toLowerCase())).toBe(hash.toLowerCase());
    expect(validateChainTxid("cosmos", hash).details.valid).toBe(true);
  });

  it("refuses 0x, which no Cosmos tool writes", () => {
    expect(() => cosmos.assertTxid("0x" + hash)).toThrow(
      expect.objectContaining({ reason: "0x in front, which this chain's txids never carry" }),
    );
    expect(() => cosmos.assertTxid("0x" + hash)).toThrow(InvalidTxidError);
  });
});
