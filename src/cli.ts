#!/usr/bin/env node

import { existsSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import type McpCommand from "./commands/mcp.ts";
import { version } from "./version.ts";

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package does not ship it. */
const sourceMcpCommand = new URL("../src/commands/mcp.ts", import.meta.url);
const sourceMcpCommandPath = fileURLToPath(sourceMcpCommand);

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 *
 * @param {unknown} value - The imported module namespace.
 * @returns {value is { default: typeof McpCommand }} Whether it exports a default command.
 */
function isCommandModule(value: unknown): value is { default: typeof McpCommand } {
  return typeof value === "object" && value !== null && "default" in value;
}

/**
 * Loads the MCP command. A built bin inside a checkout runs the live source, so a local server
 * needs a restart after a change instead of `pnpm build`. Node never strips types under
 * `node_modules`, so an installed copy keeps the bundle, and `CHAINS_DIST=1` keeps it everywhere,
 * for tests of the built output. The URL is built at runtime so the bundler leaves `src` out.
 *
 * @returns {Promise<typeof McpCommand>} The citty command that starts the stdio server.
 */
async function loadMcpCommand(): Promise<typeof McpCommand> {
  const fromSource =
    !import.meta.url.endsWith(".ts") &&
    process.env.CHAINS_DIST !== "1" &&
    !sourceMcpCommandPath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourceMcpCommandPath);
  if (!fromSource) return (await import("./commands/mcp.ts")).default;
  const module: unknown = await import(sourceMcpCommand.href);
  if (!isCommandModule(module)) {
    throw new TypeError(`${sourceMcpCommandPath} has no default command`);
  }
  return module.default;
}

/**
 * Ends the process once the reader of stdout or stderr is gone, as after `| head -1` or a pager
 * that quits early. Node ignores SIGPIPE, so without a listener the next write throws `EPIPE` with
 * a stack trace. The exit code stays whatever the command set.
 *
 * @param {Readonly<NodeJS.ErrnoException>} error - The error the stream emitted.
 */
function exitOnClosedPipe(error: Readonly<NodeJS.ErrnoException>): void {
  if (error.code !== "EPIPE") throw error;
  process.exit();
}

process.stdout.on("error", exitOnClosedPipe);
process.stderr.on("error", exitOnClosedPipe);

const main = defineCommand({
  meta: {
    name: "chains",
    version,
    description: "Canonical blockchain metadata, aliases, and address validation",
  },
  subCommands: {
    info: () => import("./commands/info.ts").then((m) => m.default),
    resolve: () => import("./commands/resolve.ts").then((m) => m.default),
    validate: () => import("./commands/validate.ts").then((m) => m.default),
    identify: () => import("./commands/identify.ts").then((m) => m.default),
    list: () => import("./commands/list.ts").then((m) => m.default),
    mcp: loadMcpCommand,
  },
});

await runMain(main);
