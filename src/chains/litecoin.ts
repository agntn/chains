import { fromWordsUnsafe } from "@agntn/encodings/bech32";
import { legacyAddress, legacyLayout, settle, toHex } from "../core/address.ts";
import type { DecodedAddress, LegacyVersions } from "../core/address.ts";
import { base58CheckFault } from "../core/base58check.ts";
import { checkedWords, readBech32Digits } from "../core/bech32.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitAddress, segwitFault, segwitShaped } from "../core/segwit.ts";

/** Version bytes of the legacy addresses, in the order the reason names them. */
const VERSIONS: LegacyVersions = [
  [0x30, "p2pkh"],
  [0x32, "p2sh"],
];

/** Scan and spend public keys, 33 bytes each: 106 digits, the version before them, the checksum after. */
const MWEB_DIGITS = 113;

/**
 * Reads an MWEB stealth address the way Litecoin Core writes it: Bech32 under `ltcmweb`,
 * version digit 0, then the two compressed public keys. Core's reader skips the version digit,
 * but no wallet writes anything else there, so any other digit is refused.
 * @param {string} address - Candidate address.
 * @returns {string | undefined} The rules it breaks, or undefined for a mainnet stealth address with a checksum that holds.
 */
function mwebFault(address: string): string | undefined {
  const { digits, faults } = readBech32Digits(address, "ltcmweb", MWEB_DIGITS);
  if (digits !== undefined) {
    if (digits[0] !== 0) faults.push(`version digit ${digits[0]}, where Litecoin Core writes 0`);
    const bytes = fromWordsUnsafe(digits.slice(1, -6));
    if (bytes === undefined)
      faults.push("digits that do not pack into whole bytes with zero padding");
    else if (bytes.length !== 66)
      faults.push(`${bytes.length} bytes, not the 66 of two public keys`);
    if (checkedWords(address) === undefined) {
      faults.push("the Bech32 checksum does not hold, so a character is wrong");
    }
  }
  return faults.length === 0 ? undefined : faults.join("; ");
}

/**
 * The scan and spend keys of a stealth address `mwebFault` already passed.
 * @param {string} address - Candidate address.
 * @returns {DecodedAddress | undefined} Both keys as one payload, or undefined when it is not MWEB.
 */
function mwebAddress(address: string): DecodedAddress | undefined {
  const { digits } = readBech32Digits(address, "ltcmweb", MWEB_DIGITS);
  const keys = digits && fromWordsUnsafe(digits.slice(1, -6));
  return keys && { kind: "mweb", payload: toHex(keys) };
}

export class Litecoin extends UTXO {
  static readonly key = "litecoin" as const;
  readonly name = "Litecoin";
  readonly symbol = "LTC";
  override readonly decimals = 8;
  readonly explorer = "https://litecoinspace.org";
  override readonly bip44 = 2;
  override readonly caip2 = "bip122:12a765e31ffd4059bada1e25190f6e98";
  override readonly magic = "fbc0b6db";
  override readonly pow = "scrypt";

  /**
   * SegWit under `ltc`, MWEB under `ltcmweb` and legacy Base58Check, checksum included: a typo
   * fails on every branch.
   * The deprecated 0x05 script-hash version stays out: byte-identical to a Bitcoin `3...`.
   *
   * @param {string} address - Candidate Litecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    let fault = base58CheckFault(address, 35, legacyLayout(VERSIONS));
    if (fault && /^ltcmweb1/i.test(address)) fault = mwebFault(address);
    else if (fault && segwitShaped(address, "ltc")) fault = segwitFault(address, "ltc");
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * The kind behind the version byte, the witness program, or the two keys of a stealth address.
   *
   * @param {string} address - Candidate Litecoin address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    const read = /^ltcmweb1/i.test(address) ? mwebAddress(address) : segwitAddress(address, "ltc");
    return settle(this.key, address, legacyAddress(address, 35, VERSIONS) ?? read);
  }
}
