import { describe, expect, it } from "vitest";
import { BITCOIN_ALPHABET, decodeBase58 } from "../../src/core/base58.ts";
import { blake256 } from "../../src/core/blake256.ts";
import { sha256 } from "../../src/core/sha256.ts";
import { create, InvalidAddressError, type ChainKey } from "../../src/index.ts";
import { identifyAddress, validateChainAddress } from "../../src/tool-operations.ts";

/**
 * The validators as they stood before they named a reason, frozen here so a reworded fault
 * cannot move what passes. Nothing below imports the readers this change rewrote.
 * @param {string} input - Base58Check text.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {Function} digest - Hash behind the checksum.
 * @returns {Uint8Array | undefined} The bytes when the checksum holds.
 */
function oldBase58Check(
  input: string,
  maxLength: number,
  digest: (message: ArrayLike<number>) => Uint8Array = sha256,
): Uint8Array | undefined {
  const bytes = decodeBase58(input, maxLength, BITCOIN_ALPHABET);
  if (bytes === undefined || bytes.length < 4) return undefined;
  const checksum = digest(digest(bytes.subarray(0, -4)));
  for (let index = 0; index < 4; index++) {
    if (bytes[bytes.length - 4 + index] !== checksum[index]) return undefined;
  }
  return bytes;
}

const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function oldPolymod(hrp: string, data: readonly number[]): number {
  const codes = Array.from(hrp, (character) => character.codePointAt(0) ?? 0);
  const values = [...codes.map((code) => code >> 5), 0, ...codes.map((code) => code & 31), ...data];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (const [bit, generator] of GENERATORS.entries()) {
      if ((top >>> bit) & 1) checksum ^= generator;
    }
  }
  return checksum;
}

