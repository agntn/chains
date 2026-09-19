import { decodeBase58Check } from "../core/base58check.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.js";

/** SHA-256 of `raw_data` as java-tron writes it, 64 hex digits; the node reads either case. */
const TXID = /^[0-9a-fA-F]{64}$/;

export class Tron extends Chain {
  static readonly key = "tron" as const;
  readonly type = "tron" as const;
  readonly name = "TRON";
  readonly symbol = "TRX";
  override readonly decimals = 6;
  readonly explorer = "https://tronscan.org";
  readonly bip44 = 195;
  readonly caip2 = "tron:0x2b6653dc";

  /**
   * A TRON address is Base58Check under version byte 0x41: the version, a
   * 20-byte hash and a 4-byte checksum, 25 bytes in all. Decoding is what keeps
   * the other base58 chains out - Bitcoin's legacy form is the same 25 bytes
   * under 0x00 or 0x05, and a 34-character window would take both. The checksum is
   * verified, so one wrong character is a rejection rather than a different address.
   *
   * @param {string} address - Candidate TRON address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 34);
    if (decoded?.length !== 25 || decoded[0] !== 0x41) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * No `0x`: the node strips one when it reads, but nothing on TRON writes one.
   *
   * @param {string} txid - Candidate TRON transaction id.
   * @returns {string} The accepted txid unchanged.
   */
  override assertTxid(txid: string): string {
    if (!TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}
