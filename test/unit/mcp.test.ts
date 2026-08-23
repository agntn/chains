import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../../src/mcp.ts";

const openConnections: Array<{ close(): Promise<void> }> = [];

async function connectTestClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "chains-test", version: "1.0.0" });
  openConnections.push(client, server);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()));
});

describe("chains MCP server", () => {
  it("advertises every chain tool as read-only", async () => {
    const client = await connectTestClient();

    const response = await client.listTools();

    expect(response.tools.map((tool) => tool.name)).toEqual([
      "chains_lookup",
      "chains_validate_address",
      "chains_identify_address",
      "chains_list",
    ]);
    expect(response.tools[0]?.inputSchema).toMatchObject({
      type: "object",
      required: ["chain"],
    });
    expect(response.tools[1]?.annotations).toMatchObject({ readOnlyHint: true });
  });

  it("resolves an alias to canonical metadata", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_lookup",
      arguments: { chain: "matic" },
    });

    expect(response.isError).not.toBe(true);
    expect(response.content).toEqual([
      {
        type: "text",
        text: expect.stringContaining("Polygon PoS (polygon)"),
      },
    ]);
    const [part] = response.content as Array<{ text: string }>;
    expect(part?.text).toContain("caip2: eip155:137");
    expect(part?.text).toContain("chainId: 0x89");
  });

  it("names the registered chains when resolution fails", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_lookup",
      arguments: { chain: "dogecoin" },
    });

    expect(response.isError).toBe(true);
    const [part] = response.content as Array<{ text: string }>;
    expect(part?.text).toContain('Unsupported chain: "dogecoin"');
    expect(part?.text).toContain("Known chain keys: eth, base");
  });

  it("rejects arguments that miss the schema", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_lookup",
      arguments: { chian: "eth" },
    });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual([
      { type: "text", text: expect.stringContaining("Invalid arguments") },
    ]);
  });

  it("rejects prototype property names as unknown tools", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({ name: "toString", arguments: {} });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual([{ type: "text", text: "Unknown chains tool: toString" }]);
  });

  it("reports a valid address as a successful answer", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_validate_address",
      arguments: { chain: "eth", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
    });

    expect(response.isError).not.toBe(true);
    expect(response.content).toEqual([
      { type: "text", text: expect.stringContaining("Valid Ethereum (eth) address") },
    ]);
  });

  it("reports a rejected address as an answer, not a tool error", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_validate_address",
      arguments: { chain: "eth", address: "not-an-address" },
    });

    expect(response.isError).not.toBe(true);
    expect(response.content).toEqual([
      { type: "text", text: "Invalid Ethereum (eth) address: not-an-address" },
    ]);
  });

  it("narrows an unknown address down to its format family", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_identify_address",
      arguments: { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
    });

    expect(response.isError).not.toBe(true);
    const [part] = response.content as Array<{ text: string }>;
    expect(part?.text).toContain("matches 13 of 16 checked chains");
    expect(part?.text).toContain("evm (13): eth, base, arbitrum");
    expect(part?.text).toContain("does not prove the address is used");
    expect(part?.text).toContain("Not checked (no validator): aptos, sui, ton, tron.");
  });

  /**
   * The System Program is 32 ones: a real 32-byte Solana account that also fits
   * the legacy base58 Bitcoin pattern. Reporting both is the honest answer, and
   * the caveat line exists exactly for this overlap.
   */
  it("reports every chain whose format an ambiguous address satisfies", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_identify_address",
      arguments: { address: "11111111111111111111111111111111" },
    });

    const [part] = response.content as Array<{ text: string }>;
    expect(part?.text).toContain("matches 2 of 16 checked chains");
    expect(part?.text).toContain("utxo (1): bitcoin");
    expect(part?.text).toContain("solana (1): solana");
  });

  it("treats an address matching nothing as an answer, not a tool error", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_identify_address",
      arguments: { address: "  nope\n" },
    });

    expect(response.isError).not.toBe(true);
    const [part] = response.content as Array<{ text: string }>;
    expect(part?.text).toContain("nope matches none of the 16 checked chains.");
    expect(part?.text).not.toContain("does not prove");
    expect(part?.text).toContain("Not checked (no validator): aptos, sui, ton, tron.");
  });

  it("marks a chain without a validator as a tool error", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_validate_address",
      arguments: { chain: "aptos", address: "0x1" },
    });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual([
      { type: "text", text: "Aptos (aptos) carries no address validator" },
    ]);
  });
  it("enumerates the registry so an agent never has to guess a chain name", async () => {
    const client = await connectTestClient();

    const all = await client.callTool({ name: "chains_list", arguments: {} });
    expect(all.isError).not.toBe(true);
    const [listing] = all.content as Array<{ text: string }>;
    expect(listing?.text).toContain("20 chains registered.");
    expect(listing?.text).toContain("bitcoin    BTC    utxo    Bitcoin");
    expect(listing?.text).toContain("Families: evm, utxo, solana, move, ton, tron, octra.");

    const filtered = await client.callTool({
      name: "chains_list",
      arguments: { family: "move" },
    });
    const [moves] = filtered.content as Array<{ text: string }>;
    expect(moves?.text).toContain("2 registered move chains.");
    expect(moves?.text).toContain("Aptos");
    expect(moves?.text).toContain("Sui");
    expect(moves?.text).not.toContain("Ethereum");

    const unknown = await client.callTool({
      name: "chains_list",
      arguments: { family: "rollup" },
    });
    expect(unknown.isError).toBe(true);
    const [text] = unknown.content as Array<{ text: string }>;
    expect(text?.text).toContain('Unknown chain family: "rollup"');
    expect(text?.text).toContain("Known families: evm");
  });

  it("resolves a display name it printed itself", async () => {
    const client = await connectTestClient();

    const first = await client.callTool({ name: "chains_lookup", arguments: { chain: "arb" } });
    const [printed] = first.content as Array<{ text: string }>;
    expect(printed?.text).toContain("Arbitrum One (arbitrum)");

    const second = await client.callTool({
      name: "chains_lookup",
      arguments: { chain: "Arbitrum One" },
    });
    expect(second.isError).not.toBe(true);
    const [again] = second.content as Array<{ text: string }>;
    expect(again?.text).toContain("Arbitrum One (arbitrum)");
  });

  it("states that a missing coin type or CAIP-2 namespace does not exist", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({ name: "chains_lookup", arguments: { chain: "oct" } });

    const [text] = response.content as Array<{ text: string }>;
    expect(text?.text).toContain("bip44: none (no registered SLIP-0044 coin type)");
    expect(text?.text).toContain("caip2: none (no registered CAIP-2 namespace)");
  });

  it("warns in the lookup that a chain cannot validate addresses", async () => {
    const client = await connectTestClient();

    const unsupported = await client.callTool({
      name: "chains_lookup",
      arguments: { chain: "tron" },
    });
    const [tron] = unsupported.content as Array<{ text: string }>;
    expect(tron?.text).toContain("addressValidation: unsupported");

    const supported = await client.callTool({ name: "chains_lookup", arguments: { chain: "eth" } });
    const [eth] = supported.content as Array<{ text: string }>;
    expect(eth?.text).not.toContain("addressValidation");
  });

  it("strips whitespace around an address the way it does around a chain", async () => {
    const client = await connectTestClient();

    const response = await client.callTool({
      name: "chains_validate_address",
      arguments: {
        chain: " eth ",
        address: "  0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984\n",
      },
    });

    expect(response.isError).not.toBe(true);
    expect(response.content).toEqual([
      {
        type: "text",
        text: "Valid Ethereum (eth) address: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      },
    ]);
  });
});
