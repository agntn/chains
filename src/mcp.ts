import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Type, type TSchema } from "typebox";
import { Value } from "typebox/value";
import { stripControlCharacters } from "./core/text.js";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
  type ToolResult,
} from "./tool-operations.js";
import { version } from "./version.js";

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: TSchema;
  execute(args: Record<string, unknown>): ToolResult<unknown>;
}

const chainArgument = Type.String({
  description: "Chain key, name, symbol, or alias (for example: ethereum, matic, btc)",
  minLength: 1,
  maxLength: 64,
});

/** One length contract for every address parameter; only the wording differs. */
function addressArgument(description: string): TSchema {
  return Type.String({ description, minLength: 1, maxLength: 256 });
}

const tools: ToolDefinition[] = [
  {
    name: "chains_lookup",
    title: "Chain Lookup",
    description:
      "Resolve a blockchain by key, name, symbol, or alias and return its canonical metadata: chain ID, CAIP-2 identifier, BIP-44 coin type, explorer, and default RPC.",
    inputSchema: Type.Object({ chain: chainArgument }),
    execute: (args) => lookupChain(args.chain as string),
  },
  {
    name: "chains_validate_address",
    title: "Validate Chain Address",
    description:
      "Check an address against the format rules of a specific blockchain. This is a format check, not a checksum or on-chain existence check. When the owning chain is unknown, chains_identify_address checks every validator at once.",
    inputSchema: Type.Object({
      chain: chainArgument,
      address: addressArgument("Address to validate"),
    }),
    execute: (args) => validateChainAddress(args.chain as string, args.address as string),
  },
  {
    name: "chains_identify_address",
    title: "Identify Address",
    description:
      "Check an address of unknown origin against every registered validator and report which chains accept its format. A match narrows the family rather than proving ownership, and chains without a validator are listed as unchecked instead of silently skipped.",
    inputSchema: Type.Object({
      address: addressArgument("Address of unknown origin"),
    }),
    execute: (args) => identifyAddress(args.address as string),
  },
  {
    name: "chains_list",
    title: "List Chains",
    description:
      "List every registered blockchain with its key, symbol and family, optionally narrowed to one family. Use this to find out what this server covers instead of guessing a chain name.",
    inputSchema: Type.Object({
      family: Type.Optional(
        Type.String({
          description: "Chain family to filter by (for example: evm, utxo, solana, stellar)",
          minLength: 1,
          maxLength: 32,
        }),
      ),
    }),
    execute: (args) => listChains(args.family as string | undefined),
  },
];

/** Formats the first TypeBox validation failure for an MCP client. */
function validationError(schema: TSchema, value: unknown): string {
  const first = Value.Errors(schema, value)[0];
  if (!first) return "Invalid arguments";
  return `Invalid arguments at ${first.instancePath || "/"}: ${first.message}`;
}

/** Keeps client-controlled error text from forging lines or terminal escapes. */
function errorResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text: stripControlCharacters(text) }],
    isError: true,
  };
}

/**
 * Converts a shared tool result to the MCP text-result contract.
 *
 * `details` is dropped and `structuredContent` is never set: clients that see
 * structured output prefer it over `content` and would hide the readable answer.
 */
function toCallToolResult(result: ToolResult<unknown>): CallToolResult {
  return {
    content: result.content,
    ...(result.isError === undefined ? {} : { isError: result.isError }),
  };
}

/**
 * Creates an unconnected MCP server exposing the chain lookup and validation tools.
 *
 * Built on the low-level `Server` even though the SDK marks it `@deprecated`,
 * because `McpServer.registerTool` accepts Standard Schema (Zod) only. TypeBox 1.x
 * does not implement Standard Schema, and this package's tool schemas are TypeBox,
 * shared with the Pi and OMP extensions. The high-level API would force a second
 * definition of every parameter.
 */
export function createMcpServer(): Server {
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const server = new Server({ name: "chains", version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((tool): Tool => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema as Tool["inputSchema"],
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) {
      return errorResult(`Unknown chains tool: ${JSON.stringify(request.params.name)}`);
    }

    const args = request.params.arguments ?? {};
    if (!Value.Check(tool.inputSchema, args)) {
      return errorResult(validationError(tool.inputSchema, args));
    }

    try {
      return toCallToolResult(tool.execute(args));
    } catch (error) {
      return errorResult(
        `${tool.name} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  return server;
}
