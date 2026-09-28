import { base58CheckFault } from "../core/base58check.ts";
import { BECH32, bytesFromDigits, polymod, readBech32Digits } from "../core/bech32.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitFault, segwitShaped } from "../core/segwit.ts";

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
    const bytes = bytesFromDigits(digits.slice(1, -6));
    if (bytes === undefined)
      faults.push("digits that do not pack into whole bytes with zero padding");
    else if (bytes.length !== 66)
      faults.push(`${bytes.length} bytes, not the 66 of two public keys`);
    if (polymod("ltcmweb", digits) !== BECH32) {
      faults.push("the Bech32 checksum does not hold, so a character is wrong");
    }
  }
  return faults.length === 0 ? undefined : faults.join("; ");
}

export class Litecoin extends UTXO {
  static readonly key = "litecoin" as const;
  readonly name = "Litecoin";
  readonly symbol = "LTC";
  override readonly decimals = 8;
  readonly explorer = "https://litecoinspace.org";
  readonly bip44 = 2;
  readonly caip2 = "bip122:12a765e31ffd4059bada1e25190f6e98";
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
    let fault = base58CheckFault(address, 35, { width: 25, versions: [0x30, 0x32] });
    if (fault && /^ltcmweb1/i.test(address)) fault = mwebFault(address);
    else if (fault && segwitShaped(address, "ltc")) fault = segwitFault(address, "ltc");
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }
}
