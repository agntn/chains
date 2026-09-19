import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const bin = resolve(root, "dist/cli.mjs");
const hook = resolve(root, "test/record-loads.ts");

/** What one run of the built bin printed, how it exited and every module URL it loaded. */
interface BinRun {
  readonly loaded: readonly string[];
  readonly status: number | null;
  readonly stdout: string;
}

/**
 * Runs the built bin under the load hook. citty exits the process itself, so the hook reports then.
 *
 * @param {readonly string[]} args - Arguments for the bin.
 * @param {string} input - What the child reads on stdin, empty by default.
 * @returns {BinRun} The exit status, stdout and the loaded module URLs.
 */
function runBin(args: readonly string[], input = ""): BinRun {
  const result = spawnSync(process.execPath, ["--import", hook, bin, ...args], {
    cwd: root,
    encoding: "utf8",
    input,
    timeout: 20_000,
  });
  const report = /^@loaded (\[.*\])$/mu.exec(result.stderr)?.[1];
  if (report === undefined) {
    throw new Error(`the load hook reported nothing:\n${result.stderr}`);
  }
  const loaded: unknown = JSON.parse(report);
  if (!Array.isArray(loaded)) {
    throw new TypeError(`the load hook reported something other than a list: ${report}`);
  }
  return { loaded: loaded.map(String), status: result.status, stdout: result.stdout };
}

/**
 * The package a module URL sits in. pnpm's store paths nest node_modules, so the last one counts.
 *
 * @param {string} url - A module URL the load hook reported.
 * @returns {string | undefined} The package name, or undefined outside node_modules.
 */
function packageOf(url: string): string | undefined {
  const dirs = url.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//gu);
  return dirs?.at(-1)?.replaceAll(/^\/node_modules\/|\/$/gu, "");
}

/**
 * Every package a run loaded, once each.
 *
 * @param {readonly string[]} loaded - The module URLs the load hook reported.
 * @returns {string[]} The package names, in load order.
 */
function packagesOf(loaded: readonly string[]): string[] {
  return [...new Set(loaded.map(packageOf).filter((name) => name !== undefined))];
}

describe("chains usage paths", () => {
  beforeAll(() => {
    if (!existsSync(bin)) {
      throw new Error("dist/cli.mjs is missing, run pnpm build first");
    }
  });

  it.each([
    { args: ["--help"], status: 0 },
    { args: ["-h"], status: 0 },
    { args: ["mcp", "--help"], status: 0 },
    { args: [], status: 1 },
    { args: ["no-such-command"], status: 1 },
  ])("chains $args prints the usage without the MCP server", ({ args, status }) => {
    const run = runBin(args);
    const packages = packagesOf(run.loaded);

    expect(run.status).toBe(status);
    expect(run.stdout).toMatch(/USAGE.*chains .*mcp/u);
    expect(packages).toContain("citty");
    expect(packages).not.toContain("@modelcontextprotocol/sdk");
    expect(packages).not.toContain("zod");
    expect(run.loaded.filter((url) => url.includes("typebox"))).toEqual([]);
  });

  it("chains mcp serves the server over stdio", () => {
    const initialize = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "chains-test", version: "1.0.0" },
      },
    };
    const run = runBin(["mcp"], `${JSON.stringify(initialize)}\n`);
    const response: unknown = JSON.parse(run.stdout.trim().split("\n")[0] ?? "");

    expect(run.status).toBe(0);
    expect(response).toMatchObject({ id: 1, result: { serverInfo: { name: "chains" } } });
    expect(packagesOf(run.loaded)).toContain("@modelcontextprotocol/sdk");
    expect(run.loaded.some((url) => url.includes("typebox"))).toBe(true);
  });
});
