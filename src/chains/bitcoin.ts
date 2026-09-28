import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";
import { segwitFault } from "../core/segwit.ts";

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
    const fault = /^bc1/i.test(address)
      ? segwitFault(address, "bc")
      : base58CheckFault(address, 35, { width: 25, versions: [0x00, 0x05] });
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }
}
