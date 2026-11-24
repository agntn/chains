import { fromWordsUnsafe } from "@agntn/encodings/bech32";
import { checkedWords, readBech32Digits } from "../core/bech32.ts";
import { Chain } from "../core/chain.ts";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.ts";
import { hexTxidFault } from "../core/txid.ts";

/** The Hub's account prefix; validators and consensus keys get longer ones. */
const PREFIX = "cosmos";

/** A 32-byte payload is 52 digits, and the checksum takes six more. */
const MAX_DIGITS = 58;

/** Key hashes and module accounts take 20 bytes, contracts and ADR-028 accounts 32. */
const WIDTHS: readonly number[] = [20, 32];

/**
 * Every rule a Hub account address breaks, the checksum last.
 * @param {string} address - Candidate address.
 * @returns {string | undefined} The faults joined, or undefined when it holds.
 */
function addressFault(address: string): string | undefined {
  const { digits, faults } = readBech32Digits(address, PREFIX, MAX_DIGITS);
  if (digits !== undefined) {
    const bytes = fromWordsUnsafe(digits.slice(0, -6));
    if (bytes === undefined) {
      faults.push("digits that do not pack into whole bytes with zero padding");
    } else if (!WIDTHS.includes(bytes.length)) {
      faults.push(`decodes to ${bytes.length} bytes, not 20 or 32`);
    }
    if (checkedWords(address) === undefined) {
      faults.push("the Bech32 checksum does not hold, so a character is wrong");
    }
  }
  return faults.length === 0 ? undefined : faults.join("; ");
}

/** Cosmos Hub, the chain behind ATOM and the `cosmos1` prefix. */
export class Cosmos extends Chain {
  static readonly key = "cosmos" as const;
  readonly type = "cosmos" as const;
  readonly name = "Cosmos Hub";
  readonly symbol = "ATOM";
  override readonly decimals = 6;
  readonly explorer = "https://www.mintscan.io/cosmos";
  override readonly bip44 = 118;
  override readonly caip2 = "cosmos:cosmoshub-4";
  override readonly rpcDefault = "https://cosmos-rpc.publicnode.com";

  /**
   * Bech32 under `cosmos` with the checksum, over 20 or 32 bytes. Validator addresses fail.
   *
   * @param {string} address - Candidate Cosmos Hub address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const fault = addressFault(address);
    if (fault !== undefined) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }

  /**
   * SHA-256 of the signed transaction, 64 hex digits; nodes write uppercase and read either.
   *
   * @param {string} txid - Candidate Cosmos Hub transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    const fault = hexTxidFault(txid);
    if (fault) throw new InvalidTxidError(this.key, txid, fault);
    return txid;
  }
}
