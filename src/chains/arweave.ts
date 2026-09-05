import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/** A 32-byte hash in unpadded base64url has two unused zero bits in its last digit. */
const ADDRESS = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

/** Arweave mainnet with canonical base64url addresses, without a CRC suffix. */
export class Arweave extends Chain {
  static readonly key = "arweave" as const;
  readonly type = "arweave" as const;
  readonly name = "Arweave";
  readonly symbol = "AR";
  override readonly decimals = 12;
  readonly bip44 = 472;
  readonly caip2 = "arweave:7wIU";
  readonly explorer = "https://viewblock.io/arweave";
  readonly rpcDefault = "https://arweave.net";

  /**
   * Checks the canonical encoding, not whether the hash belongs to a wallet.
   * @param {string} address - Candidate Arweave address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    if (!ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
