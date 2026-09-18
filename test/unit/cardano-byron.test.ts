import { describe, expect, it } from "vitest";
import { decodeBase58 } from "../../src/core/base58.ts";
import { crc32 } from "../../src/core/crc32.ts";
import { create, identify, InvalidAddressError } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Mainnet addresses read off the chain through Koios: the redeem address spent and the
 * Daedalus address paid by 6bab31b9… in epoch 0, then two Icarus addresses paid by
 * 47a44fdf… at block 4400000.
 */
const live = [
  "Ae2tdPwUPEZ7fj1UjVfwKDea937VSzSHurLScLjaeKxApUswydS6DTtK5qt",
  "DdzFFzCqrhsoXBAE5n7CWTHXUAPmwcJVj6D8mVfU8a3vAAgLBm449swRhAqxm9ZnPUYnKhLLAXCGy7UiqG439CiaioBa5MTnPGpavGvC",
  "Ae2tdPwUPEZK2a4yVK27MkEKgVEPtvdkjzzp7G6pGftbWTzy5sHSephRYzv",
  "Ae2tdPwUPEZAuJBEa6qihuntPAbbxTNWvhAC3q6GN5weNWVgCkwCpMgxDL8",
] as const;

/**
 * The CIP-19 Byron example, which carries the legacy testnet magic 1097911063, and an
 * address written by cardano-serialization-lib 17.0.0 `ByronAddress.icarus_from_key`
 * under protocol magic 1, the preprod network. Both checksums hold.
 */
const testnet = [
  "37btjrVyb4KDXBNC4haBVPCrro8AQPHwvCMp3RFhhSVWwfFmZ6wwzSK6JK1hY6wHNmtrpTf1kdbva8TCneM2YsiXT7mrzT21EacHnPpz5YyUdj64na",
  "FHnt4NL7yPXmHBp2bjmkLpVJ7umqpHTDuiHGC6uDyesaGwY9WLNkJeH4zxQxeDH",
] as const;

/** The root of the CIP-19 example, an opaque hash as far as the envelope goes. */
const ROOT = "7e9ee4a9527dea9091e2d580edd6716888c42f75d96276290f98fe0b";

/**
 * An Icarus payload whose root is the first 28 bytes of the SHA-256 of `agntn/chains 21696`,
 * the first counter whose CRC-32 fits two bytes: 0x8733, so canonical CBOR writes `19 87 33`.
 */
const SHORT_CHECKSUM = "VhLXUZmS1gYUbdFm6tKRbAuqjXEMePRNjpjQzmycJ8pVmwzxumx8ZQPk";

/**
 * Encodes bytes as base58 under Bitcoin's alphabet.
 * @param {readonly number[]} bytes - Bytes to encode.
 * @returns {string} The base58 text.
 */
function encodeBase58(bytes: readonly number[]): string {
  let value = bytes.reduce((total, byte) => total * 256n + BigInt(byte), 0n);
  let text = "";
  while (value > 0n) {
    text = ALPHABET.charAt(Number(value % 58n)) + text;
    value /= 58n;
  }
  return text;
}

/**
 * The CRC-32 as canonical CBOR writes any value past 65535: a four-byte head.
 * @param {number} checksum - The CRC-32.
 * @returns {readonly number[]} Five bytes.
 */
function fourBytes(checksum: number): readonly number[] {
  return [
    0x1a,
    checksum >>> 24,
    (checksum >>> 16) & 0xff,
    (checksum >>> 8) & 0xff,
    checksum & 0xff,
  ];
}

/**
 * Wraps a payload in the Byron envelope: array of two, tag 24 over the payload bytes,
 * then the CRC-32 written over four bytes unless a caller writes it another way.
 * @param {string} payloadHex - The array of root, attributes and type, as hex.
 * @param {(checksum: number) => readonly number[]} checksumBytes - How the CRC is written.
 * @returns {string} The base58 address.
 */
