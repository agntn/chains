import { legacyAddress, legacyLayout, settle } from "../core/address.ts";
import type { DecodedAddress, LegacyVersions } from "../core/address.ts";
import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitAddress, segwitFault, segwitShaped } from "../core/segwit.ts";

/** Version bytes of the legacy addresses, in the order the reason names them. */
const VERSIONS: LegacyVersions = [
  [0x00, "p2pkh"],
  [0x05, "p2sh"],
];

export class Bitcoin extends UTXO {
  static readonly key = "bitcoin" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  override readonly decimals = 8;
  readonly explorer = "https://blockstream.info";
  readonly bip44 = 0;
  readonly caip2 = "bip122:000000000019d6689c085ae165831e93";
  override readonly magic = "f9beb4d9";
  override readonly pow = "sha256d";

  /**
   * SegWit encoding and legacy Base58Check, checksum included: a typo fails on either branch.
   *
   * @param {string} address - Candidate Bitcoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const legacy = base58CheckFault(address, 35, legacyLayout(VERSIONS));
    const fault = legacy && segwitShaped(address, "bc") ? segwitFault(address, "bc") : legacy;
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * The kind behind the version byte or the witness program, with the hash it pays to.
   *
   * @param {string} address - Candidate Bitcoin address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    return settle(
      this.key,
      address,
      legacyAddress(address, 35, VERSIONS) ?? segwitAddress(address, "bc"),
    );
  }
}
