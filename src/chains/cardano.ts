import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/**
 * CIP-19 Shelley addresses under the mainnet prefix. Cardano waives BIP-173's
 * 90-character cap, so the bounds come from the 29 to 57 byte payloads.
 */
const SHELLEY_ADDRESS =
  /^(addr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{53,98}|ADDR1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{53,98})$/;

/** A stake address is always one 29-byte payload, so one data-part length. */
const STAKE_ADDRESS =
  /^(stake1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{53}|STAKE1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{53})$/;

const BYRON_ENVELOPE_PREFIX = [0x82, 0xd8, 0x18, 0x58] as const;
const BYRON_PAYLOAD_PREFIX = [0x83, 0x58, 0x1c] as const;

function hasBytesAt(decoded: ArrayLike<number>, expected: readonly number[], offset = 0): boolean {
  return expected.every((byte, index) => decoded[offset + index] === byte);
}

function cborUnsignedLength(head: number): number {
  if (head <= 0x17) return 1;
  if (head === 0x18) return 2;
  if (head === 0x19) return 3;
  if (head === 0x1a) return 5;
  return 0;
}

/**
 * The Byron envelope: array(2), tag(24), bytes opening as the three-item
 * array with its 28-byte root, then a CRC head matching the bytes it
 * claims. Attributes, type and the CRC value stay unparsed on purpose.
 *
 * @param {ArrayLike<number>} decoded - Candidate decoded Byron address bytes.
 * @returns {boolean} Whether the bytes have the expected Byron CBOR envelope.
 */
function isByronEnvelope(decoded: ArrayLike<number>): boolean {
  if (!hasBytesAt(decoded, BYRON_ENVELOPE_PREFIX)) return false;

  const payloadLength = decoded[4] ?? 0;
  if (payloadLength < 33 || !hasBytesAt(decoded, BYRON_PAYLOAD_PREFIX, 5)) return false;

  const head = decoded[5 + payloadLength];
  if (head === undefined) return false;

  const crcBytes = cborUnsignedLength(head);
  return crcBytes > 0 && decoded.length === 5 + payloadLength + crcBytes;
}

export class Cardano extends Chain {
  static readonly key = "cardano" as const;
  readonly type = "utxo" as const;
  readonly name = "Cardano";
  readonly symbol = "ADA";
  override readonly decimals = 6;
  readonly explorer = "https://cardanoscan.io";
  readonly bip44 = 1815;
  readonly caip2 = "cip34:1-764824073";

  /**
   * A format check: the bech32 checksum and the Byron CRC stay unverified,
   * and a Byron testnet address passes because its network hides in a CBOR
   * attribute this check does not open.
   *
   * @param {string} address - Candidate Cardano address.
   * @returns {string} The accepted address unchanged.
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
