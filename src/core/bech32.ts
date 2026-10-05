import { bech32, bech32m } from "@agntn/encodings/bech32";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

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
 * The words behind a checksum that holds, for an address whose digits already read as ASCII.
 * @param {string} address - Address whose digits read under the prefix.
 * @param {"bech32" | "bech32m"} [variant] - Checksum the address has to carry.
 * @returns {number[] | undefined} The words, or undefined when the checksum does not hold.
 */
export function checkedWords(
  address: string,
  variant: "bech32" | "bech32m" = "bech32",
): number[] | undefined {
  const codec = variant === "bech32" ? bech32 : bech32m;
  try {
    return codec.decodeWords(address.toLowerCase(), address.length).words;
  } catch {
    return undefined;
  }
}
