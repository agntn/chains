import { legacyAddress, legacyLayout, settle } from "../core/address.ts";
import type { DecodedAddress, LegacyVersions } from "../core/address.ts";
import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

/** Version bytes of the legacy addresses, in the order the reason names them. */
const VERSIONS: LegacyVersions = [[0x00, "p2pkh"]];

export class BitcoinSv extends UTXO {
  static readonly key = "bitcoinsv" as const;
  readonly name = "Bitcoin SV";
  readonly symbol = "BSV";
  override readonly decimals = 8;
  readonly explorer = "https://whatsonchain.com";
  override readonly bip44 = 236;
  override readonly magic = "e3e1f3e8";
  override readonly pow = "sha256d";

  /**
   * Base58Check under 0x00 (`1...`), 25 bytes with the checksum verified. The node decodes
   * nothing else, no CashAddr and no Bech32, and since Genesis it rejects a transaction with a
   * pay-to-script-hash output as `bad-txns-vout-p2sh`, so a `3...` address has no BSV to receive.
   * The bytes are Bitcoin's own, and a `1...` address reads on both chains.
   *
   * @param {string} address - Candidate Bitcoin SV address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const fault = base58CheckFault(address, 35, legacyLayout(VERSIONS));
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * The kind behind the version byte, with the hash it pays to.
   *
   * @param {string} address - Candidate Bitcoin SV address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    return settle(this.key, address, legacyAddress(address, 35, VERSIONS));
  }
}
