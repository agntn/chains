import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

/**
 * CIP-19 Shelley addresses under the mainnet prefix. Cardano waives BIP-173's
 * 90-character cap, so the bounds come from the 29 to 57 byte payloads.
 */
const SHELLEY_ADDRESS =
  /^(addr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{53,98}|ADDR1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{53,98})$/;

/** A stake address is always one 29-byte payload, so one data-part length. */
const STAKE_ADDRESS =
  /^(stake1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{53}|STAKE1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{53})$/;

export class Cardano extends Chain {
  static readonly key = "cardano" as const;
  readonly type = "utxo" as const;
  readonly name = "Cardano";
  readonly symbol = "ADA";
  readonly explorer = "https://cardanoscan.io";
  readonly bip44 = 1815;
  readonly caip2 = "cip34:1-764824073";

  /**
   * A format check: the bech32 checksum and the Byron CRC stay unverified,
   * and a Byron testnet address passes because its network hides in a CBOR
   * attribute this check does not open.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 128);
    const overhead = decoded ? decoded.length - (decoded[4] ?? 0) : 0;
    const byron =
      decoded !== undefined &&
      decoded[0] === 0x82 &&
      decoded[1] === 0xd8 &&
      decoded[2] === 0x18 &&
      decoded[3] === 0x58 &&
      overhead >= 6 &&
      overhead <= 10;
    if (!byron && !SHELLEY_ADDRESS.test(address) && !STAKE_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}

register(Cardano);
