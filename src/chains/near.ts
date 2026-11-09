import { decodeBase58 } from "../core/base58.ts";
import { Chain } from "../core/chain.ts";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.ts";

/** The whole AccountId grammar, read the way `validate` in near-account-id-rs reads it. */
const ACCOUNT_ID = /^[a-z\d]+(?:[-_.][a-z\d]+)*$/;
const ACCOUNT_CHARACTERS = /^[a-z\d\-_.]*$/;

/** The typed forms of `get_account_type`; a universal one keeps its padding bits at zero. */
const TYPED_ACCOUNT = /^(?:0x[\da-f]{40}|[\da-f]{64}|0s[\da-f]{40}|0u[\da-hjkmnp-tv-z]{51}[0g])$/;

/**
 * Says which AccountId rule a string breaks, in `validate`'s order.
 *
 * @param {string} address - A string the grammar refused.
 * @returns {string} The rule it breaks.
 */
function accountFault(address: string): string {
  if (address.length < 2) return "shorter than the 2 characters an account ID needs";
  if (address.length > 64) return `${address.length} characters, over the 64 an account ID allows`;
  if (!ACCOUNT_CHARACTERS.test(address)) {
    return /[A-Z]/.test(address)
      ? "uppercase letters, and an account ID is lowercase only"
      : "characters outside a-z, 0-9, '-', '_' and '.'";
  }
  return "a '-', '_' or '.' at either end or two in a row";
}

/** NEAR Protocol, whose addresses are account IDs: names like `alice.near` and implicit keys. */
export class Near extends Chain {
  static readonly key = "near" as const;
  readonly type = "near" as const;
  readonly name = "NEAR Protocol";
  readonly symbol = "NEAR";
  override readonly decimals = 24;
  readonly explorer = "https://nearblocks.io";
  override readonly bip44 = 397;
  override readonly caip2 = "near:mainnet";
  override readonly rpcDefault = "https://rpc.mainnet.near.org";

  /**
   * Any account ID the protocol takes, a bare top-level name like `aurora` included.
   *
   * @param {string} address - Candidate account ID.
   * @returns {string} The accepted account ID unchanged.
   */
  override assertAddress(address: string): string {
    if (address.length < 2 || address.length > 64 || !ACCOUNT_ID.test(address)) {
      throw new InvalidAddressError(this.key, address, accountFault(address));
    }
    return address;
  }

  /**
   * The grammar takes `bc1…` too, so identify gets only dotted names and the typed forms.
   *
   * @param {string} address - An account ID {@link assertAddress} accepted.
   * @returns {boolean} Whether the address has a dot or one of the typed forms.
   */
  override claimsAddress(address: string): boolean {
    return address.includes(".") || TYPED_ACCOUNT.test(address);
  }

  /**
   * A 32-byte `CryptoHash` in base58, read the way `CryptoHash::from_str` reads it.
   *
   * @param {string} txid - Candidate NEAR transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    const bytes = decodeBase58(txid, 44);
    if (bytes?.length !== 32) {
      throw new InvalidTxidError(
        this.key,
        txid,
        bytes
          ? `decodes to ${bytes.length} bytes, not the 32 of a hash`
          : "not base58 of at most 44 characters",
      );
    }
    return txid;
  }
}