function oldBech32Digits(address: string, hrp: string, maxDigits: number): number[] | undefined {
  const count = address.length - hrp.length - 1;
  if (count < 7 || count > maxDigits) return undefined;
  if (/[^A-Za-z0-9]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  if (!lower.startsWith(`${hrp}1`)) return undefined;
  const data = Array.from(lower.slice(hrp.length + 1), (character) =>
    BECH32_ALPHABET.indexOf(character),
  );
  return data.includes(-1) ? undefined : data;
}

function oldProgram(words: readonly number[], version: number): boolean {
  const length = Math.floor((words.length * 5) / 8);
  const padding = (words.length * 5) % 8;
  if (length < 2 || length > 40 || padding > 4) return false;
  const last = words.at(-1);
  if (last === undefined || (last & ((1 << padding) - 1)) !== 0) return false;
  return version !== 0 || length === 20 || length === 32;
}

function oldSegwit(address: string, hrp: string): boolean {
  const data = oldBech32Digits(address, hrp, 71);
  if (data === undefined) return false;
  const version = data[0];
  if (version === undefined || version > 16) return false;
  if (!oldProgram(data.slice(1, -6), version)) return false;
  return oldPolymod(hrp, data) === (version === 0 ? 1 : 0x2bc830a3);
}

function oldMweb(address: string): boolean {
  const data = oldBech32Digits(address, "ltcmweb", 113);
  if (data?.[0] !== 0) return false;
  const digits = data.slice(1, -6);
  const padding = (digits.length * 5) % 8;
  if (padding >= 5 || (digits.length * 5 - padding) / 8 !== 66) return false;
  if (((digits.at(-1) ?? 0) & ((1 << padding) - 1)) !== 0) return false;
  return oldPolymod("ltcmweb", data) === 1;
}

function oldDecredPubKey(decoded: ArrayLike<number>): boolean {
  return (
    decoded.length === 39 &&
    decoded[0] === 0x13 &&
    decoded[1] === 0x86 &&
    [0, 0x80, 1, 2, 0x82].includes(decoded[2] ?? -1)
  );
}

const legacy = (address: string, maxLength: number, versions: readonly number[]) => {
  const decoded = oldBase58Check(address, maxLength);
  return decoded?.length === 25 && versions.includes(decoded[0] ?? -1);
};

const oldValidators: Record<string, (address: string) => boolean> = {
  bitcoin: (address) => legacy(address, 35, [0x00, 0x05]) || oldSegwit(address, "bc"),
  litecoin: (address) =>
    legacy(address, 35, [0x30, 0x32]) || oldSegwit(address, "ltc") || oldMweb(address),
  bitcoingold: (address) => legacy(address, 35, [0x26, 0x17]) || oldSegwit(address, "btg"),
  dogecoin: (address) => legacy(address, 34, [0x1e, 0x16]),
  pepecoin: (address) => legacy(address, 34, [0x38, 0x16]),
  dash: (address) => legacy(address, 34, [0x4c, 0x10]),
  bitcoinsv: (address) => legacy(address, 35, [0x00]),
  tron: (address) => legacy(address, 34, [0x41]),
  decred: (address) => {
    const decoded = oldBase58Check(address, 54, blake256);
    if (!decoded) return false;
    const isHash =
      decoded.length === 26 &&
      decoded[0] === 0x07 &&
      [0x3f, 0x1f, 0x01, 0x1a].includes(decoded[1] ?? -1);
    return isHash || oldDecredPubKey(decoded);
  },
};

const samples: Record<string, readonly string[]> = {
  bitcoin: [
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
    "BC1SW50QGDZ25J",
  ],
  litecoin: [
    "LYhttvnKawAv6RcHQ4eBkNtifuiEA99PFe",
    "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w",
    "ltc1zjwls6j8c4u",
    "ltcmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5mgv5yn",
  ],
  bitcoingold: [
    "GJjz2Du9BoJQ3CPcoyVTHUJZSj62i1693U",
    "btg1qufmped88t65gh7vn9ftzjwlx9tf5a3en692wvq",
  ],
  dogecoin: ["DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L", "A6RVrq2W5x9UawVE48U6Umz7H2BNfEdub1"],
  pepecoin: ["PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb", "9xgJusiTHMsinDmj4KyxVj8LNskVaGkSGn"],
  dash: ["XjszN1jZJthEoaQDhGthRkaHL9AqaG3Vzw", "7ZXhLLCE7CuZDBiggh3yh4YFYek8JJj1i3"],
  bitcoinsv: ["198fZubHNnhsdENHbktQLw96eDMnhZ4xXM"],
  tron: ["TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
  decred: [
    "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJu",
    "DkM3ZigNyiwHrsXRjkDQ8t8tW6uKGW9g61qEkG3bMqQPQWYEf5X3J",
  ],
};

/**
 * Every string one edit away from a real address: each character swapped for each character
 * the two alphabets and a few strays hold, dropped, doubled and case flipped, plus the other
 * chains' samples. Most fail, some pass, and the old validator decides which.
 * @param {string} address - A real address.
 * @param {readonly string[]} others - Every sample, so each chain also meets the others'.
 * @returns {string[]} The candidates.
 */
function neighbours(address: string, others: readonly string[]): string[] {
  const characters = [...new Set(`${BITCOIN_ALPHABET}${BECH32_ALPHABET}0OIl1 K`)];
  const out = new Set<string>(others);
  for (let index = 0; index < address.length; index++) {
    const head = address.slice(0, index);
    const tail = address.slice(index + 1);
    const character = address.charAt(index);
    for (const replacement of characters) out.add(head + replacement + tail);
    out.add(head + tail);
    out.add(head + character + character + tail);
    const flipped =
      character === character.toLowerCase() ? character.toUpperCase() : character.toLowerCase();
    out.add(head + flipped + tail);
  }
  out.add(address.toLowerCase());
  out.add(address.toUpperCase());
  out.add("");
  return [...out];
}

const reasonOf = (key: ChainKey, address: string): string | undefined => {
  try {
    create(key).assertAddress(address);
    return undefined;
  } catch (error) {
    if (!(error instanceof InvalidAddressError)) throw error;
    return error.reason ?? "";
  }
};

describe("Base58Check and SegWit rejection reason", () => {
  const everySample = Object.values(samples).flat();

  it.each(Object.keys(samples))("accepts on %s exactly what the old validator did", (key) => {
    const old = oldValidators[key];
    if (old === undefined) throw new Error(`no old validator for ${key}`);
    let accepted = 0;
    let rejected = 0;
    for (const sample of samples[key] ?? []) {
      for (const candidate of neighbours(sample, everySample)) {
        const reason = reasonOf(key as ChainKey, candidate);
        expect(reason === undefined, `${key} ${JSON.stringify(candidate)}`).toBe(old(candidate));
        if (reason === undefined) accepted++;
        else {
          rejected++;
          expect(reason, `${key} ${JSON.stringify(candidate)} has no reason`).not.toBe("");
        }
      }
    }
    expect(accepted).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });

  it.each<[ChainKey, string, string]>([
    [
      "bitcoin",
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb",
      "the Base58Check checksum does not hold, so a character is wrong",
    ],
    [
      "bitcoin",
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNaa",
      "decodes to 26 bytes, not 25; the Base58Check checksum does not hold, so a character is wrong",
    ],
    [
      "bitcoin",
      "0A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      '1 character that is not a base58 digit, the first "0" at position 1',
    ],
    [
      "bitcoin",
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "version byte 0x41, where this chain writes 0x00 or 0x05",
    ],
    ["bitcoin", "", "empty"],
    ["bitcoin", "1", "too short to carry a checksum"],
    [
      "bitcoin",
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5",
      "the Bech32 checksum does not hold, so a character is wrong",
    ],
    [
      "bitcoin",
      "BC1QW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      "upper and lower case mixed, which Bech32 forbids",
    ],
    [
      "bitcoin",
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3tb",
      '1 character outside the Bech32 alphabet, the first "b" at position 42',
    ],
    [
      "bitcoin",
      "bc1Kw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      '1 character outside the Bech32 alphabet, the first "K" at position 4',
    ],
    [
      "bitcoin",
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd",
      "a Bech32 checksum under witness version 1, where BIP-350 wants Bech32m",
    ],
    [
      "bitcoin",
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh",
      "a Bech32m checksum under witness version 0, which BIP-350 leaves on Bech32",
    ],
    [
      "bitcoin",
      "BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R",
      "witness version 17, past the 16 BIP-173 defines",
    ],
    ["bitcoin", "bc1pw5dgrnzv", "a 1-byte witness program, not 2 to 40"],
    [
      "bitcoin",
      "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P",
      "a 16-byte program under witness version 0, which takes 20 or 32",
    ],
    [
      "bitcoin",
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf",
      "digits that do not pack into whole bytes with zero padding",
    ],
    ["bitcoin", "bc1gmk9yu", "6 characters after bc1, fewer than the 7 a checksum takes"],
    ["bitcoin", "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w", "does not start with bc1"],
    [
      "bitcoin",
      "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
      "does not start with bc1",
    ],
    ["bitcoin", "b31qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "does not start with bc1"],
    ["bitcoin", "B31QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4", "does not start with bc1"],
    ["litecoin", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "does not start with ltc1"],
    ["bitcoingold", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "does not start with btg1"],
    [
      "dogecoin",
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "version byte 0x00, where this chain writes 0x1e or 0x16",
    ],
    [
      "bitcoinsv",
      "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      "version byte 0x05, where this chain writes 0x00",
    ],
    [
      "tron",
      `0x${"a".repeat(40)}`,
      '42 characters, more than the 34 this chain writes; 1 character that is not a base58 digit, the first "0" at position 1',
    ],
    [
      "litecoin",
      "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4x",
      "the Bech32 checksum does not hold, so a character is wrong",
    ],
    [
      "litecoin",
      "ltcmweb1pqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5mgv5yn",
      "version digit 1, where Litecoin Core writes 0; the Bech32 checksum does not hold, so a character is wrong",
    ],
    [
      "decred",
      "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJ",
      "decodes to 25 bytes, not 26 or 39; the Base58Check checksum does not hold, so a character is wrong",
    ],
  ])("names the rule %s breaks in %s", (key, address, reason) => {
    expect(reasonOf(key, address)).toBe(reason);
  });

  it("names every rule a SegWit address breaks at once", () => {
    // BIP-350's 16-byte version 0 vector with its last checksum digit lowercased and changed.
    expect(reasonOf("bitcoin", "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9q")).toBe(
      "upper and lower case mixed, which Bech32 forbids; a 16-byte program under witness version 0, which takes 20 or 32; the Bech32 checksum does not hold, so a character is wrong",
    );
  });

  it("names every rule a Base58Check address breaks at once", () => {
    // A Bitcoin address cut short by two digits, read on Dogecoin: length, version and checksum.
    expect(reasonOf("dogecoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf")).toBe(
      "decodes to 24 bytes, not 25; version byte 0x00, where this chain writes 0x1e or 0x16; the Base58Check checksum does not hold, so a character is wrong",
    );
  });

  it(
    "explains a multi-megabyte Bech32 lookalike instead of running out of stack",
    { timeout: 30_000 },
    () => {
      const huge = `u1${"q".repeat(6_000_000)}`;
      expect(reasonOf("bitcoin", huge)).toMatch(/^does not start with bc1; /);
      expect(reasonOf("litecoin", huge)).toMatch(/^does not start with ltc1; /);
      expect(reasonOf("bitcoingold", huge)).toMatch(/^does not start with btg1; /);
      expect(identifyAddress(huge).details.matches).toEqual([]);
      expect(validateChainAddress("bitcoin", huge).details).toMatchObject({ valid: false });
    },
  );

  it("prints the reason in the tool answer with the caller's control characters escaped", () => {
    expect(
      validateChainAddress("bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7Div\u001BNa").content,
    ).toEqual([
      {
        type: "text",
        text: 'Invalid Bitcoin (bitcoin) address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Div\\u001bNa" - 1 character that is not a base58 digit, the first "\\u001b" at position 32',
      },
    ]);
  });
});
