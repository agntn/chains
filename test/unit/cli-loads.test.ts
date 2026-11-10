import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { text } from "node:stream/consumers";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vite-plus/test";

const root = resolve(import.meta.dirname, "../..");
const bin = resolve(root, "dist/cli.mjs");
const hook = resolve(root, "test/record-loads.ts");
const server = pathToFileURL(resolve(root, "dist/mcp-stdio.mjs")).href;
const sourceServer = pathToFileURL(resolve(root, "src/mcp-stdio.ts")).href;
const initialize = `${JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "chains-test", version: "1.0.0" },
  },
})}\n`;

/** What one run of the built bin printed, how it exited and every module URL it loaded. */
interface BinRun {
  readonly loaded: readonly string[];
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * Reads the hook's report out of what a child wrote on stderr.
 *
 * @param {string} stderr - Everything the child wrote on stderr.
 * @returns {string[]} The loaded module URLs.
 */
function loadedFrom(stderr: string): string[] {
  const report = /^@loaded (\[.*\])$/mu.exec(stderr)?.[1];
  if (report === undefined) {
    throw new Error(`the load hook reported nothing:\n${stderr.slice(-2000)}`);
  }
  const loaded: unknown = JSON.parse(report);
  if (!Array.isArray(loaded)) {
    throw new TypeError(`the load hook reported something other than a list: ${report}`);
  }
  return loaded.map(String);
}

/**
 * Runs plain Node under the load hook, which reports when the process exits.
 *
 * @param {readonly string[]} args - Node arguments after the hook import.
 * @param {string} input - What the child reads on stdin, empty by default.
 * @param {Readonly<Record<string, string>>} env - Extra environment; an inherited `CHAINS_DIST` is dropped.
 * @returns {BinRun} The exit status, stdout and the loaded module URLs.
 */
function runNode(
  args: readonly string[],
  input = "",
  env: Readonly<Record<string, string>> = {},
): BinRun {
  const { CHAINS_DIST: _inherited, ...environment } = process.env;
  const result = spawnSync(process.execPath, ["--import", hook, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...environment, ...env },
    input,
    timeout: 20_000,
  });
  const loaded = loadedFrom(result.stderr);
  const stderr = result.stderr.replace(/\n@loaded \[.*\]\n$/u, "");
  return { loaded, status: result.status, stderr, stdout: result.stdout };
}

/**
 * Runs the built bin of the checkout under the load hook.
 *
 * @param {readonly string[]} args - Arguments for the bin.
 * @param {string} input - What the child reads on stdin, empty by default.
 * @param {Readonly<Record<string, string>>} env - Extra environment for the child.
 * @returns {BinRun} The exit status, stdout and the loaded module URLs.
 */
function runBin(
  args: readonly string[],
  input = "",
  env: Readonly<Record<string, string>> = {},
): BinRun {
  return runNode([bin, ...args], input, env);
}

/**
 * The first JSON-RPC message a stdio server wrote.
 *
 * @param {BinRun} run - A run of `chains mcp` fed the initialize request.
 * @returns {unknown} The parsed response.
 */
