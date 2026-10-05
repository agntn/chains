import { legacyAddress, legacyLayout, settle } from "../core/address.ts";
import type { DecodedAddress, LegacyVersions } from "../core/address.ts";
import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitAddress, segwitFault, segwitShaped } from "../core/segwit.ts";

/** Version bytes of the legacy addresses, in the order the reason names them. */
const VERSIONS: LegacyVersions = [
  [0x26, "p2pkh"],
  [0x17, "p2sh"],
];

export class BitcoinGold extends UTXO {
  static readonly key = "bitcoingold" as const;
  readonly name = "Bitcoin Gold";
  readonly symbol = "BTG";
  override readonly decimals = 8;
  readonly explorer = "https://btgexplorer.com";
  override readonly bip44 = 156;
  override readonly magic = "e1476d44";
  override readonly pow = "equihash-144-5";

  /**
   * SegWit under `btg` and Base58Check under 0x26 (`G...`) or 0x17 (`A...`), checksum included.
   * The fork moved both version bytes off Bitcoin's, so no legacy address reads on both chains,
   * and its node decodes witness programs by Bitcoin Core 0.21's rules, Bech32m for v1 and up.
   *
   * @param {string} address - Candidate Bitcoin Gold address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const legacy = base58CheckFault(address, 35, legacyLayout(VERSIONS));
    const fault = legacy && segwitShaped(address, "btg") ? segwitFault(address, "btg") : legacy;
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * The kind behind the version byte or the witness program, with the hash it pays to.
   *
   * @param {string} address - Candidate Bitcoin Gold address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    return settle(
      this.key,
      address,
      legacyAddress(address, 35, VERSIONS) ?? segwitAddress(address, "btg"),
    );
  }
}
