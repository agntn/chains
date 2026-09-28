import { describe, expect, it } from "vitest";
import { hexTxidFault, type HexTxidShape } from "../../src/core/txid.ts";
import {
  Bitcoin,
  chains,
  create,
  InvalidTxidError,
  register,
  type ChainKey,
} from "../../src/index.ts";
import { validateChainTxid } from "../../src/tool-operations.ts";

const hex = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
const signature =
  "4AwYqQ8RbD6yhTbE9h38YiYufC7UHJfxzhP3BZsEoJRp4cY6TzphNFEsUWMjkrKNjE5dFMbBoxVwvr9m8vJukavE";
const tonBase64 = "wXeodcS9avs1UljCYpHqbFUG8puAAhS/0MoVCNtVYB0=";

describe("txid rejection reason", () => {
  it.each<[ChainKey, string, string]>([
    ["bitcoin", `0x${hex}`, "0x in front, which this chain's txids never carry"],
    ["bitcoin", hex.slice(1), "63 hex digits, not 64"],
    ["bitcoin", `${hex}0`, "65 hex digits, not 64"],
    ["bitcoin", "", "0 hex digits, not 64"],
    ["bitcoin", signature, "not 64 hex digits"],
    ["ethereum", hex, "no 0x in front of the hex digits"],
    ["ethereum", `0x${hex.slice(1)}`, "63 hex digits after 0x, not 64"],
    ["ethereum", `0X${hex}`, "not 0x followed by 64 hex digits"],
    ["aptos", hex, "no 0x in front of the hex digits"],
    ["tron", `0x${hex}`, "0x in front, which this chain's txids never carry"],
    ["stellar", hex.toUpperCase(), "uppercase hex digits, and this chain reads lowercase only"],
    [
      "octra",
      `0x${hex.slice(1).toUpperCase()}`,
      "0x in front, which this chain's txids never carry; 63 hex digits after 0x, not 64; uppercase hex digits, and this chain reads lowercase only",
    ],
    [
      "ton",
      tonBase64.slice(0, -1),
      "base64 without its closing =, which TON's own tools never leave out",
    ],
    ["ton", `0x${hex}`, "0x in front, which this chain's txids never carry"],
    ["ton", `${tonBase64}=`, "neither 64 hex digits nor 44 characters of base64 ending in ="],
    [
      "solana",
      "11111111111111111111111111111111",
      "decodes to 32 bytes, not the 64 of a signature",
    ],
    ["solana", `0x${hex}`, "not base58 of at most 88 characters"],
    ["sui", `0x${hex}`, "hex, and Sui writes a digest in base58"],
    ["sui", signature, "not base58 of at most 44 characters"],
    ["sui", "1".repeat(20), "decodes to 20 bytes, not the 32 of a digest"],
    ["arweave", "a".repeat(44), "44 base64url characters, not 43"],
    ["arweave", `${"a".repeat(42)}+`, "characters outside base64url"],
    ["arweave", `${"a".repeat(42)}B`, "the last character sets bits a 32-byte hash leaves zero"],
  ])("says why %s refuses %s", (chain, txid, reason) => {
    expect(() => create(chain).assertTxid(txid)).toThrow(
      expect.objectContaining({
        chain,
        txid,
        reason,
        message: `Invalid ${chain} txid: ${txid} - ${reason}`,
      }),
    );
  });

  it("names a rule on every built-in chain, whatever the wrong shape", () => {
    for (const key of chains()) {
      for (const txid of ["", "zz", "0x", `0x${"g".repeat(64)}`, `${hex} `]) {
        try {
          create(key).assertTxid(txid);
          expect.unreachable(`${key} accepted ${JSON.stringify(txid)}`);
        } catch (error) {
          expect(error, key).toBeInstanceOf(InvalidTxidError);
          expect((error as InvalidTxidError).reason, `${key} ${JSON.stringify(txid)}`).toBeTruthy();
        }
      }
    }
  });

  it("carries the reason into the tool text, where an MCP client reads it", () => {
    expect(validateChainTxid("btc", `0x${hex}`).content).toEqual([
      {
        type: "text",
        text: `Invalid Bitcoin (bitcoin) txid: "0x${hex}" - 0x in front, which this chain's txids never carry`,
      },
    ]);
  });

  it("strips control characters from a reason a custom chain wrote", () => {
    class Echo extends Bitcoin {
      override assertTxid(txid: string): string {
        throw new InvalidTxidError(this.key, txid, `bad\n${txid}`);
      }
    }
    register(Echo);
    try {
      const [part] = validateChainTxid("bitcoin", "ab").content;
      expect(part?.text).not.toMatch(/[\p{Cc}]/u);
      expect(part?.text).toBe('Invalid Bitcoin (bitcoin) txid: "ab" - bad ab');
    } finally {
      register(Bitcoin);
    }
  });

  it("leaves a rejection without a reason as it was", () => {
    const error = new InvalidTxidError("bitcoin", "ab");
    expect(error.reason).toBeUndefined();
    expect(error.message).toBe("Invalid bitcoin txid: ab");
  });
});

describe("hexTxidFault", () => {
  /** The patterns the hex validators used before the rule and its reason became one call. */
  const shapes: ReadonlyArray<[HexTxidShape, RegExp]> = [
    [{}, /^[0-9a-fA-F]{64}$/],
    [{ prefixed: true }, /^0x[0-9a-fA-F]{64}$/],
    [{ lowercase: true }, /^[0-9a-f]{64}$/],
  ];
  const bodies = [hex, hex.toUpperCase(), `${hex.slice(0, 32)}${hex.slice(32).toUpperCase()}`];
  const candidates = bodies.flatMap((body) =>
    [body, body.slice(1), `${body}0`, `${body.slice(1)}g`, ""].flatMap((digits) => [
      digits,
      `0x${digits}`,
      `0X${digits}`,
      `x${digits}`,
      ` ${digits}`,
    ]),
  );

  it("accepts exactly what the old patterns accepted", () => {
    for (const [shape, pattern] of shapes) {
      for (const candidate of candidates) {
        expect(
          hexTxidFault(candidate, shape) === undefined,
          `${JSON.stringify(shape)} ${candidate}`,
        ).toBe(pattern.test(candidate));
      }
    }
  });
});
