import type { Chain } from "./chain.js";
import { InvalidAddressError } from "./errors.js";
import { chains, create } from "./registry.js";

/** The registry partitioned by one address. */
export interface AddressMatches {
  /** Chains whose format check accepted the address. */
  matches: Chain[];
  /** Chains without a validator; a miss says nothing about them. */
  unchecked: Chain[];
}

/**
 * Partitions the registry by an address: chains whose format rules accept it,
 * and chains that carry no validator and so could not be asked.
 *
 * A match is about format only. Every EVM chain shares one format, so a match
 * narrows the family rather than naming the chain an address is used on.
 */
export function identify(address: string): AddressMatches {
  const matches: Chain[] = [];
  const unchecked: Chain[] = [];

  for (const key of chains()) {
    const chain = create(key);
    if (!chain.validatesAddress) {
      unchecked.push(chain);
      continue;
    }
    try {
      chain.assertAddress(address);
      matches.push(chain);
    } catch (error) {
      if (!(error instanceof InvalidAddressError)) throw error;
    }
  }

  return { matches, unchecked };
}
