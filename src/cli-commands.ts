/**
 * Commands only the CLI gets. A rejected address or txid is an answer to a model but a failure
 * to a shell script, so the CLI's checks exit 1 on it, and `resolve` prints the bare key.
 */

import { defineTool, type ToolDefinition, type ToolResult, Type } from "@agntn/tools";
import type { CliOptions } from "@agntn/tools/cli";
import { serverInfo } from "./server-info.ts";
import { chainTools, closed, loadOperations, txidValidateTool } from "./tools.ts";
import { version } from "./version.ts";

/**
 * Turns a rejection into a failed command, so `chains validate ... && echo fits` reads true.
 *
 * @param result - What the shared validator answered.
 * @returns {ToolResult<Details>} The same result, failed when the value broke a rule.
 */
function failRejection<Details extends { readonly valid: boolean }>(
  result: ToolResult<Details>,
): ToolResult<Details> {
  return result.details.valid ? result : { ...result, isError: true };
}

export const resolveCommand = defineTool({
  name: "chains_resolve",
  title: "Resolve Chain",
  description: "Resolve a name, symbol, or alias to its canonical chain key.",
  effect: "read",
  input: Type.Object(
    {
      input: Type.String({
        description: "Chain name, symbol, or alias (for example: matic, btc, arb)",
        minLength: 1,
        maxLength: 64,
      }),
    },
    closed,
  ),
  cli: { command: "resolve", positional: ["input"] },
  async execute({ input }): Promise<ToolResult> {
    const result = (await loadOperations()).lookupChain(input);
    if (result.isError === true || !("key" in result.details)) return result;
    const { key } = result.details;
    return { content: [{ type: "text", text: key }], details: { key } };
  },
});

export const validateCommand = defineTool({
  name: "chains_validate",
  title: "Validate",
  description:
    "Validate an address, or with --txid a transaction id, against a chain's format rules.",
  effect: "read",
  input: Type.Object(
    {
      chain: Type.String({
        description: "Chain key, name, symbol, or alias",
        minLength: 1,
        maxLength: 64,
      }),
      value: Type.String({
        description: "Address to validate, or a transaction id with --txid",
        minLength: 1,
        maxLength: 256,
      }),
      txid: Type.Optional(
        Type.Boolean({ description: "Check the value as a transaction id instead of an address" }),
      ),
    },
    closed,
  ),
  cli: { command: "validate", positional: ["chain", "value"] },
  async execute({ chain, value, txid }): Promise<ToolResult> {
    const operations = await loadOperations();
    return txid === true
      ? failRejection(operations.validateChainTxid(chain, value))
      : failRejection(operations.validateChainAddress(chain, value));
  },
});

export const txidCommand = defineTool({
  ...txidValidateTool,
  async execute({ chain, txid }) {
    return failRejection((await loadOperations()).validateChainTxid(chain, txid));
  },
});

/** Commands only the CLI gets. `validate` and `txid` take the place of the generated ones. */
export const chainCommands = [
  resolveCommand,
  validateCommand,
  txidCommand,
] as const satisfies readonly ToolDefinition[];

/** What `chains` runs on, shared with the tests so they drive the same commands. */
export const cliOptions = {
  name: "chains",
  version,
  description: "Canonical blockchain metadata, aliases, and address validation",
  tools: chainTools,
  commands: chainCommands,
  mcp: serverInfo,
} satisfies CliOptions;
