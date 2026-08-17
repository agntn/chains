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
    if (!EVM_ADDRESS.test(address)) throw new InvalidAddressError("EVM", address);
    return address;
  }
}

export abstract class Move extends Chain {
  readonly type = "move" as const;
}
