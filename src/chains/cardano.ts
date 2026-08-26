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

/**
 * The Byron envelope: array(2), tag(24), bytes opening as the three-item
 * array with its 28-byte root, then a CRC head matching the bytes it
 * claims. Attributes, type and the CRC value stay unparsed on purpose.
 */
function isByronEnvelope(decoded: Uint8Array): boolean {
  if (decoded[0] !== 0x82 || decoded[1] !== 0xd8 || decoded[2] !== 0x18 || decoded[3] !== 0x58) {
    return false;
  }
  const payloadLength = decoded[4] ?? 0;
  if (payloadLength < 33) return false;
  if (decoded[5] !== 0x83 || decoded[6] !== 0x58 || decoded[7] !== 0x1c) return false;
  const head = decoded[5 + payloadLength];
  if (head === undefined) return false;
  const crcBytes = head <= 0x17 ? 1 : head === 0x18 ? 2 : head === 0x19 ? 3 : head === 0x1a ? 5 : 0;
  return crcBytes > 0 && decoded.length === 5 + payloadLength + crcBytes;
}

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
    const byron = decoded !== undefined && isByronEnvelope(decoded);
    if (!byron && !SHELLEY_ADDRESS.test(address) && !STAKE_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}

register(Cardano);
