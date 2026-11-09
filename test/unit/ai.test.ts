import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { generateText, isStepCount } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { chainsAiTools } from "../../src/ai.ts";
import { createMcpServer } from "../../src/mcp.ts";
import { chainTools } from "../../src/tools.ts";

/* EIP-55's own mixed-case vector, and the same address with one letter's case flipped. */
const CHECKSUMMED = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const MISCASED = "0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/* A model that makes one tool call with the given input, then says it's done. */
function scriptedModel(toolName: string, input: Readonly<Record<string, unknown>>) {
  return new MockLanguageModelV4({
    doGenerate: [
      {
        content: [
          { type: "tool-call", toolCallId: "call-0", toolName, input: JSON.stringify(input) },
        ],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text", text: "done" }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      },
    ],
  });
}

/* Runs one scripted call and hands back the tool's part and what the model read next. */
async function callThroughModel(toolName: string, input: Readonly<Record<string, unknown>>) {
  const model = scriptedModel(toolName, input);
  const result = await generateText({
    model,
    tools: chainsAiTools,
    stopWhen: isStepCount(2),
    prompt: "check this address",
  });
  const toolMessage = model.doGenerateCalls[1]?.prompt.find((message) => message.role === "tool");
  return { part: result.steps[0]?.content[1], modelSaw: toolMessage?.content[0] };
}

/* The text `chains mcp` answers the same call with. */
async function mcpText(name: string, args: Readonly<Record<string, unknown>>): Promise<string> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "chains-ai-test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = await client.callTool({ name, arguments: { ...args } });
    const [block] = result.content as ReadonlyArray<{ type: string; text?: string }>;
    return block?.text ?? "";
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

describe("@agntn/chains/ai", () => {
  it("offers every tool MCP, Pi and OMP list, under the same name and in the same order", () => {
    expect(Object.keys(chainsAiTools)).toEqual(chainTools.map((tool) => tool.name));
  });

  it("gives the model the text an MCP client reads, and the app the details beside it", async () => {
    const input = { chain: "eth", address: CHECKSUMMED };

    const { part, modelSaw } = await callThroughModel("chains_address_validate", input);
    const text = await mcpText("chains_address_validate", input);

    expect(text).toContain("Valid Ethereum (ethereum) address");
    expect(part).toMatchObject({
      type: "tool-result",
      toolName: "chains_address_validate",
      output: { chain: "ethereum", address: CHECKSUMMED, valid: true, text },
    });
    expect(modelSaw).toMatchObject({ type: "tool-result", output: { type: "text", value: text } });
  });

  it("answers a rejected address as a result, because the check itself ran", async () => {
    const input = { chain: "ethereum", address: MISCASED };

    const { part } = await callThroughModel("chains_address_validate", input);
    const text = await mcpText("chains_address_validate", input);

    expect(text).toContain("Invalid Ethereum (ethereum) address");
    expect(part).toMatchObject({
      type: "tool-result",
      output: { chain: "ethereum", valid: false, text },
    });
  });

  it("reports a chain it can't resolve as a tool error, with the names to try next", async () => {
    const { part } = await callThroughModel("chains_lookup", { chain: "no-such-chain" });

    expect(part).toMatchObject({ type: "tool-error", toolName: "chains_lookup" });
    const error = String((part as { error?: unknown }).error);
    expect(error).toContain("no-such-chain");
    expect(error).toContain("chains_list");
  });

  it("turns arguments outside the schema into a tool error before any executor runs", async () => {
    const { part } = await callThroughModel("chains_txid_validate", {
      chain: "bitcoin",
      txid: "ab",
      network: "testnet",
    });

    expect(part).toMatchObject({ type: "tool-error", toolName: "chains_txid_validate" });
    expect(String((part as { error?: unknown }).error)).toContain("network");
  });
});
