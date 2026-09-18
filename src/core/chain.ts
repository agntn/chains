import {
  AddressValidationUnsupportedError,
  InvalidAddressError,
  InvalidTxidError,
  TxidValidationUnsupportedError,
} from "./errors.js";
import { keccak256 } from "./keccak256.js";
import type { ChainInfo, ChainKey, ChainType } from "./types.js";

export interface ChainConstructor {
  readonly key: ChainKey;
  new (): Chain;
}

export abstract class Chain implements ChainInfo {
  abstract readonly name: string;
  abstract readonly symbol: string;
  abstract readonly type: ChainType;
  abstract readonly explorer: string;
  /** Unknown for custom chains that do not declare their native currency precision. */
  readonly decimals?: number;
  readonly bip44?: number;
  readonly chainId?: string;
  readonly caip2?: string;
  readonly rpcDefault?: string;

  get key(): ChainKey {
    return (this.constructor as ChainConstructor).key;
  }

  /**
   * Whether this chain carries its own address format check.
   *
   * The base implementation only throws, so a chain that never overrode it cannot
   * answer address questions at all. Callers deserve to know that before they ask,
   * rather than by catching the failure.
   *
   * @returns {boolean} Whether this class overrides the base address validator.
   */
  get validatesAddress(): boolean {
    return this.assertAddress !== Chain.prototype.assertAddress;
  }

  assertAddress(_address: string): string {
    throw new AddressValidationUnsupportedError(this.key);
  }

  /**
   * Whether this chain carries its own transaction id format check, read the same way.
   *
   * @returns {boolean} Whether this class overrides the base txid validator.
   */
  get validatesTxid(): boolean {
    return this.assertTxid !== Chain.prototype.assertTxid;
  }

  assertTxid(_txid: string): string {
    throw new TxidValidationUnsupportedError(this.key);
  }
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** Keccak-256 of the signed transaction: `0x` and 32 bytes of hex, either case. */
const EVM_TXID = /^0x[0-9a-fA-F]{64}$/;

/**
 * EIP-55: a letter is uppercase where the matching nibble of the Keccak-256 of the
 * lowercase digits is 8 or more. An address in one case throughout carries no checksum
 * and passes, the way every wallet reads it; mixed case has to match the hash.
 *
 * @param {string} digits - The forty hex digits after `0x`.
 * @returns {boolean} Whether the letter case is the checksum or absent.
 */
function holdsChecksum(digits: string): boolean {
  const lower = digits.toLowerCase();
  if (digits === lower || digits === digits.toUpperCase()) return true;
  const digest = keccak256(Uint8Array.from(lower, (digit) => digit.codePointAt(0) ?? 0));
  for (let index = 0; index < digits.length; index++) {
    const byte = digest[index >> 1] ?? 0;
    const nibble = index % 2 === 0 ? byte >> 4 : byte & 0x0f;
    const digit = lower.charAt(index);
    if (digits.charAt(index) !== (nibble >= 8 ? digit.toUpperCase() : digit)) return false;
  }
  return true;
}

export abstract class EVM extends Chain {
  readonly type = "evm" as const;

  /**
   * `0x` and 40 hex digits, with the EIP-55 checksum verified when the case carries one.
   * A checksummed address with one wrong digit fails, since the hash of the digits no
   * longer matches the case; a lowercase address has no checksum to fail.
   *
   * @param {string} address - Candidate EVM address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    if (!EVM_ADDRESS.test(address) || !holdsChecksum(address.slice(2))) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  override assertTxid(txid: string): string {
    if (!EVM_TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}

/** A 32-byte transaction hash as 64 hex digits, either case and no `0x`. */
const UTXO_TXID = /^[0-9a-fA-F]{64}$/;

/** Bitcoin's lineage and Cardano share the shape of a txid, addresses stay with each chain. */
export abstract class UTXO extends Chain {
  readonly type = "utxo" as const;
  override assertTxid(txid: string): string {
    if (!UTXO_TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}

/**
 * All 32 bytes written out, or the one-digit short form AIP-40 defines for the
 * special addresses 0x0 through 0xf - that is how the framework address 0x1 is
 * actually written, on Sui as much as on Aptos. Anything in between stays
 * rejected: accepting dropped leading zeros would make every EVM address a
 * valid move address too, and identify would report a family nobody asked about.
 */
const MOVE_ADDRESS = /^0x([0-9a-fA-F]{64}|[0-9a-fA-F])$/;

export abstract class Move extends Chain {
  readonly type = "move" as const;
  override assertAddress(address: string): string {
    if (!MOVE_ADDRESS.test(address)) throw new InvalidAddressError(this.key, address);
    return address;
  }
}
