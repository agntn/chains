import { describe, expect, it } from "vitest";
import { ChainsError } from "../../dist/tool-operations.mjs";
import ompExtension from "../../packages/omp/extensions/chains.ts";
import piExtension from "../../packages/pi/extensions/chains.ts";

interface RegisteredTool {
  name: string;
  execute(
    toolCallId: string,
    params: Readonly<Record<string, unknown>>,
  ): Promise<{ content: Array<{ text: string }>; details: unknown; isError?: boolean }>;
}

/**
 * Runs an extension against a stand-in for the host API and hands back its tools by name.
 *
 * @param {(pi: never) => void} extension - Default export of an extension file.
 * @returns {Map<string, RegisteredTool>} Every tool the extension registered.
 */
function toolsOf(extension: (pi: never) => void): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  extension({
    registerTool: (tool: Readonly<RegisteredTool>) => tools.set(tool.name, tool),
  } as never);
  return tools;
}

/** Calls that name something the registry doesn't hold, so nothing gets checked. */
const failures: Array<[tool: string, params: Record<string, unknown>, message: string]> = [
  ["chains_lookup", { chain: "nochain" }, "nochain"],
  ["chains_validate_address", { chain: "nochain", address: "0x0" }, "nochain"],
  ["chains_validate_txid", { chain: "nochain", txid: "0x0" }, "nochain"],
  ["chains_list", { family: "nofamily" }, 'Unknown chain family: "nofamily"'],
];

describe("Pi extension", () => {
  const tools = toolsOf(piExtension);

  /** Pi records whatever `execute` returns as a successful call and reads only a throw as failed. */
  it.each(failures)("throws when %s could not answer", async (name, params, message) => {
    const call = tools.get(name)!.execute("call", params);
    await expect(call).rejects.toThrow(message);
    await expect(call).rejects.toBeInstanceOf(ChainsError);
  });

  it("answers a rejected address instead of throwing", async () => {
    const result = await tools
      .get("chains_validate_address")!
      .execute("call", { chain: "bitcoin", address: "nope" });
    expect(result.content[0]!.text).toMatch(/^Invalid Bitcoin \(bitcoin\) address/);
  });
});

describe("OMP extension", () => {
  const tools = toolsOf(ompExtension);

  /** OMP reads `isError` off the returned object, so the flag has to survive the adapter. */
  it.each(failures)("keeps isError when %s could not answer", async (name, params, message) => {
    const result = await tools.get(name)!.execute("call", params);
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain(message);
  });

  it("leaves isError unset on a rejected address", async () => {
    const result = await tools
      .get("chains_validate_address")!
      .execute("call", { chain: "bitcoin", address: "nope" });
    expect(result.isError).toBeUndefined();
  });
});
