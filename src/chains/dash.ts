import { legacyAddress, legacyLayout, settle } from "../core/address.ts";
import type { DecodedAddress, LegacyVersions } from "../core/address.ts";
import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

/** Version bytes of the legacy addresses, in the order the reason names them. */
const VERSIONS: LegacyVersions = [
  [0x4c, "p2pkh"],
  [0x10, "p2sh"],
];

export class Dash extends UTXO {
  static readonly key = "dash" as const;
  readonly name = "Dash";
  readonly symbol = "DASH";
  override readonly decimals = 8;
  readonly explorer = "https://insight.dash.org/insight";
  readonly bip44 = 5;
  readonly caip2 = "bip122:00000ffd590b1485b3caadc19b22e637";
  override readonly magic = "bf0c6bbd";
  override readonly pow = "x11";

  /**
   * Base58Check under 0x4c (`X...`) and 0x10 (`7...`), 25 bytes with the checksum verified.
   * That's all Dash Core's `DecodeDestination` reads: no SegWit, so no Bech32 branch.
   *
   * @param {string} address - Candidate Dash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const fault = base58CheckFault(address, 34, legacyLayout(VERSIONS));
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * The kind behind the version byte, with the hash it pays to.
   *
   * @param {string} address - Candidate Dash address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    return settle(this.key, address, legacyAddress(address, 34, VERSIONS));
  }
}
