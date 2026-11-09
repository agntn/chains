import { blake2b } from "@agntn/hashes/blake2b";
import { keccak256 } from "@agntn/hashes/keccak";
import { base58TextFaults, decodeBase58 } from "../core/base58.ts";
import { Chain } from "../core/chain.ts";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.ts";

/** Entity type, chain byte, a 20-byte hash and a 4-byte checksum. */
const WIDTH = 26;

/** The most base58 digits 26 bytes can take. */
const MAX_LENGTH = 36;

/** `W`, the chain byte every mainnet address carries. */
const MAINNET = 0x57;

/** The other networks the Waves node ships, keyed by their chain byte. */
const NETWORKS: Readonly<Record<number, string>> = { 0x54: "testnet", 0x53: "stagenet" };

/** Genesis and payment ids are 64-byte signatures, every later transaction a 32-byte hash. */
const TXID_WIDTHS: readonly number[] = [32, 64];

/** The most base58 digits a 64-byte signature takes. */
const TXID_MAX_LENGTH = 88;

/**
 * Keccak-256 of BLAKE2b-256, four bytes. Not Base58Check, which runs one hash twice.
 * @param {readonly number[]} bytes - The whole decoded address.
 * @returns {boolean} Whether the last four bytes are the head of that hash over the rest.
 */
function holdsChecksum(bytes: readonly number[]): boolean {
  const digest = keccak256(blake2b(Uint8Array.from(bytes.slice(0, -4)), 32));
  return bytes.slice(-4).every((byte, index) => byte === digest[index]);
}

/**
 * Names a chain byte that isn't mainnet's, by network when the node knows it.
 * @param {number} byte - The second byte of the address.
 * @returns {string} The fault.
 */
function chainFault(byte: number): string {
  const network = NETWORKS[byte];
  const shown = byte >= 0x21 && byte <= 0x7e ? JSON.stringify(String.fromCodePoint(byte)) : byte;
  const where = network === undefined ? "" : `, Waves ${network}`;
  return `chain byte ${shown}${where}, where mainnet writes "W"`;
}

/**
 * Every rule the decoded bytes break, layout first and the checksum last, as Base58Check does it.
 * @param {readonly number[]} bytes - The decoded address.
 * @returns {string[]} The faults, empty for a mainnet address.
 */
function layoutFaults(bytes: readonly number[]): string[] {
  if (bytes.length < 5) return ["too short to carry a checksum"];
  const faults: string[] = [];
  if (bytes.length !== WIDTH) faults.push(`decodes to ${bytes.length} bytes, not ${WIDTH}`);
  if (bytes[0] !== 1) faults.push(`entity type ${bytes[0] ?? 0}, where an address writes 1`);
  if (bytes[1] !== MAINNET) faults.push(chainFault(bytes[1] ?? 0));
  if (!holdsChecksum(bytes)) faults.push("the checksum does not hold, so a character is wrong");
  return faults;
}

/**
 * Says what is wrong with a Waves address, or nothing when it holds.
 * @param {string} address - Candidate address.
 * @returns {string | undefined} The faults joined, or undefined for a mainnet address.
 */
function addressFault(address: string): string | undefined {
  const bytes = decodeBase58(address, MAX_LENGTH);
  const faults =
    bytes === undefined ? base58TextFaults(address, MAX_LENGTH) : layoutFaults(Array.from(bytes));
  return faults.length === 0 ? undefined : faults.join("; ");
}

/** Waves mainnet, whose addresses all start with `3P`. */
export class Waves extends Chain {
  static readonly key = "waves" as const;
  readonly type = "waves" as const;
  readonly name = "Waves";
  readonly symbol = "WAVES";
  override readonly decimals = 8;
  readonly explorer = "https://wavesexplorer.com";
  override readonly bip44 = 5741564;
  override readonly caip2 = "waves:087";
  override readonly rpcDefault = "https://nodes.wavesnodes.com";

  /**
   * Entity type 1, chain byte `W`, a key hash and the checksum in 26 base58 bytes. Testnet fails.
   *
   * @param {string} address - Candidate Waves address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const fault = addressFault(address);
    if (fault !== undefined) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * Base58 of 32 bytes, or 64, the two widths the node's `TransactionId` path reads.
   *
   * @param {string} txid - Candidate Waves transaction id.
   * @returns {string} The accepted id unchanged.
   */
  override assertTxid(txid: string): string {
    const bytes = decodeBase58(txid, TXID_MAX_LENGTH);
    if (bytes === undefined || !TXID_WIDTHS.includes(bytes.length)) {
      throw new InvalidTxidError(
        this.key,
        txid,
        bytes
          ? `decodes to ${bytes.length} bytes, not 32, or 64 for a genesis or payment`
          : `not base58 of at most ${TXID_MAX_LENGTH} characters`,
      );
    }
    return txid;
  }
}
