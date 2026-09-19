import { decodeBase58Check } from "../core/base58check.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.js";

/** The ledger's base58 digits: Bitcoin's 58 characters reordered, so `r` is zero. */
export const XRP_ALPHABET = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

/**
 * SHA-512Half of the signed transaction: 64 hex digits, uppercase as rippled writes them and
 * either case as its `parseHex` reads them.
 */
const TXID = /^[0-9a-fA-F]{64}$/;

function containsOnlyZeroes(bytes: ArrayLike<number>, start: number, end: number): boolean {
  for (let index = start; index < end; index++) {
    if (bytes[index] !== 0) return false;
  }
  return true;
}

/**
 * An X-address folds a destination tag in: prefix, 20-byte account, flag byte, eight tag
 * bytes, checksum. XLS-5 requires the bytes the flag does not use to be zero, so flag 0
 * leaves all eight and flag 1 the top four. TAG_64 is reserved and testnet is 0x04 0x93.
 *
 * @param {ArrayLike<number>} decoded - Candidate decoded X-address bytes.
 * @returns {boolean} Whether the bytes have a valid mainnet X-address envelope.
 */
function isXAddress(decoded: ArrayLike<number>): boolean {
  if (decoded.length !== 35 || decoded[0] !== 0x05 || decoded[1] !== 0x44) return false;
  const flag = decoded[22];
  if (flag !== 0 && flag !== 1) return false;
  return containsOnlyZeroes(decoded, flag === 0 ? 23 : 27, 31);
}

export class Xrpl extends Chain {
  static readonly key = "xrpl" as const;
  readonly type = "xrpl" as const;
  readonly name = "XRP Ledger";
  readonly symbol = "XRP";
  override readonly decimals = 6;
  readonly explorer = "https://livenet.xrpl.org";
  readonly bip44 = 144;
  readonly caip2 = "xrpl:0";

  /**
   * A classic address is Base58Check under version 0x00, 25 bytes, read under the
   * ledger's alphabet, which is what keeps Bitcoin and TRON out. The checksum is verified
   * on both forms, and 48 characters is one past the longest address the format writes.
   *
   * @param {string} address - Candidate XRP Ledger address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 48, XRP_ALPHABET);
    if (decoded === undefined) throw new InvalidAddressError(this.key, address);
    const classic = decoded.length === 25 && decoded[0] === 0x00;
    if (!classic && !isXAddress(decoded)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * The hash only. A CTID (XLS-37) locates a transaction too, but rippled takes it as
   * a separate parameter, not as the transaction hash.
   *
   * @param {string} txid - Candidate XRP Ledger transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    if (!TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}
