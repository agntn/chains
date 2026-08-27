import { createHash } from "node:crypto";

import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3] as const;
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

// BIP-173 charset, which drops 1, b, i and o so they cannot be misread. An address
// is all-lowercase or all-uppercase — uppercase is what QR encoders emit — and mixed
// case is invalid, so the two cases are separate alternatives rather than a flag.
const BECH32_ADDRESS =
  /^(bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,59}|BC1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{39,59})$/;

function doubleSha256(data: Uint8Array): Uint8Array {
  const first = createHash("sha256").update(data).digest();
  return createHash("sha256").update(first).digest();
}

function validateBase58Check(decoded: Uint8Array): boolean {
  if (decoded.length !== 25) return false;
  if (decoded[0] !== 0x00 && decoded[0] !== 0x05) return false;
  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21, 25);
  const computed = doubleSha256(payload).subarray(0, 4);
  return (
    checksum[0] === computed[0] &&
    checksum[1] === computed[1] &&
    checksum[2] === computed[2] &&
    checksum[3] === computed[3]
  );
}

function bech32Polymod(values: readonly number[]): number {
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) {
        chk ^= BECH32_GENERATOR[i] ?? 0;
      }
    }
  }
  return chk;
}

function validateBech32(address: string): boolean {
  if (!BECH32_ADDRESS.test(address)) return false;
  const lower = address.toLowerCase();
  const dataPart = lower.slice(3);
  const values: number[] = [3, 3, 0, 2, 3];
  for (let i = 0; i < dataPart.length; i++) {
    const d = BECH32_CHARSET.indexOf(dataPart[i] ?? "");
    if (d === -1) return false;
    values.push(d);
  }

  const poly = bech32Polymod(values);
  const version = values[5];
  if (version === 0) {
    return poly === BECH32_CONST;
  }
  return poly === BECH32M_CONST;
}

export class Bitcoin extends Chain {
  static readonly key = "bitcoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  readonly explorer = "https://blockstream.info";
  readonly bip44 = 0;
  readonly caip2 = "bip122:000000000019d6689c085ae165831e93";

  /**
   * Validates both legacy Base58Check and SegWit Bech32/Bech32m addresses.
   *
   * A legacy address is Base58Check: a version byte (0x00 pay-to-pubkey-hash,
   * 0x05 pay-to-script-hash), a 20-byte hash and a 4-byte checksum, 25 bytes in
   * all. The 4-byte checksum is verified against double SHA-256 of the payload.
   *
   * Native SegWit and Taproot addresses are Bech32/Bech32m encoded under the
   * `bc` prefix and verified via polymod checksum calculation (BIP-173 for
   * witness version 0, BIP-350 for witness versions 1-16).
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 35);
    const legacy = decoded ? validateBase58Check(decoded) : false;
    if (!legacy && !validateBech32(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
