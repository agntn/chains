import { AddressValidationUnsupportedError, InvalidAddressError } from "./errors.js";
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
   */
  get validatesAddress(): boolean {
    return this.assertAddress !== Chain.prototype.assertAddress;
  }

  assertAddress(_address: string): string {
    throw new AddressValidationUnsupportedError(this.key);
  }
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export abstract class EVM extends Chain {
  readonly type = "evm" as const;
  override assertAddress(address: string): string {
    if (!EVM_ADDRESS.test(address)) throw new InvalidAddressError(this.key, address);
    return address;
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
