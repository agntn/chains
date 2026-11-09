#!/usr/bin/env node

/** Chains CLI: a command per tool, plus `resolve`, `validate` and `mcp`. */
import { existsSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "@agntn/tools/cli";
import { cliOptions } from "./cli-commands.ts";
import type { serveStdio } from "./mcp-stdio.ts";

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package ships only `dist`. */
const sourceStdio = new URL("../src/mcp-stdio.ts", import.meta.url);
const sourceStdioPath = fileURLToPath(sourceStdio);

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 *
 * @param value - The imported module namespace.
 * @returns {value is { serveStdio: typeof serveStdio }} Whether it exports the server.
 */
function isStdioModule(value: unknown): value is { serveStdio: typeof serveStdio } {
  return typeof value === "object" && value !== null && "serveStdio" in value;
}

/**
 * A checkout serves the live source, so a change costs a restart, not `pnpm build`.
 * `node_modules` and `CHAINS_DIST=1` keep the bundle; the runtime URL keeps `src` out of it.
 *
 * @returns {Promise<typeof serveStdio>} What starts the stdio server.
 */
async function loadServer(): Promise<typeof serveStdio> {
  const fromSource =
    !import.meta.url.endsWith(".ts") &&
    process.env.CHAINS_DIST !== "1" &&
    !sourceStdioPath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourceStdioPath);
  if (!fromSource) return (await import("./mcp-stdio.ts")).serveStdio;
  const module: unknown = await import(sourceStdio.href);
  if (!isStdioModule(module)) throw new TypeError(`${sourceStdioPath} has no serveStdio`);
  return module.serveStdio;
}

/**
 * `mcp` alone or with option terminators starts the server; `mcp --help` stays with `runCli`.
 *
 * @param args - Every argument after the bin.
 * @returns {boolean} Whether the line starts the stdio server.
 */
function servesStdio(args: readonly string[]): boolean {
  const [command, ...rest] = args;
  return command === "mcp" && rest.every((word) => word === "--");
}

const argv = process.argv.slice(2);
if (servesStdio(argv)) {
  (await loadServer())();
} else {
  await runCli(cliOptions, argv);
}
