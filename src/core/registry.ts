import { builtins } from "../chains/index.js";
import type { Chain, ChainConstructor } from "./chain.js";
import { UnknownChainError } from "./errors.js";
import type { ChainKey } from "./types.js";

/** Seeded from `builtins`, and `register` keeps it open. */
const registry = new Map<ChainKey, ChainConstructor>(
  builtins.map((chainClass) => [chainClass.key, chainClass] as const),
);
export function register(chainClass: ChainConstructor): void {
  registry.set(chainClass.key, chainClass);
}
export function create(key: ChainKey): Chain {
  const ChainClass = registry.get(key);
  if (!ChainClass) throw new UnknownChainError(key);
  return new ChainClass();
}
export function chains(): ChainKey[] {
  return Array.from(registry.keys());
}
export function has(key: ChainKey): boolean {
  return registry.has(key);
}
