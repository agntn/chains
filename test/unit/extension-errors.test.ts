import { describe, expect, it } from "vitest";
import ompExtension from "../../extensions/omp/chains.ts";
import piExtension from "../../extensions/pi/chains.ts";
import { lookupChain } from "../../src/tool-operations.ts";
import { chainTools } from "../../src/tools.ts";

interface RegisteredTool {
  readonly name: string;
  readonly parameters: unknown;
  readonly execute: (
    toolCallId: string,
    params: Readonly<Record<string, unknown>>,
    signal: undefined,
    onUpdate: undefined,
    ctx: Readonly<{ hasUI: false; ui: undefined }>,
  ) => Promise<{ content: Array<{ text: string }>; details: unknown; isError?: boolean }>;
}

/** What `hostContext` in `@agntn/tools` reads off a host's `ctx`, for a host without a UI. */
const ctx = { hasUI: false, ui: undefined } as const;

/**
 * Runs an extension against a stand-in for the host API and hands back its tools by name.
 * `Type.Unsafe` hands the schema back as it is, so `parameters` can be compared with `input`.
 *
 * @param extension - Default export of an extension file.
 * @returns {Promise<Map<string, RegisteredTool>>} Every tool the extension registered.
 */
async function toolsOf(
  extension: (pi: never) => Promise<void>,
): Promise<Map<string, RegisteredTool>> {
  const tools = new Map<string, RegisteredTool>();
  await extension({
    registerTool: (tool: Readonly<RegisteredTool>) => tools.set(tool.name, tool),
    typebox: { Type: { Unsafe: (schema: unknown) => schema } },
    pi: { Text: class {} },
  } as never);
  return tools;
}

/**
 * Registers an extension and calls one of its tools the way a host does.
 *
 * @param extension - Default export of an extension file.
 * @param name - Tool to call.
 * @param params - Arguments as the model sent them.
 * @returns {ReturnType<RegisteredTool["execute"]>} What the tool answered.
 */
async function call(
  extension: (pi: never) => Promise<void>,
  name: string,
  params: Readonly<Record<string, unknown>>,
): ReturnType<RegisteredTool["execute"]> {
  const tools = await toolsOf(extension);
  return await tools.get(name)!.execute("call", params, undefined, undefined, ctx);
}

/** Calls that name something the registry doesn't hold, so nothing gets checked. */
const failures: Array<[tool: string, params: Record<string, unknown>, message: string]> = [
  ["chains_lookup", { chain: "nochain" }, "nochain"],
  ["chains_address_validate", { chain: "nochain", address: "0x0" }, "nochain"],
  ["chains_txid_validate", { chain: "nochain", txid: "0x0" }, "nochain"],
  ["chains_list", { family: "nofamily" }, 'Unknown chain family: "nofamily"'],
];

describe("tool names", () => {
  it.each([
    ["Pi", piExtension],
    ["OMP", ompExtension],
  ])("%s registers the MCP names and schemas, object before verb", async (_, extension) => {
    const tools = await toolsOf(extension);

    expect([...tools.keys()]).toEqual([
      "chains_lookup",
      "chains_address_validate",
      "chains_txid_validate",
      "chains_address_identify",
      "chains_list",
    ]);
    expect([...tools.values()].map((tool) => tool.parameters)).toEqual(
      chainTools.map((tool) => tool.input),
    );
  });
});

describe("Pi extension", () => {
  /** Pi records whatever `execute` returns as a successful call and reads only a throw as failed. */
  it.each(failures)("throws when %s could not answer", async (name, params, message) => {
    await expect(call(piExtension, name, params)).rejects.toThrow(message);
  });

  it("throws the words an MCP client reads", async () => {
    const answer = lookupChain("nochain");

    await expect(call(piExtension, "chains_lookup", { chain: "nochain" })).rejects.toThrow(
      answer.content.map((part) => part.text).join("\n"),
    );
  });

  it("answers a rejected address instead of throwing", async () => {
    const result = await call(piExtension, "chains_address_validate", {
      chain: "bitcoin",
      address: "nope",
    });
    expect(result.content[0]!.text).toMatch(/^Invalid Bitcoin \(bitcoin\) address/);
  });

  it("refuses an argument the schema doesn't declare", async () => {
    await expect(
      call(piExtension, "chains_lookup", { chain: "bitcoin", network: "testnet" }),
    ).rejects.toThrow('unknown property "network"');
  });
});

describe("OMP extension", () => {
  /** OMP reads `isError` off the returned object, so the flag has to survive the adapter. */
  it.each(failures)("keeps isError when %s could not answer", async (name, params, message) => {
    const result = await call(ompExtension, name, params);
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain(message);
  });

  it("leaves isError unset on a rejected address", async () => {
    const result = await call(ompExtension, "chains_address_validate", {
      chain: "bitcoin",
      address: "nope",
    });
    expect(result.isError).toBeUndefined();
  });

  /** OMP's `Type.Unsafe` checks nothing, so the core has to turn a bad call down itself. */
  it("refuses a value past the schema's length bound", async () => {
    await expect(
      call(ompExtension, "chains_address_validate", { chain: "bitcoin", address: "1".repeat(257) }),
    ).rejects.toThrow(/address/u);
  });
});
