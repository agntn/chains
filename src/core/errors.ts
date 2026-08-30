/** Chains error hierarchy. */

import type { ChainKey } from "./types.js";

/** Base class for failures surfaced through chains. */
export class ChainsError extends Error {
  constructor(message: string, options?: Readonly<ErrorOptions>) {
    super(message, options);
    this.name = "ChainsError";
  }
}

/** A canonical key resolved, but no class is registered under it. */
export class UnknownChainError extends ChainsError {
  readonly key: string;

  constructor(key: string) {
    super(`Unknown chain: ${key}`);
    this.name = "UnknownChainError";
    this.key = key;
  }
}

/** Caller input matched no known alias. */
export class UnsupportedChainError extends ChainsError {
  readonly input: string;

  constructor(input: string) {
    // Quoted so whitespace-only and control-character input stays visible in logs
    // instead of producing a message with an invisible or line-broken subject.
    super(`Unsupported chain: ${JSON.stringify(input)}`);
    this.name = "UnsupportedChainError";
    this.input = input;
  }
}

/** An address failed its chain's format check. */
export class InvalidAddressError extends ChainsError {
  /**
   * Canonical chain key, usable as an identifier.
   *
   * Validators used to pass whatever read well in the message, so the field held
   * "EVM" for thirteen chains and a display name for the rest. A caller matching
   * on it got a different vocabulary per chain family.
   */
  readonly chain: ChainKey;
  readonly address: string;

  constructor(chain: ChainKey, address: string) {
    super(`Invalid ${chain} address: ${address}`);
    this.name = "InvalidAddressError";
    this.chain = chain;
    this.address = address;
  }
}

/** The chain carries no address validator. */
export class AddressValidationUnsupportedError extends ChainsError {
  readonly chain: ChainKey;

  constructor(chain: ChainKey) {
    super(`Address validation is not supported for ${chain}`);
    this.name = "AddressValidationUnsupportedError";
    this.chain = chain;
  }
}
