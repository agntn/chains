import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const PREFIX = "oct";
/** The node pads every numeral to this width, so no other length is an address. */
const BODY_LENGTH = 44;
const HASH_BYTES = 32;

/**
 * Whether the body is a base58 numeral small enough to be a 32-byte hash.
 *
 * The padding is width rather than bytes: a "1" the encoder never wrote for a
 * leading zero byte still decodes as one, so a padded address decodes longer
 * than the hash it carries and a plain decoded-length check would reject it.
 * What has to fit in 32 bytes is the numeral behind the padding, and 44
 * characters reach past 2^256, so the fixed width alone leaves the top open.
 */
function carriesHash(body: string): boolean {
  const decoded = decodeBase58(body, BODY_LENGTH);
  if (decoded === undefined) return false;

  let padding = 0;
  while (body[padding] === "1") padding++;
  return decoded.length - padding <= HASH_BYTES;
}

export class Octra extends Chain {
  static readonly key = "octra" as const;
  readonly type = "octra" as const;
  readonly name = "Octra";
  readonly symbol = "OCT";
  readonly explorer = "https://octrascan.io";
  readonly rpcDefault = "https://octra.network/rpc";

  /**
   * `oct` and base58 of the 32-byte SHA-256 hash of the public key, left padded
   * with "1" to a fixed 44 characters. The node writes every address that way
   * and accepts nothing else, so an address is 47 characters exactly. A window
   * around that width calls a truncated address valid, which is the one answer
   * a caller about to send funds cannot afford.
   */
  override assertAddress(address: string): string {
    const body = address.startsWith(PREFIX) ? address.slice(PREFIX.length) : "";
    if (body.length !== BODY_LENGTH || !carriesHash(body)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
