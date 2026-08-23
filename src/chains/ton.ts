import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

/**
 * TEP-2 user-friendly form: 36 bytes in unpadded base64, so exactly 48
 * characters. Wallets emit the URL-safe alphabet, but the standard one is in
 * circulation too, so both digit sets pass and are normalized before decoding.
 */
const FRIENDLY_ADDRESS = /^[A-Za-z0-9+/_-]{48}$/;

export class Ton extends Chain {
  static readonly key = "ton" as const;
  readonly type = "ton" as const;
  readonly name = "TON (The Open Network)";
  readonly symbol = "TON";
  readonly explorer = "https://tonscan.org";
  readonly bip44 = 607;
  readonly caip2 = "ton:-1";

  /**
   * The 36 bytes are a tag, a workchain id, the 32-byte account id and a CRC16.
   * The tag has to be 0x11 (bounceable) or 0x51 (non-bounceable); a set testnet
   * flag is rejected the way Bitcoin's testnet versions are. The workchain has
   * to be 0x00 (basechain) or 0xff (masterchain), the only two that exist. The
   * CRC stays unchecked: this is a format check. The raw `workchain:hex` form
   * is not accepted, because wallets and explorers exchange the friendly form.
   */
  override assertAddress(address: string): string {
    if (!FRIENDLY_ADDRESS.test(address)) throw new InvalidAddressError(this.key, address);
    const binary = atob(address.replaceAll("-", "+").replaceAll("_", "/"));
    const tag = binary.charCodeAt(0);
    const workchain = binary.charCodeAt(1);
    if ((tag !== 0x11 && tag !== 0x51) || (workchain !== 0x00 && workchain !== 0xff)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}

register(Ton);
