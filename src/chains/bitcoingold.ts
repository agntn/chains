import { decodeBase58Check } from "../core/base58check.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { validSegwitAddress } from "../core/segwit.js";

export class BitcoinGold extends UTXO {
  static readonly key = "bitcoingold" as const;
  readonly name = "Bitcoin Gold";
  readonly symbol = "BTG";
  override readonly decimals = 8;
  readonly explorer = "https://btgexplorer.com";
  readonly bip44 = 156;

  /**
   * SegWit under `btg` and Base58Check under 0x26 (`G...`) or 0x17 (`A...`), checksum included.
   * The fork moved both version bytes off Bitcoin's, so no legacy address reads on both chains,
   * and its node decodes witness programs by Bitcoin Core 0.21's rules, Bech32m for v1 and up.
   *
   * @param {string} address - Candidate Bitcoin Gold address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x26 || decoded[0] === 0x17);
    if (!legacy && !validSegwitAddress(address, "btg")) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
