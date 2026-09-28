const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/** The residue a Bech32 checksum leaves, and the one BIP-350 chose for Bech32m. */
export const BECH32 = 1;
export const BECH32M = 0x2bc830a3;

/**
 * Computes the BIP-173 polymod over the expanded human-readable part and the digits.
 * @param {string} hrp - Lowercase human-readable part.
 * @param {readonly number[]} data - Five-bit digits including the checksum.
 * @returns {number} Bech32 or Bech32m residue.
 */
export function polymod(hrp: string, data: readonly number[]): number {
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

/** What reading Bech32 text makes of it: the digits when they can be read, and every rule it breaks. */
export interface Bech32Read {
  /** Digits after the separator, checksum included, present whenever they can be read at all. */
  readonly digits?: number[];
  readonly faults: string[];
}

/**
 * The prefix and digit count rules, which decide whether the digits can be read at all.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase human-readable part the address has to open with.
 * @param {number} maxDigits - Most digits the format writes after the separator, checksum included.
 * @returns {string[]} The faults, empty when the digits can be read.
 */
function frameFaults(address: string, hrp: string, maxDigits: number): string[] {
  const faults: string[] = [];
  const head = address.slice(0, hrp.length + 1);
  if (!/^[A-Za-z0-9]+$/.test(head) || head.toLowerCase() !== `${hrp}1`) {
    faults.push(`does not start with ${hrp}1`);
  }
  const count = address.length - hrp.length - 1;
  if (count < 7) {
    faults.push(
      `${Math.max(count, 0)} characters after ${hrp}1, fewer than the 7 a checksum takes`,
    );
  } else if (count > maxDigits) {
    faults.push(`${count} characters after ${hrp}1, more than the ${maxDigits} this format writes`);
  }
  return faults;
}

/**
 * Maps the text after the separator to digits, counting what falls outside the alphabet and
 * placing the first one. Case is folded for ASCII alone: toLowerCase maps the Kelvin sign onto k.
 * @param {string} text - Everything after the separator.
 * @param {number} offset - Characters before it, so the position counts from the address start.
 * @returns {{ digits: number[]; fault?: string }} The digits, and the fault when any fall outside.
 */
function readDigits(text: string, offset: number): { digits: number[]; fault?: string } {
  const digits: number[] = [];
  let outside = 0;
  let first = "";
  let position = offset;
  for (const character of text) {
    position++;
    const digit = /^[A-Za-z0-9]$/.test(character) ? ALPHABET.indexOf(character.toLowerCase()) : -1;
    digits.push(digit);
    if (digit < 0 && outside++ === 0)
      first = `${JSON.stringify(character)} at position ${position}`;
  }
  if (outside === 0) return { digits };
  const noun = outside === 1 ? "character" : "characters";
  return { digits, fault: `${outside} ${noun} outside the Bech32 alphabet, the first ${first}` };
}

/**
 * Reads the digits after the separator and names every rule the text breaks, without
 * accepting mixed case or oversized input.
 * BIP-173's 90-character cap is the caller's to apply: Cardano writes 103-character base
 * addresses under the same encoding, so the bound is the most digits the format writes.
 * Mixed case is a fault but does not stop the reading, so the checksum still gets its say.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase human-readable part the address has to open with.
 * @param {number} maxDigits - Most digits the format writes after the separator, checksum included.
 * @returns {Bech32Read} The digits when they read, and the faults found.
 */
export function readBech32Digits(address: string, hrp: string, maxDigits: number): Bech32Read {
  const frame = frameFaults(address, hrp, maxDigits);
  const mixed = /[a-z]/.test(address) && /[A-Z]/.test(address);
  const faults = mixed ? ["upper and lower case mixed, which Bech32 forbids", ...frame] : frame;
  if (frame.length > 0) return { faults };
  const { digits, fault } = readDigits(address.slice(hrp.length + 1), hrp.length + 1);
  if (fault !== undefined) return { faults: [...faults, fault] };
  return { digits, faults };
}

/**
 * Reads the digits after the separator without accepting mixed case or oversized input.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase human-readable part the address has to open with.
 * @param {number} maxDigits - Most digits the format writes after the separator, checksum included.
 * @returns {number[] | undefined} Digits including the checksum, or invalid input.
 */
export function bech32Digits(
  address: string,
  hrp: string,
  maxDigits: number,
): number[] | undefined {
  const read = readBech32Digits(address, hrp, maxDigits);
  return read.faults.length === 0 ? read.digits : undefined;
}

/**
 * Packs five-bit digits into bytes under BIP-173's rule: fewer than five padding bits, all zero.
 * @param {readonly number[]} digits - Payload digits without the checksum.
 * @returns {Uint8Array | undefined} The bytes, or undefined when the digits do not spell bytes.
 */
export function bytesFromDigits(digits: readonly number[]): Uint8Array | undefined {
  const padding = (digits.length * 5) % 8;
  if (padding >= 5) return undefined;
  const bytes = new Uint8Array((digits.length * 5 - padding) / 8);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const digit of digits) {
    accumulator = (accumulator << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset++] = (accumulator >> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }
  return accumulator === 0 ? bytes : undefined;
}
