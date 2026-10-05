import { decodeBase58Check } from "./base58check.ts";
import type { Base58CheckLayout } from "./base58check.ts";
import type { Chain } from "./chain.ts";
import { AddressDecodingUnsupportedError, ChainsError } from "./errors.ts";
import { stripControlCharacters } from "./text.ts";
import type { ChainKey } from "./types.ts";

/** What an address pays to: a Bitcoin script template, another chain's own format, or an account. */
export type AddressKind =
  | "p2pkh"
  | "p2sh"
  | "p2wpkh"
  | "p2wsh"
  | "p2tr"
  | "p2a"
  | "witness"
  | "p2pk"
  | "tex"
  | "mweb"
  | "sapling"
  | "unified"
  | "byron"
  | "base"
  | "pointer"
  | "enterprise"
  | "reward"
  | "account";

/** The digest a payload came out of, so Decred's RIPEMD-160 of BLAKE-256 never passes for a HASH160. */
export type AddressHash = "hash160" | "hash256" | "sha256" | "ripemd160-blake256";

/** The signature scheme a Decred address commits to, read off its type bytes. */
export type AddressSignature = "ecdsa-secp256k1" | "ed25519" | "schnorr-secp256k1";

/** An address read back into what it pays to. */
export interface DecodedAddress {
  readonly kind: AddressKind;
  /** Lowercase hex of the one hash, witness program or key the address pays to, when it carries exactly one. */
  readonly payload?: string;
  /** Which digest produced the payload, absent when the payload is a key or a program. */
  readonly hash?: AddressHash;
  /** Witness version of a `witness` program no BIP names yet. */
  readonly version?: number;
  readonly signature?: AddressSignature;
  /** Set on the CashTokens-aware CashAddr types, which pay to the same hash as their plain twins. */
  readonly tokens?: true;
}

/** Base58Check version bytes a chain pays to, in the order its reason names them. */
export type LegacyVersions = readonly (readonly [number, "p2pkh" | "p2sh"])[];

/**
 * Bytes as lowercase hex, without leaning on `Uint8Array.prototype.toHex` that Node 24 lacks.
 * @param {ArrayLike<number>} bytes - Bytes to write.
 * @returns {string} Two digits a byte.
 */
export function toHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The layout `base58CheckFault` checks a legacy address against: 25 bytes under these versions.
 * @param {LegacyVersions} versions - Version bytes and the kinds behind them.
 * @returns {Base58CheckLayout} Width and version bytes.
 */
export function legacyLayout(versions: LegacyVersions): Base58CheckLayout {
  return { width: 25, versions: versions.map(([version]) => version) };
}

/**
 * Reads a one-byte-version Base58Check address into its kind and HASH160.
 * @param {string} address - Candidate address.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {LegacyVersions} versions - Version bytes and the kinds behind them.
 * @returns {DecodedAddress | undefined} The kind and hash, or undefined when it is not one of these.
 */
export function legacyAddress(
  address: string,
  maxLength: number,
  versions: LegacyVersions,
): DecodedAddress | undefined {
  const bytes = decodeBase58Check(address, maxLength);
  const kind = versions.find(([version]) => version === bytes?.[0])?.[1];
  if (bytes?.length !== 25 || kind === undefined) return undefined;
  return { kind, payload: toHex(bytes.subarray(1, 21)), hash: "hash160" };
}

/**
 * Hands back what a reader made of an address its chain's validator already accepted.
 * @param {ChainKey} chain - Chain that read it.
 * @param {string} address - The accepted address.
 * @param {DecodedAddress | undefined} decoded - What the reader made of it.
 * @returns {DecodedAddress} The decoded address.
 * @throws {ChainsError} When validator and reader disagree, which is a bug in this package.
 */
export function settle(
  chain: ChainKey,
  address: string,
  decoded: DecodedAddress | undefined,
): DecodedAddress {
  if (decoded === undefined) {
    throw new ChainsError(`${chain} accepted ${JSON.stringify(address)} but could not decode it`);
  }
  return decoded;
}

/**
 * One line naming what the address pays to, control characters blanked since a custom chain writes its own.
 * @param {Readonly<DecodedAddress> | undefined} decoded - The decoded address, if the chain could tell.
 * @returns {string | undefined} Kind, qualifiers and payload, as in `p2pkh, hash160 a955...`; nothing for an account.
 */
export function describeAddress(decoded: Readonly<DecodedAddress> | undefined): string | undefined {
  if (decoded === undefined || decoded.kind === "account") return undefined;
  const kind = decoded.version === undefined ? decoded.kind : `${decoded.kind} v${decoded.version}`;
  const qualifiers = [decoded.signature, decoded.tokens ? "CashTokens" : undefined].filter(Boolean);
  const head = qualifiers.length === 0 ? kind : `${kind} (${qualifiers.join(", ")})`;
  const line =
    decoded.payload === undefined
      ? head
      : `${head}, ${decoded.hash ?? "payload"} ${decoded.payload}`;
  return stripControlCharacters(line);
}

/**
 * Decodes the address, or only checks it on a custom UTXO chain that never said what it pays to.
 * @param {Readonly<Chain>} chain - Chain to read it on.
 * @param {string} address - Address to read.
 * @returns {DecodedAddress | undefined} What it pays to, when the chain can tell.
 */
export function decodeOrCheck(chain: Readonly<Chain>, address: string): DecodedAddress | undefined {
  try {
    return chain.decodeAddress(address);
  } catch (error) {
    if (!(error instanceof AddressDecodingUnsupportedError)) throw error;
    return undefined;
  }
}
