/** Chains error hierarchy. */

/** Base class for failures surfaced through chains. */
export class ChainsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
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
    super(`Unsupported chain: ${input}`);
    this.name = "UnsupportedChainError";
    this.input = input;
  }
}

/** An address failed its chain's format check. */
export class InvalidAddressError extends ChainsError {
  readonly chain: string;
  readonly address: string;

  constructor(chain: string, address: string) {
    super(`Invalid ${chain} address: ${address}`);
    this.name = "InvalidAddressError";
    this.chain = chain;
    this.address = address;
  }
}

/** The chain carries no address validator. */
export class AddressValidationUnsupportedError extends ChainsError {
  readonly chain: string;

  constructor(chain: string) {
    super(`Address validation is not supported for ${chain}`);
    this.name = "AddressValidationUnsupportedError";
    this.chain = chain;
  }
}
