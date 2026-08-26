import { describe, expect, it } from "vitest";
import { Chain, chains, getChain, register, type ChainKey } from "../../src/index.ts";

/**
 * A chain whose display name shares no spelling with its key, like Berachain
 * under `bera`. Resolution used to reach such a key only through a self-entry
 * in the alias table, so forgetting that entry made the canonical key throw.
 * Vitest isolates test modules, so the registration never leaks into the
 * registry counts the other files assert.
 */
class Example extends Chain {
  static readonly key = "example" as ChainKey;
  readonly type = "evm" as const;
  readonly name = "Example Network";
  readonly symbol = "XMPL";
  readonly explorer = "https://example.com";
}

register(Example);

describe("registry-backed key resolution", () => {
  it("resolves a registered key that has no alias-table entry", () => {
    expect(getChain("example")).toBeInstanceOf(Example);
    expect(getChain(" EXAMPLE ").key).toBe("example");
  });

  it("round-trips every registered key back to its own chain", () => {
    for (const key of chains()) {
      expect(getChain(key).key).toBe(key);
    }
  });
});
