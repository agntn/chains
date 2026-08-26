import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

// CIP-19 Shelley addresses under the CIP-5 mainnet prefix, in the same BIP-173
// charset and casing rules as Bitcoin. Cardano waives the 90-character cap, so
// the bounds come from the payloads instead: 29 bytes for an enterprise
// address up to 57 for a base address, plus the six checksum characters.
const SHELLEY_ADDRESS =
  /^(addr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{53,98}|ADDR1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{53,98})$/;

// A stake address is always one 29-byte payload: header plus a 28-byte key or
// script hash, so its data part has exactly one length.
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
   * Two eras, two encodings. Shelley payment and stake addresses are bech32
   * under the mainnet prefixes, checked by the patterns above; the testnet
   * prefixes stay out the way Bitcoin's testnet versions do. A Byron address
   * is base58 over a CBOR envelope: `82` array(2), `d8 18` tag(24), `58` and
   * a length byte, the payload, then a CRC integer whose head shrinks with
   * its value, leaving 6 to 10 envelope bytes around the payload. Decoding
   * that structure is what keeps every other base58 format out. The CRC and
   * the bech32 checksum stay unchecked, this is a format check, and a Byron
   * address hides its network in an attribute a format check does not open.
   * The decode bound covers the 114-character Byron example in CIP-19.
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
