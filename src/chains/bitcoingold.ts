import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitFault, segwitShaped } from "../core/segwit.ts";

export class BitcoinGold extends UTXO {
  static readonly key = "bitcoingold" as const;
  readonly name = "Bitcoin Gold";
  readonly symbol = "BTG";
  override readonly decimals = 8;
  readonly explorer = "https://btgexplorer.com";
  readonly bip44 = 156;
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
    const legacy = base58CheckFault(address, 35, { width: 25, versions: [0x26, 0x17] });
    const fault = legacy && segwitShaped(address, "btg") ? segwitFault(address, "btg") : legacy;
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }
}
