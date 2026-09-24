import { decodeBase58Check } from "../core/base58check.js";
import { BECH32, bech32Digits, bytesFromDigits, polymod } from "../core/bech32.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { validSegwitAddress } from "../core/segwit.js";

/** Scan and spend public keys, 33 bytes each: 106 digits, the version before them, the checksum after. */
const MWEB_DIGITS = 113;

/**
 * Reads an MWEB stealth address the way Litecoin Core writes it: Bech32 under `ltcmweb`,
 * version digit 0, then the two compressed public keys. Core's reader skips the version digit,
 * but no wallet writes anything else there, so any other digit is refused.
 * @param {string} address - Candidate address.
 * @returns {boolean} Whether it spells a mainnet stealth address with a checksum that holds.
 */
function validMwebAddress(address: string): boolean {
  const data = bech32Digits(address, "ltcmweb", MWEB_DIGITS);
  if (data?.[0] !== 0) return false;
  if (bytesFromDigits(data.slice(1, -6))?.length !== 66) return false;
  return polymod("ltcmweb", data) === BECH32;
}

export class Litecoin extends UTXO {
  static readonly key = "litecoin" as const;
  readonly name = "Litecoin";
  readonly symbol = "LTC";
  override readonly decimals = 8;
  readonly explorer = "https://litecoinspace.org";
  readonly bip44 = 2;
  readonly caip2 = "bip122:12a765e31ffd4059bada1e25190f6e98";

  /**
   * SegWit under `ltc`, MWEB under `ltcmweb` and legacy Base58Check, checksum included: a typo
   * fails on every branch.
   * The deprecated 0x05 script-hash version stays out: byte-identical to a Bitcoin `3...`.
   *
   * @param {string} address - Candidate Litecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x30 || decoded[0] === 0x32);
    if (!legacy && !validSegwitAddress(address, "ltc") && !validMwebAddress(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
