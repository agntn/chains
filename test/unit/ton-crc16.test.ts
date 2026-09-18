import { describe, expect, it } from "vitest";
import { crc16Xmodem } from "../../src/core/crc16.ts";
import { create, identify, InvalidAddressError } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** The USDT jetton master, bounceable and non-bounceable, and the masterchain burn address. */
const live = [
  "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  "UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_p0p",
  "Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF",
] as const;

/**
 * Written by @ton/core 0.63.1 `Address.toString()` for three account ids, all zero,
 * all 0xff and the SHA-256 of `agntn/chains`, on both workchains under both tags.
 */
const produced = [
  "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
  "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ",
  "Ef8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAU",
  "Uf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG3R",
  "EQD__________________________________________0vo",
  "UQD__________________________________________xYt",
  "Ef___________________________________________7Sg",
  "Uf___________________________________________-ll",
  "EQAicBiCcDQ4LR5MqzMeir1Htl6jSJnz3xw0T7Vrxbn21FjH",
  "UQAicBiCcDQ4LR5MqzMeir1Htl6jSJnz3xw0T7Vrxbn21AUC",
  "Ef8icBiCcDQ4LR5MqzMeir1Htl6jSJnz3xw0T7Vrxbn21KeP",
  "Uf8icBiCcDQ4LR5MqzMeir1Htl6jSJnz3xw0T7Vrxbn21PpK",
] as const;

/**
 * Replaces one character with another base64url digit, so the text stays an address.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the character to replace.
 * @param {number} step - How many digits further along the alphabet to take, 1 to 63.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number, step = 1): string {
  const digit = ALPHABET.indexOf(address.charAt(index));
  return `${address.slice(0, index)}${ALPHABET.charAt((digit + step) % 64)}${address.slice(index + 1)}`;
}

describe("CRC-16/XMODEM", () => {
  it("matches the catalogue check value for 123456789 and zero for nothing", () => {
    expect(crc16Xmodem(new TextEncoder().encode("123456789"))).toBe(0x31c3);
    expect(crc16Xmodem(new Uint8Array(0))).toBe(0);
  });

  it("reads the two bytes the USDT jetton master ends with", () => {
    const binary = atob(live[0].replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
    expect(crc16Xmodem(bytes.subarray(0, 34))).toBe(0xc0ec);
    expect([bytes[34], bytes[35]]).toEqual([0xc0, 0xec]);
  });
});

describe("TON address checksum", () => {
  const ton = create("ton");

  it.each([...live, ...produced])("accepts %s", (address) => {
    expect(ton.assertAddress(address)).toBe(address);
  });

  it.each(live)("rejects every character of %s replaced by every other digit", (address) => {
    for (let index = 0; index < 48; index++) {
      for (let step = 1; step < 64; step++) {
        const typo = mistype(address, index, step);
        expect(() => ton.assertAddress(typo), typo).toThrow(InvalidAddressError);
      }
    }
  });

  it("rejects a typo in the account id under the standard alphabet as well", () => {
    const standard = live[0].replaceAll("-", "+").replaceAll("_", "/");
    expect(ton.assertAddress(standard)).toBe(standard);
    expect(() => ton.assertAddress(mistype(standard, 20))).toThrow(InvalidAddressError);
  });

  it("keeps the tag and workchain rules on an address whose checksum holds", () => {
    for (const invalid of [
      "kQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_ntm",
      "EQGxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_k0w",
    ]) {
      expect(() => ton.assertAddress(invalid)).toThrow(
        expect.objectContaining({ chain: "ton", address: invalid }),
      );
    }
  });

  it("drops a mistyped address out of identify instead of attributing it", () => {
    const typo = mistype(live[0], 47);
    expect(identify(live[0]).matches.map((chain) => chain.key)).toEqual(["ton"]);
    expect(identify(typo)).toEqual({ matches: [], unchecked: [] });
    expect(identifyAddress(typo).details.matches).toEqual([]);
  });

  it("reaches the shared tool operations", () => {
    expect(validateChainAddress("ton", live[1]).details).toMatchObject({
      valid: true,
      chain: "ton",
    });
    expect(validateChainAddress("ton", mistype(live[1], 30)).details).toMatchObject({
      valid: false,
      chain: "ton",
    });
  });
});
