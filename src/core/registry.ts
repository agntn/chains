import { builtins } from "../chains/index.ts";
import type { Chain, ChainConstructor } from "./chain.ts";
import { UnknownChainError } from "./errors.ts";
import type { ChainKey } from "./types.ts";

let registry: Map<ChainKey, ChainConstructor> | undefined;

/**
 * Seeded from `builtins` on first use, and `register` keeps it open.
 *
 * Built at module scope, the map was a call a bundler has to keep, and it held
 * every chain class: an app importing `Bitcoin` alone shipped all of them.
 *
 * @returns {Map<ChainKey, ChainConstructor>} The registry.
 */
function entries(): Map<ChainKey, ChainConstructor> {
  registry ??= new Map(builtins.map((chainClass) => [chainClass.key, chainClass] as const));
  return registry;
}
export function register(chainClass: ChainConstructor): void {
  entries().set(chainClass.key, chainClass);
}
export function create(key: ChainKey): Chain {
  const ChainClass = entries().get(key);
  if (!ChainClass) throw new UnknownChainError(key);
  return new ChainClass();
}
export function chains(): ChainKey[] {
  return Array.from(entries().keys());
}
export function has(key: ChainKey): boolean {
  return entries().has(key);
}
