import { describe, expect, it } from "vitest";
import { Chain, register, type ChainKey } from "../../src/index.ts";
import { identifyAddress, lookupChain, validateChainAddress } from "../../src/tool-operations.ts";

/**
 * Every registered chain validates since TRON, TON and the move chains got
 * validators, so the unchecked reporting kept for future chains has no live
 * case in the real registry. Registering a validator-less chain in this file
 * brings the case back; vitest isolates test modules, so the registration
 * never leaks into the counts the other files assert.
 */
class Unvalidated extends Chain {
  static readonly key = "unvalidated" as ChainKey;
  readonly type = "octra" as const;
  readonly name = "Unvalidated";
  readonly symbol = "NONE";
  readonly explorer = "https://example.com";
}

register(Unvalidated);

describe("tool reporting for a chain without a validator", () => {
  it("names the chain as unchecked instead of counting it as a miss", () => {
    const result = identifyAddress("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");

    expect(result.content[0]?.text).toContain("Not checked (no validator): unvalidated.");
    expect(result.details.unchecked).toEqual(["unvalidated"]);
  });

  it("marks validating against it as a tool error, because nothing was checked", () => {
    const result = validateChainAddress("unvalidated", "anything");

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("carries no address validator");
  });

  it("warns about the missing validator in the lookup", () => {
    const result = lookupChain("unvalidated");

    expect(result.content[0]?.text).toContain("addressValidation: unsupported");
    expect(result.details).toMatchObject({ validatesAddress: false });
  });
});
