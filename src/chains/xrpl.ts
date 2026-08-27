import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/** The ledger's base58 digits: Bitcoin's 58 characters reordered, so `r` is zero. */
export const XRP_ALPHABET = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

/**
 * An X-address folds a destination tag in: prefix, 20-byte account, flag byte, eight tag
 * bytes, checksum. XLS-5 requires the bytes the flag does not use to be zero, so flag 0
 * leaves all eight and flag 1 the top four. TAG_64 is reserved and testnet is 0x04 0x93.
 */
function isXAddress(decoded: Uint8Array): boolean {
  if (decoded.length !== 35 || decoded[0] !== 0x05 || decoded[1] !== 0x44) return false;
  const flag = decoded[22];
  if (flag !== 0 && flag !== 1) return false;
  return decoded.subarray(flag === 0 ? 23 : 27, 31).every((byte) => byte === 0);
}

export class Xrpl extends Chain {
  static readonly key = "xrpl" as const;
  readonly type = "xrpl" as const;
  readonly name = "XRP Ledger";
  readonly symbol = "XRP";
  readonly explorer = "https://livenet.xrpl.org";
  readonly bip44 = 144;
  readonly caip2 = "xrpl:0";

  /**
   * A classic address is Base58Check under version 0x00, 25 bytes, read under the
   * ledger's alphabet, which is what keeps Bitcoin and TRON out. The checksum stays
   * unchecked, and 48 characters is one past the longest address the format writes.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 48, XRP_ALPHABET);
    if (decoded === undefined) throw new InvalidAddressError(this.key, address);
    const classic = decoded.length === 25 && decoded[0] === 0x00;
    if (!classic && !isXAddress(decoded)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
