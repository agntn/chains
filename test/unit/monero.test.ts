import { describe, expect, it } from "vitest";
import { keccak256 } from "../../src/core/keccak256.ts";
import { Chain, InvalidAddressError, getChain, identify } from "../../src/index.ts";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
} from "../../src/tool-operations.ts";

/** Standard and integrated examples from https://docs.getmonero.org/public-address/. */
const standard =
  "4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge";
const integrated =
  "4LL9oSLmtpccfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2bYXZKKQePHES9khPK";

/** The documented public keys under prefix 42, with a PyCryptodome Keccak-256 checksum. */
const subaddress =
  "8BTd81B7syWcfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv25pnJx6";

/**
 * Encodes bytes in blocks independently and closes them with their Keccak checksum.
 * @param {readonly number[]} body - Network/type byte and public keys, payment id included.
 * @returns {string} The address those bytes spell.
 */
function encode(body: readonly number[]): string {
  const bytes = [...body, ...keccak256(body).subarray(0, 4)];
  const widths = [0, 2, 3, 5, 6, 7, 9, 10, 11];
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let address = "";
  for (let offset = 0; offset < bytes.length; offset += 8) {
    const block = bytes.slice(offset, offset + 8);
    let value = block.reduce((total, byte) => total * 256n + BigInt(byte), 0n);
    let digits = "";
    while (value > 0n) {
      digits = alphabet[Number(value % 58n)] + digits;
      value /= 58n;
    }
    address += digits.padStart(widths[block.length] ?? 0, "1");
  }
  return address;
}

/**
 * Envelope fixtures with zero public keys.
 * @param {number} prefix - Network/type byte.
 * @param {number} size - Total decoded length including checksum bytes.
 * @returns {string} Fixture encoded in blocks, with zero public keys.
 */
function envelope(prefix: number, size: number): string {
  return encode([prefix, ...Array.from({ length: size - 5 }, () => 0)]);
}

describe("Monero", () => {
  it("resolves its name and ticker to mainnet metadata", () => {
    for (const input of ["monero", "Monero", " XMR "]) {
      const chain = getChain(input);
      expect(chain).toBeInstanceOf(Chain);
      expect(chain).toMatchObject({
        key: "monero",
        name: "Monero",
        symbol: "XMR",
        type: "monero",
        bip44: 128,
        caip2: "monero:418015bb9ae982a1975da7d79277c270",
        explorer: "https://xmrchain.net",
        validatesAddress: true,
      });
      expect(chain.chainId).toBeUndefined();
      expect(chain.rpcDefault).toBeUndefined();
    }
  });

  it.each([standard, integrated, subaddress])("preserves the reference address %s", (address) => {
    expect(getChain("xmr").assertAddress(address)).toBe(address);
    expect(identify(address).matches.map((chain) => chain.key)).toContain("monero");
  });

  it("accepts all three mainnet envelopes, including zero-padded blocks", () => {
    for (const [prefix, size] of [
      [18, 69],
      [42, 69],
      [19, 77],
    ] as const) {
      const address = envelope(prefix, size);
      expect(getChain("xmr").assertAddress(address)).toBe(address);
    }
  });

  it("rejects testnet, stagenet and mismatched address types", () => {
    for (const [prefix, size] of [
      [53, 69],
      [54, 77],
      [63, 69],
      [24, 69],
      [25, 77],
      [36, 69],
      [19, 69],
      [18, 77],
      [42, 77],
      [0, 69],
    ] as const) {
      expect(() => getChain("xmr").assertAddress(envelope(prefix, size))).toThrow(
        InvalidAddressError,
      );
    }
  });

  it("checks full and final block overflow at the byte boundary", () => {
    const chain = getChain("xmr");
    const full = encode([
      18,
      ...Array.from({ length: 64 }, (_, index) => (index >= 7 && index < 15 ? 0xff : 0)),
    ]);
    expect(full.slice(11, 22)).toBe("jpXCZedGfVQ");
    expect(chain.assertAddress(full)).toBe(full);
    const overflow = `${full.slice(0, 11)}jpXCZedGfVR${full.slice(22)}`;
    expect(() => chain.assertAddress(overflow)).toThrow(InvalidAddressError);
    expect(() => chain.assertAddress(`${standard.slice(0, -7)}VtB5VXd`)).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects wrong widths, alphabets and surrounding text", () => {
    for (const address of [
      "",
      standard.slice(1),
      `${standard}1`,
      standard.slice(0, 94),
      `${standard}\n`,
      ` ${standard}`,
      `monero:${standard}`,
      `${standard.slice(0, -1)}0`,
      `${standard.slice(0, -1)}O`,
      `${standard.slice(0, -1)}é`,
      "4".repeat(100_000),
    ]) {
      expect(() => getChain("xmr").assertAddress(address), address.slice(0, 110)).toThrow(
        InvalidAddressError,
      );
    }
  });

  it("leaves public keys outside the format check", () => {
    expect(getChain("xmr").assertAddress(envelope(18, 69))).toBe(envelope(18, 69));
    expect(() => getChain("xmr").assertAddress(`${standard.slice(0, -1)}f`)).toThrow(
      InvalidAddressError,
    );
  });

  it("exposes Monero through the shared tool operations", () => {
    expect(lookupChain("XMR").details).toMatchObject({ key: "monero", bip44: 128 });
    expect(listChains("monero").details.chains).toEqual([
      { key: "monero", name: "Monero", symbol: "XMR", type: "monero" },
    ]);
    expect(validateChainAddress("xmr", integrated).details).toMatchObject({
      valid: true,
      chain: "monero",
    });
    expect(validateChainAddress("xmr", "bad").details).toMatchObject({
      valid: false,
      chain: "monero",
    });
    expect(identifyAddress(standard).details.matches).toContain("monero");
  });
});
