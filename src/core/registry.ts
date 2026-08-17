import { Chain } from "./chain.js";
import type { ChainConstructor } from "./chain.js";
import { UnknownChainError } from "./errors.js";
import type { ChainKey } from "./types.js";

const registry = new Map<ChainKey, ChainConstructor>();
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
