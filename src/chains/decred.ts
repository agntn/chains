import { settle, toHex } from "../core/address.ts";
import type { AddressSignature, DecodedAddress } from "../core/address.ts";
import { BITCOIN_ALPHABET } from "../core/base58.ts";
import { decodeBase58Check, readBase58Check } from "../core/base58check.ts";
import { blake256 } from "../core/blake256.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

/**
 * The leading bytes of every mainnet address dcrd's version 0 encoders write, by decoded
 * length: 0x07 and the hash address type, or 0x13 0x86 and a public key's signature selector.
 */
const LAYOUTS: Readonly<Record<number, readonly (readonly number[])[]>> = {
  26: [
    [0x07, 0x3f],
    [0x07, 0x1f],
    [0x07, 0x01],
    [0x07, 0x1a],
  ],
  39: [
    [0x13, 0x86, 0x00],
    [0x13, 0x86, 0x80],
    [0x13, 0x86, 0x01],
    [0x13, 0x86, 0x02],
    [0x13, 0x86, 0x82],
  ],
};

/**
 * Checks the decoded bytes against those layouts.
 * @param {ArrayLike<number>} bytes - Decoded address, checksum included.
 * @returns {string | undefined} The fault, or undefined for an address dcrd writes.
 */
function layoutFault(bytes: ArrayLike<number>): string | undefined {
  const prefixes = LAYOUTS[bytes.length];
  if (prefixes === undefined) return `decodes to ${bytes.length} bytes, not 26 or 39`;
  const known = prefixes.some((prefix) => prefix.every((byte, index) => bytes[index] === byte));
  return known ? undefined : "version bytes that name no mainnet address type dcrd writes";
}

/** What the second byte of a 26-byte address pays to, as dcrd's `stdaddr` names the four types. */
const HASH_TYPES: Readonly<Record<number, Omit<DecodedAddress, "payload">>> = {
  0x3f: { kind: "p2pkh", hash: "ripemd160-blake256", signature: "ecdsa-secp256k1" },
  0x1f: { kind: "p2pkh", hash: "ripemd160-blake256", signature: "ed25519" },
  0x01: { kind: "p2pkh", hash: "ripemd160-blake256", signature: "schnorr-secp256k1" },
  0x1a: { kind: "p2sh", hash: "ripemd160-blake256" },
};

/** The selector of a public key address, its high bit the parity of a secp256k1 key's y. */
const KEY_SIGNATURES: readonly AddressSignature[] = [
  "ecdsa-secp256k1",
  "ed25519",
  "schnorr-secp256k1",
];

/**
 * Reads the bytes behind an address `layoutFault` already passed.
 * @param {readonly number[]} bytes - Decoded address, checksum included.
 * @returns {DecodedAddress | undefined} Kind, scheme and the hash or the public key.
 */
function decodeLayout(bytes: readonly number[]): DecodedAddress | undefined {
  if (bytes.length === 26) {
    const type = HASH_TYPES[bytes[1] ?? 0];
    return type && { ...type, payload: toHex(bytes.slice(2, 22)) };
  }
  const selector = bytes[2] ?? 0;
  const signature = KEY_SIGNATURES[selector & 0x7f];
  const key = toHex(bytes.slice(3, 35));
  if (signature === undefined) return undefined;
  const prefix = signature === "ed25519" ? "" : selector & 0x80 ? "03" : "02";
  return { kind: "p2pk", payload: prefix + key, signature };
}

/** Decred mainnet; network and address types follow dcrd's version 0 encoders. */
export class Decred extends UTXO {
  static readonly key = "decred" as const;
  readonly name = "Decred";
  readonly symbol = "DCR";
  override readonly decimals = 8;
  readonly explorer = "https://dcrdata.decred.org";
  readonly bip44 = 42;
  override readonly magic = "f900b4d9";
  override readonly pow = "blake3";

  /**
   * Base58Check under dcrd's two version bytes with the BLAKE-256 checksum verified, so one
   * character off fails. The curve point behind a public key address stays unchecked.
   * @param {string} address - Candidate Decred address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const { bytes, faults } = readBase58Check(address, 54, BITCOIN_ALPHABET, blake256);
    const layout = bytes !== undefined && bytes.length >= 4 ? layoutFault(bytes) : undefined;
    if (layout) faults.unshift(layout);
    if (faults.length > 0) throw new InvalidAddressError(this.key, address, faults.join("; "));
    return address;
  }

  /**
   * Kind and signature scheme from the type bytes; a hash is RIPEMD-160 of BLAKE-256, never a HASH160.
   *
   * @param {string} address - Candidate Decred address.
   * @returns {DecodedAddress} Kind, scheme and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    const bytes = decodeBase58Check(address, 54, BITCOIN_ALPHABET, blake256);
    return settle(this.key, address, bytes && decodeLayout([...bytes]));
  }
}
