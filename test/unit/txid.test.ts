import { describe, expect, it } from "vitest";
import { chains, create, InvalidTxidError, type ChainKey } from "../../src/index.ts";
import { validateChainTxid } from "../../src/tool-operations.ts";

/**
 * One transaction per chain as its own network wrote it on 2026-09-19: the Solana RPC
 * `getSignaturesForAddress`, the Sui GraphQL `transactions` query, the Aptos REST
 * `/v1/transactions`, toncenter `/api/v3/transactions`, TronGrid `getnowblock`,
 * Horizon `/transactions`, an XRPL `ledger` call and Octra's `octra_recentTransactions`.
 */
const live: Readonly<Record<string, string>> = {
  solana:
    "4AwYqQ8RbD6yhTbE9h38YiYufC7UHJfxzhP3BZsEoJRp4cY6TzphNFEsUWMjkrKNjE5dFMbBoxVwvr9m8vJukavE",
  sui: "HUfZSfYUsX3MESY1Dv5jW45wg5tkSiJUGNnfgfpdMExP",
  aptos: "0xbd32d8ee20bd460b2cf23eee340891724f71cbd342feb71e91711f7abdac3b2d",
  ton: "wXeodcS9avs1UljCYpHqbFUG8puAAhS/0MoVCNtVYB0=",
  tron: "acd4494e78bd537fecf9fe883d2a9e176bfb4f3d5e986329ff040ef5619aee59",
  stellar: "b32c497d18ca80153d4fb212e2de9bb6bd40c8ef246fa096dc5557ddfebc7999",
  xrpl: "00EFC00A1DB8AB067704EA9F68F57D35EC646614EC8345E46F716114681C895D",
  octra: "440fede66d035d98bb42fbae4cc6344318234a636714c977ac0b20c6174d37b1",
};

/** The TON hash above as tonapi writes it, and as tonscan puts it in a URL. */
const tonHex = "c177a875c4bd6afb355258c26291ea6c5506f29b800214bfd0ca1508db55601d";
const tonUrl = "wXeodcS9avs1UljCYpHqbFUG8puAAhS_0MoVCNtVYB0=";

/**
 * Asserts that every candidate is refused with InvalidTxidError.
 * @param {ChainKey} key - Chain whose validator runs.
 * @param {readonly string[]} candidates - Strings that must not pass.
 * @returns {void}
 */
function rejects(key: ChainKey, candidates: readonly string[]): void {
  for (const candidate of candidates) {
    expect(() => create(key).assertTxid(candidate), candidate).toThrow(InvalidTxidError);
  }
}

describe("txid validation on the chains outside the hex families", () => {
  it("accepts what each network wrote and says so through validatesTxid", () => {
    for (const [key, txid] of Object.entries(live)) {
      const chain = create(key as ChainKey);
      expect(chain.validatesTxid, key).toBe(true);
      expect(chain.assertTxid(txid), key).toBe(txid);
    }
    expect(chains().filter((key) => !create(key).validatesTxid)).toEqual([]);
  });

  it("decodes a Solana signature to 64 bytes and a Sui digest to 32", () => {
    const short =
      "jRYm3bc44vSgFBQR6LGBCm8faB4uqvbmcMPirbATg7y8Cq1NN7DYyGiVvDSyzpSpt42kH7NA3eLrUbSJiThVR4W";
    expect(short).toHaveLength(87);
    expect(create("solana").assertTxid(short)).toBe(short);
    rejects("solana", [
      `${live.solana}1`,
      `1${live.solana}`,
      live.solana.replace("4", "0"),
      live.sui,
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ]);
    rejects("sui", [
      `${live.sui}1`,
      `1${live.sui}`,
      live.sui.replace("H", "l"),
      live.solana,
      "0xbd32d8ee20bd460b2cf23eee340891724f71cbd342feb71e91711f7abdac3b2d",
    ]);
  });

  it("wants the 0x on Aptos in either case, never 0X or bare hex", () => {
    const upper = `0x${live.aptos.slice(2).toUpperCase()}`;
    expect(create("aptos").assertTxid(upper)).toBe(upper);
    rejects("aptos", [
      live.aptos.slice(2),
      `0X${live.aptos.slice(2)}`,
      live.aptos.slice(0, -1),
      `${live.aptos}0`,
      live.sui,
    ]);
  });

  it("reads a TON hash in hex or padded base64, in either alphabet", () => {
    expect(create("ton").assertTxid(tonHex)).toBe(tonHex);
    expect(create("ton").assertTxid(tonHex.toUpperCase())).toBe(tonHex.toUpperCase());
    expect(create("ton").assertTxid(tonUrl)).toBe(tonUrl);
    rejects("ton", [
      live.ton.slice(0, -1),
      `${live.ton}=`,
      `${live.ton.slice(0, 42)}B=`,
      "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      `0x${tonHex}`,
      tonHex.slice(1),
    ]);
  });

  it("takes TRON and XRPL hashes in either case and no prefix", () => {
    const tronUpper = live.tron.toUpperCase();
    const xrplLower = live.xrpl.toLowerCase();
    expect(create("tron").assertTxid(tronUpper)).toBe(tronUpper);
    expect(create("xrpl").assertTxid(xrplLower)).toBe(xrplLower);
    rejects("tron", [`0x${live.tron}`, live.tron.slice(1), `${live.tron}0`]);
    rejects("xrpl", [`0x${live.xrpl}`, live.xrpl.slice(1), "C000000000000001"]);
  });

  it("holds Stellar and Octra to the lowercase their readers accept", () => {
    rejects("stellar", [
      live.stellar.toUpperCase(),
      `0x${live.stellar}`,
      live.stellar.slice(1),
      `${live.stellar}0`,
    ]);
    rejects("octra", [
      live.octra.toUpperCase(),
      `0x${live.octra}`,
      live.octra.slice(1),
      `${live.octra}0`,
    ]);
  });

  it("reaches the shared tool operations", () => {
    const valid = validateChainTxid("sol", ` ${live.solana}\n`);
    expect(valid.isError).toBeUndefined();
    expect(valid.details).toEqual({ chain: "solana", txid: live.solana, valid: true });

    const rejected = validateChainTxid("xlm", live.stellar.toUpperCase());
    expect(rejected.isError).toBeUndefined();
    expect(rejected.content[0]?.text).toBe(
      `Invalid Stellar (stellar) txid: "${live.stellar.toUpperCase()}"`,
    );
  });
});
