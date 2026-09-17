import {
  AddressValidationUnsupportedError,
  InvalidAddressError,
  InvalidTxidError,
  TxidValidationUnsupportedError,
} from "./errors.js";
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

export abstract class EVM extends Chain {
  readonly type = "evm" as const;
  override assertAddress(address: string): string {
    if (!EVM_ADDRESS.test(address)) throw new InvalidAddressError(this.key, address);
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
