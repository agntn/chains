import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { create, identify, InvalidAddressError, type ChainKey } from "../../src/index.ts";

const BITCOIN_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const XRP_ALPHABET = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

const nodeSha256 = (bytes: ArrayLike<number>) =>
  new Uint8Array(createHash("sha256").update(Uint8Array.from(bytes)).digest());
const random = (length: number) => new Uint8Array(randomBytes(length));

function encodeBase58(bytes: readonly number[], alphabet: string): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let text = "";
  while (value > 0n) {
    text = alphabet.charAt(Number(value % 58n)) + text;
    value /= 58n;
  }
  const zeros = bytes.findIndex((byte) => byte !== 0);
  return alphabet.charAt(0).repeat(zeros < 0 ? bytes.length : zeros) + text;
}

/**
 * Encodes with node's SHA-256, so every generated address is an independent oracle.
 * @param {readonly number[]} payload - Version byte and body, without the checksum.
 * @param {string} alphabet - Ordered 58-character alphabet.
 * @returns {string} Base58Check text.
 */
function encodeBase58Check(payload: readonly number[], alphabet = BITCOIN_ALPHABET): string {
  const checksum = nodeSha256(nodeSha256(payload)).subarray(0, 4);
  return encodeBase58([...payload, ...checksum], alphabet);
}

/**
 * Replaces one character with the next digit of the alphabet, so the string stays base58.
 * @param {string} address - Address to corrupt.
 * @param {number} index - Position of the character to replace.
 * @param {string} alphabet - Ordered 58-character alphabet.
 * @returns {string} The address one digit off at that position.
 */
function mistype(address: string, index: number, alphabet = BITCOIN_ALPHABET): string {
  const digit = alphabet.indexOf(address.charAt(index));
  return address.slice(0, index) + alphabet.charAt((digit + 1) % 58) + address.slice(index + 1);
}

/** Every Base58Check chain with the version bytes it accepts and the alphabet it reads. */
const chains: readonly {
  key: ChainKey;
  versions: readonly number[];
  alphabet: string;
}[] = [
  { key: "bitcoin", versions: [0x00, 0x05], alphabet: BITCOIN_ALPHABET },
  { key: "litecoin", versions: [0x30, 0x32], alphabet: BITCOIN_ALPHABET },
  { key: "pepecoin", versions: [0x38, 0x16], alphabet: BITCOIN_ALPHABET },
  { key: "dogecoin", versions: [0x1e, 0x16], alphabet: BITCOIN_ALPHABET },
  { key: "bitcoinsv", versions: [0x00], alphabet: BITCOIN_ALPHABET },
  { key: "bitcoingold", versions: [0x26, 0x17], alphabet: BITCOIN_ALPHABET },
  { key: "dash", versions: [0x4c, 0x10], alphabet: BITCOIN_ALPHABET },
  { key: "tron", versions: [0x41], alphabet: BITCOIN_ALPHABET },
  { key: "xrpl", versions: [0x00], alphabet: XRP_ALPHABET },
];

describe("Base58Check validation", () => {
  it.each(chains)(
    "accepts generated $key addresses and rejects every single-character typo",
    ({ key, versions, alphabet }) => {
      const chain = create(key);
      for (const version of versions) {
        for (let sample = 0; sample < 16; sample++) {
          const address = encodeBase58Check([version, ...random(20)], alphabet);
          expect(chain.assertAddress(address)).toBe(address);
          for (let index = 0; index < address.length; index++) {
            const typo = mistype(address, index, alphabet);
            expect(() => chain.assertAddress(typo), typo).toThrow(InvalidAddressError);
          }
        }
      }
    },
  );

  it("accepts generated X-addresses and rejects a typo anywhere in them", () => {
    const xrpl = create("xrpl");
    for (const flag of [0, 1]) {
      const tag = flag === 0 ? [0, 0, 0, 0, 0, 0, 0, 0] : [...random(4), 0, 0, 0, 0];
      const address = encodeBase58Check([0x05, 0x44, ...random(20), flag, ...tag], XRP_ALPHABET);
      expect(xrpl.assertAddress(address)).toBe(address);
      for (let index = 0; index < address.length; index++) {
        const typo = mistype(address, index, XRP_ALPHABET);
        expect(() => xrpl.assertAddress(typo), typo).toThrow(InvalidAddressError);
      }
    }
  });

  /** Real addresses whose last digit bumped still decodes to the right length and version. */
  it.each([
    ["bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
    ["bitcoin", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
    ["litecoin", "LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe"],
    ["litecoin", "MUB2Z9EcLdxHkiyWJXqAfPAkVpnH9xVFB1"],
    ["pepecoin", "PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb"],
    ["pepecoin", "9xgJusiTHMsinDmj4KyxVj8LNskVaGkSGn"],
    ["dogecoin", "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L"],
    ["dogecoin", "A6RVrq2W5x9UawVE48U6Umz7H2BNfEdub1"],
    ["bitcoinsv", "198fZubHNnhsdENHbktQLw96eDMnhZ4xXM"],
    ["bitcoingold", "GJjz2Du9BoJQ3CPcoyVTHUJZSj62i1693U"],
    ["bitcoingold", "ATAyJYuDeh9unZXcorvmi7fw1JSX2mwc5Q"],
    ["dash", "XjszN1jZJthEoaQDhGthRkaHL9AqaG3Vzw"],
    ["dash", "7ZXhLLCE7CuZDBiggh3yh4YFYek8JJj1i3"],
    ["zcash", "t1TSE2jJnpSrV9ThaBh52oC4EWiNMUb4wAD"],
    ["zcash", "t3PhSoyT2TiwCFrWWSezMunsanvVbxXXZAw"],
    ["tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
    ["xrpl", "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"],
    ["xrpl", "XVPcpSm47b1CZkf5AkKM9a84dQHe3mTCLZc5ZAoh11sd5nY"],
  ] as const)("keeps %s accepting %s and rejecting it one digit off", (key, address) => {
    const chain = create(key);
    const alphabet = key === "xrpl" ? XRP_ALPHABET : BITCOIN_ALPHABET;
    expect(chain.assertAddress(address)).toBe(address);
    expect(() => chain.assertAddress(mistype(address, address.length - 1, alphabet))).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects the checksum typo from issue #21 through validation and identification", () => {
    const valid = "14zMkTgaVXJcxdh4JdWi29MLRR44iUSG9W";
    const typo = "14zMkTgaVXJcxdh4JdWi29MLRR44iUSG9X";
    expect(create("bitcoin").assertAddress(valid)).toBe(valid);
    expect(() => create("bitcoin").assertAddress(typo)).toThrow(InvalidAddressError);
    expect(identify(typo).matches.map((chain) => chain.key)).not.toContain("bitcoin");
  });

  it("rejects the invented Pepecoin sample the docs used to carry", () => {
    expect(() => create("pepecoin").assertAddress("PdGZ1aBYkDy6sJhPSxtjPnNGb6h8AwKxJ9")).toThrow(
      InvalidAddressError,
    );
  });
});
