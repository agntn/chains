import { base58, createBase58check, type Base58Alphabet } from "@agntn/encodings/base58";
import { BASE58_DIGIT, decodeBase58 } from "./base58.ts";

/** An alphabet with SHA-256 behind the checksum, or the hash Decred puts there instead. */
export type Base58CheckScheme = Base58Alphabet | ((message: ArrayLike<number>) => Uint8Array);

/** What reading Base58Check makes of a string: the bytes when it decodes, and every rule it breaks. */
export interface Base58CheckRead {
  /** The decoded bytes, checksum included, present whenever the text decodes at all. */
  readonly bytes?: Uint8Array;
  readonly faults: string[];
}

/** The byte count and version bytes an address format writes. */
export interface Base58CheckLayout {
  /** Decoded length with the checksum, 25 for a legacy Bitcoin address. */
  readonly width: number;
  /** Version bytes the chain pays to. */
  readonly versions: readonly number[];
}

/**
 * Formats a byte the way chainparams writes a version.
 * @param {number} byte - Byte to format.
 * @returns {string} Two hex digits after `0x`.
 */
function hexByte(byte: number): string {
  return `0x${byte.toString(16).padStart(2, "0")}`;
}

/**
 * Names the characters that stop the text from decoding at all, counted and the first one
 * placed, so a model sees where to look without a list as long as the input.
 * @param {string} input - Text that failed to decode.
 * @param {number} maxLength - Maximum accepted character count.
 * @returns {string[]} The faults, empty for the length alone.
 */
function textFaults(input: string, maxLength: number): string[] {
  const faults: string[] = [];
  if (input.length === 0) return ["empty"];
  if (input.length > maxLength) {
    faults.push(`${input.length} characters, more than the ${maxLength} this chain writes`);
  }
  let count = 0;
  let first: string | undefined;
  let position = 0;
  let index = 0;
  for (const character of input) {
    index++;
    if (BASE58_DIGIT.test(character)) continue;
    count++;
    if (first === undefined) {
      first = character;
      position = index;
    }
  }
  if (first !== undefined) {
    const noun =
      count === 1
        ? "character that is not a base58 digit"
        : "characters that are not base58 digits";
    faults.push(`${count} ${noun}, the first ${JSON.stringify(first)} at position ${position}`);
  }
  return faults;
}

/**
 * Reads Base58Check and names every rule the text breaks on the way, so validity and reason
 * come out of one pass and can't disagree.
 *
 * The bytes come back whenever the text decodes, even when the checksum fails, so a chain can
 * still say that the length or the version is off as well: a model fixing only the checksum
 * would send the string back and learn about the rest on the next call.
 *
 * @param {string} input - Base58Check text to read.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {Base58CheckScheme} [scheme] - Alphabet or hash, Bitcoin's and SHA-256 by default.
 * @returns {Base58CheckRead} The bytes when they decode, and the faults found.
 */
export function readBase58Check(
  input: string,
  maxLength: number,
  scheme: Base58CheckScheme = "bitcoin",
): Base58CheckRead {
  const alphabet = typeof scheme === "string" ? scheme : "bitcoin";
  const bytes = decodeBase58(input, maxLength, alphabet);
  if (bytes === undefined) return { faults: textFaults(input, maxLength) };
  if (bytes.length < 4) return { bytes, faults: ["too short to carry a checksum"] };
  if (checksumHolds(input, scheme)) return { bytes, faults: [] };
  return { bytes, faults: ["the Base58Check checksum does not hold, so a character is wrong"] };
}

/**
 * Whether the checksum holds. Past a plain decode, it's all the checked decoder refuses.
 * @param {string} input - Base58 text that decodes.
 * @param {Base58CheckScheme} scheme - Alphabet or checksum hash.
 * @returns {boolean} Whether the last four bytes match the double hash of the rest.
 */
function checksumHolds(input: string, scheme: Base58CheckScheme): boolean {
  try {
    if (typeof scheme === "string") base58.decode(input, { alphabet: scheme, check: true });
    else createBase58check(scheme).decode(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decodes Base58Check, or undefined when the input is not base58 or its checksum does not hold.
 *
 * The bytes come back whole, checksum included, so callers keep counting in the widths the
 * formats are described in: 25 for a legacy Bitcoin address, 35 for an X-address. The scheme
 * is an argument because the XRP Ledger reorders the alphabet and Decred took Bitcoin's
 * encoding with BLAKE-256 in place of SHA-256.
 *
 * @param {string} input - Base58Check text to decode.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {Base58CheckScheme} [scheme] - Alphabet or hash, Bitcoin's and SHA-256 by default.
 * @returns {Uint8Array | undefined} Decoded bytes, or undefined for invalid input.
 */
export function decodeBase58Check(
  input: string,
  maxLength: number,
  scheme?: Base58CheckScheme,
): Uint8Array | undefined {
  const read = readBase58Check(input, maxLength, scheme);
  return read.faults.length === 0 ? read.bytes : undefined;
}

/**
 * Checks an address that is one version byte, a payload and the checksum, and says what is wrong.
 *
 * Length and version are read off the bytes even when the checksum fails, and listed before it.
 *
 * @param {string} address - Candidate address.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {Readonly<Base58CheckLayout>} layout - The width and version bytes the chain writes.
 * @returns {string | undefined} The rules the address breaks, or undefined when it holds.
 */
export function base58CheckFault(
  address: string,
  maxLength: number,
  layout: Readonly<Base58CheckLayout>,
): string | undefined {
  const { bytes, faults } = readBase58Check(address, maxLength);
  if (bytes !== undefined && bytes.length >= 4) {
    const layoutFaults: string[] = [];
    if (bytes.length !== layout.width) {
      layoutFaults.push(`decodes to ${bytes.length} bytes, not ${layout.width}`);
    }
    const version = bytes[0] ?? 0;
    if (!layout.versions.includes(version)) {
      layoutFaults.push(
        `version byte ${hexByte(version)}, where this chain writes ${layout.versions.map(hexByte).join(" or ")}`,
      );
    }
    faults.unshift(...layoutFaults);
  }
  return faults.length === 0 ? undefined : faults.join("; ");
}
