import consola from "consola";
import { stripControlCharacters } from "../core/text.js";
import type { Chain } from "../index.js";
import { ChainsError, getChain } from "../index.js";

/**
 * Resolves CLI input to a chain, reporting known failures as a message rather
 * than a stack trace. Returns undefined once the exit code has been set.
 *
 * Imports go through the package entrypoint so the chain classes are registered.
 *
 * @param {string} input - Chain spelling supplied to the CLI.
 * @returns {Chain | undefined} The resolved chain, or undefined after a known failure.
 */
export function resolveOrFail(input: string): Chain | undefined {
  try {
    return getChain(input);
  } catch (error) {
    if (error instanceof ChainsError) {
      consola.error(stripControlCharacters(error.message));
      process.exitCode = 1;
      return undefined;
    }
    throw error;
  }
}
