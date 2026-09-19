import { Chain } from "../core/chain.js";
import { crc16Xmodem } from "../core/crc16.js";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.js";

/**
 * TEP-2 user-friendly form: 36 bytes in unpadded base64, so exactly 48
 * characters. Wallets emit the URL-safe alphabet, but the standard one is in
 * circulation too, so both digit sets pass and are normalized before decoding.
 */
const FRIENDLY_ADDRESS = /^[A-Za-z0-9+/_-]{48}$/;

/** The 32-byte transaction hash as `hash().toString("hex")` and tonapi write it, either case. */
const HEX_TXID = /^[0-9a-fA-F]{64}$/;
/**
 * The same 32 bytes in base64 with their one `=`, toncenter's alphabet or tonscan's
 * URL-safe one but never both in one string, which toncenter refuses as well; the 43rd
 * digit carries four bits, so its two spare bits have to be zero.
 */
const BASE64_TXID = /^(?:[A-Za-z0-9+/]{42}|[A-Za-z0-9_-]{42})[AEIMQUYcgkosw048]=$/;

/**
 * Decodes the 36 bytes behind a friendly address, or undefined when the text is not
 * one or its checksum does not hold: the last two bytes are the CRC-16/XMODEM of the
 * 34 before them, big-endian.
 *
 * @param {string} address - Candidate TON user-friendly address.
 * @returns {Uint8Array | undefined} Tag, workchain, account id and CRC16, or undefined.
 */
function friendlyBytes(address: string): Uint8Array | undefined {
  if (!FRIENDLY_ADDRESS.test(address)) return undefined;
  const binary = atob(address.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
  const checksum = crc16Xmodem(bytes.subarray(0, 34));
  return bytes[34] === checksum >> 8 && bytes[35] === (checksum & 0xff) ? bytes : undefined;
}

export class Ton extends Chain {
  static readonly key = "ton" as const;
  readonly type = "ton" as const;
  readonly name = "TON (The Open Network)";
  readonly symbol = "TON";
  override readonly decimals = 9;
  readonly explorer = "https://tonscan.org";
  readonly bip44 = 607;
  /** The mainnet global_id, the id TON Connect and WalletConnect carry; -1 is a workchain. */
  readonly caip2 = "ton:-239";

  /**
   * The 36 bytes are a tag, a workchain id, the 32-byte account id and a CRC16.
   * The tag has to be 0x11 (bounceable) or 0x51 (non-bounceable); a set testnet
   * flag is rejected the way Bitcoin's testnet versions are. The workchain has
   * to be 0x00 (basechain) or 0xff (masterchain), the only two that exist. The
   * CRC16 is verified, so one character off fails, which is what TEP-2 puts it
   * there for. The raw `workchain:hex` form is not accepted, because wallets
   * and explorers exchange the friendly form.
   *
   * @param {string} address - Candidate TON user-friendly address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const bytes = friendlyBytes(address);
    if (bytes === undefined) throw new InvalidAddressError(this.key, address);
    const [tag, workchain] = bytes;
    if ((tag !== 0x11 && tag !== 0x51) || (workchain !== 0x00 && workchain !== 0xff)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * Both encodings the network's own tools write; the unpadded form toncenter also
   * reads is written by none of them and stays out.
   *
   * @param {string} txid - Candidate TON transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    if (!HEX_TXID.test(txid) && !BASE64_TXID.test(txid)) {
      throw new InvalidTxidError(this.key, txid);
    }
    return txid;
  }
}