function envelope(
  payloadHex: string,
  checksumBytes: (checksum: number) => readonly number[] = fourBytes,
): string {
  const payload = Array.from(payloadHex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
  return encodeBase58([
    0x82,
    0xd8,
    0x18,
    0x58,
    payload.length,
    ...payload,
    ...checksumBytes(crc32(payload)),
  ]);
}

/**
 * Replaces one character with another base58 digit, so the text stays base58.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the character to replace.
 * @param {number} step - How many digits further along the alphabet to take, 1 to 57.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number, step = 1): string {
  const digit = ALPHABET.indexOf(address.charAt(index));
  return `${address.slice(0, index)}${ALPHABET.charAt((digit + step) % 58)}${address.slice(index + 1)}`;
}

describe("CRC-32", () => {
  it("matches the catalogue check value for 123456789 and zero for nothing", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("reads the four bytes the Daedalus address ends with", () => {
    const bytes = decodeBase58(live[1], 128);
    expect(bytes).toBeDefined();
    if (bytes === undefined) return;
    const payload = bytes.subarray(5, 5 + (bytes[4] ?? 0));
    expect(crc32(payload)).toBe(0xed0518a1);
    expect([...bytes.subarray(-5)]).toEqual([0x1a, 0xed, 0x05, 0x18, 0xa1]);
  });
});

describe("Byron address checksum", () => {
  const cardano = create("cardano");

  it.each(live)("accepts %s", (address) => {
    expect(cardano.assertAddress(address)).toBe(address);
  });

  it.each(live)("rejects every character of %s replaced by every other digit", (address) => {
    for (let index = 0; index < address.length; index++) {
      for (let step = 1; step < 58; step++) {
        const typo = mistype(address, index, step);
        expect(() => cardano.assertAddress(typo), typo).toThrow(InvalidAddressError);
      }
    }
  });

  it("rejects the CIP-19 example and a preprod address, whose checksums hold", () => {
    for (const address of testnet) {
      expect(() => cardano.assertAddress(address)).toThrow(
        expect.objectContaining({ chain: "cardano", address }),
      );
    }
  });

  it("reads a mainnet magic written into the attributes as the ledger does, a testnet", () => {
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a102451a2d964a0900`))).toThrow(
      InvalidAddressError,
    );
  });

  it("accepts the redeem type and an attribute the ledger keeps unparsed", () => {
    expect(cardano.assertAddress(envelope(`83581c${ROOT}a002`))).toBeTruthy();
    expect(cardano.assertAddress(envelope(`83581c${ROOT}a10941aa00`))).toBeTruthy();
  });

  it("wants the attribute keys ascending, the canonical CBOR the ledger insists on", () => {
    expect(cardano.assertAddress(envelope(`83581c${ROOT}a20141aa0941bb00`))).toBeTruthy();
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a20941bb0141aa00`))).toThrow(
      InvalidAddressError,
    );
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a20141aa0141bb00`))).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects the types the ledger does not decode", () => {
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a001`))).toThrow(InvalidAddressError);
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a003`))).toThrow(InvalidAddressError);
  });

  it("rejects bytes past the type and a root that is not 28 bytes", () => {
    expect(() => cardano.assertAddress(envelope(`83581c${ROOT}a00000`))).toThrow(
      InvalidAddressError,
    );
    expect(() => cardano.assertAddress(envelope(`83581b${ROOT.slice(2)}a000`))).toThrow(
      InvalidAddressError,
    );
  });

  it("reads the checksum off the shorter head canonical CBOR writes for a small value", () => {
    expect(cardano.assertAddress(SHORT_CHECKSUM)).toBe(SHORT_CHECKSUM);
    const wrong = envelope(`83581c${ROOT}a000`, (checksum) => [
      0x19,
      checksum >>> 8,
      checksum & 0xff,
    ]);
    expect(() => cardano.assertAddress(wrong)).toThrow(InvalidAddressError);
  });

  it("drops a mistyped address out of identify instead of attributing it", () => {
    const typo = mistype(live[2], 30);
    expect(identify(live[2]).matches.map((chain) => chain.key)).toEqual(["cardano"]);
    expect(identify(typo)).toEqual({ matches: [], unchecked: [] });
    expect(identifyAddress(typo).details.matches).toEqual([]);
  });

  it("reaches the shared tool operations", () => {
    expect(validateChainAddress("cardano", live[0]).details).toMatchObject({
      valid: true,
      chain: "cardano",
    });
    expect(validateChainAddress("cardano", testnet[0]).details).toMatchObject({
      valid: false,
      chain: "cardano",
    });
  });
});
