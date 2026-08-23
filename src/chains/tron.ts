import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

export class Tron extends Chain {
  static readonly key = "tron" as const;
  readonly type = "tron" as const;
  readonly name = "TRON";
  readonly symbol = "TRX";
  readonly explorer = "https://tronscan.org";
  readonly bip44 = 195;
  readonly caip2 = "tron:0x2b6653dc";

  /**
   * A TRON address is Base58Check under version byte 0x41: the version, a
   * 20-byte hash and a 4-byte checksum, 25 bytes in all. Decoding is what keeps
   * the other base58 chains out - Bitcoin's legacy form is the same 25 bytes
   * under 0x00 or 0x05, and a 34-character window would take both. The checksum
   * stays unchecked: this is a format check.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 34);
    if (decoded?.length !== 25 || decoded[0] !== 0x41) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}

register(Tron);