function firstResponse(run: BinRun): unknown {
  return JSON.parse(run.stdout.trim().split("\n")[0] ?? "");
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
    {
      args: ["--help"],
      status: 0,
      stream: "stdout",
      usage: /^USAGE chains <command>.*\n(?:.*\n)*\s+mcp\s/mu,
    },
    {
      args: ["-h"],
      status: 0,
      stream: "stdout",
      usage: /^USAGE chains <command>.*\n(?:.*\n)*\s+mcp\s/mu,
    },
    { args: ["mcp", "--help"], status: 0, stream: "stdout", usage: /^USAGE chains mcp$/mu },
    {
      args: [],
      status: 1,
      stream: "stderr",
      usage: /^USAGE chains <command>.*\n(?:.*\n)*\s+mcp\s/mu,
    },
    {
      args: ["no-such-command"],
      status: 1,
      stream: "stderr",
      usage: /^Run chains --help for the commands$/mu,
    },
  ] as const)(
    "chains $args prints the usage without the MCP server",
    ({ args, status, stream, usage }) => {
      const run = runBin(args);
      const packages = packagesOf(run.loaded);

      expect(run.status).toBe(status);
      expect(run[stream]).toMatch(usage);
      expect(packages).toContain("@agntn/tools");
      expect(packages).not.toContain("@modelcontextprotocol/server");
      expect(packages).not.toContain("@modelcontextprotocol/sdk");
      expect(packages).not.toContain("zod");
      expect(run.loaded).not.toContain(server);
    },
  );

  it("chains mcp serves the live source inside a checkout", () => {
    const run = runBin(["mcp"], initialize);

    expect(run.status).toBe(0);
    expect(firstResponse(run)).toMatchObject({ id: 1, result: { serverInfo: { name: "chains" } } });
    expect(packagesOf(run.loaded)).toContain("@modelcontextprotocol/server");
    expect(run.loaded).toContain(sourceServer);
    expect(run.loaded).not.toContain(server);
  });

  it("chains mcp keeps the bundle under CHAINS_DIST=1", () => {
    const run = runBin(["mcp"], initialize, { CHAINS_DIST: "1" });

    expect(run.status).toBe(0);
    expect(firstResponse(run)).toMatchObject({ id: 1, result: { serverInfo: { name: "chains" } } });
    expect(run.loaded).toContain(server);
    expect(run.loaded).not.toContain(sourceServer);
    expect(packagesOf(run.loaded)).not.toContain("typebox");
  });

  it("chains mcp keeps the bundle when the package sits under node_modules", () => {
    const cache = join(root, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const copy = mkdtempSync(join(cache, "chains-cli-"));
    try {
      for (const entry of ["dist", "src", "package.json"]) {
        cpSync(join(root, entry), join(copy, entry), { recursive: true });
      }
      const run = runNode([join(copy, "dist/cli.mjs"), "mcp"], initialize);
      const copiedSource = pathToFileURL(join(copy, "src/")).href;

      expect(run.status).toBe(0);
      expect(run.loaded).toContain(pathToFileURL(join(copy, "dist/mcp-stdio.mjs")).href);
      expect(run.loaded.filter((url) => url.startsWith(copiedSource))).toEqual([]);
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });

  it("chains mcp keeps the bundle in a package that ships no src", () => {
    const copy = mkdtempSync(join(tmpdir(), "chains-cli-"));
    try {
      cpSync(join(root, "dist"), join(copy, "dist"), { recursive: true });
      cpSync(join(root, "package.json"), join(copy, "package.json"));
      symlinkSync(join(root, "node_modules"), join(copy, "node_modules"), "dir");
      const run = runNode([join(copy, "dist/cli.mjs"), "mcp"], initialize);

      expect(run.status).toBe(0);
      expect(firstResponse(run)).toMatchObject({
        id: 1,
        result: { serverInfo: { name: "chains" } },
      });
      expect(run.loaded).toContain(pathToFileURL(join(copy, "dist/mcp-stdio.mjs")).href);
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });
});

describe("the load hook", () => {
  /* The reader looks away until the child is done importing, so the report meets a full pipe. */
  it("reports every load to a reader that falls behind", async () => {
    const marker = "data:text/javascript,//";
    const script = `process.stderr;
for (let index = 0; index < 6000; index += 1) {
  await import(${JSON.stringify(marker)} + String(index).padStart(120, "0"));
}
console.log("imported");`;
    const child = spawn(process.execPath, ["--import", hook, "--input-type=module", "-e", script], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    await once(child.stdout, "data");
    await sleep(200);
    const loaded = loadedFrom(await text(child.stderr));

    expect(loaded.filter((url) => url.startsWith(marker))).toHaveLength(6000);
  }, 20_000);
});

describe("chains source under plain Node", () => {
  it("imports every module in src without a loader", () => {
    const modules = globSync("src/**/*.ts", { cwd: root }).filter(
      (file) => file !== join("src", "cli.ts"),
    );
    const script = modules
      .map((file) => `await import(${JSON.stringify(pathToFileURL(join(root, file)).href)});`)
      .join("\n");
    const run = runNode(["--input-type=module", "-e", script]);

    expect(modules.length).toBeGreaterThan(0);
    expect(run.status).toBe(0);
    expect(run.loaded).toEqual(
      expect.arrayContaining(modules.map((file) => pathToFileURL(join(root, file)).href)),
    );
  });

  it("imports the AI SDK entry without the MCP SDK, the executors or a single chain", () => {
    const entry = pathToFileURL(join(root, "src/ai.ts")).href;
    const prefix = `${pathToFileURL(root).href}/`;
    const run = runNode(["--input-type=module", "-e", `await import(${JSON.stringify(entry)});`]);
    const source = run.loaded
      .filter((url) => url.startsWith(`${prefix}src/`))
      .map((url) => url.slice(prefix.length));

    expect(run.status).toBe(0);
    expect(packagesOf(run.loaded)).toContain("ai");
    expect(packagesOf(run.loaded)).not.toContain("@modelcontextprotocol/server");
    expect(source).toEqual(["src/ai.ts", "src/tools.ts"]);
  });
});
