import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve as resolvePath } from "node:path";
import { createCli } from "@agntn/tools/cli";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { cliOptions } from "../../src/cli-commands.ts";
import { Chain, register, type ChainKey } from "../../src/index.ts";

/** No built-in chain lacks a txid check any more, so the CLI message needs a registered stand-in. */
class Unvalidated extends Chain {
  static readonly key = "unvalidated" as ChainKey;
  readonly type = "octra" as const;
  readonly name = "Unvalidated";
  readonly symbol = "NONE";
  readonly explorer = "https://example.com";
}

register(Unvalidated);

const ESCAPE = String.fromCodePoint(27);
const CSI = String.fromCodePoint(155);
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/** What one command line wrote and how it exited. */
interface Run {
  readonly code: typeof process.exitCode;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * Runs one command line through the CLI the bin builds and collects both streams.
 *
 * @param args - Words after `chains`.
 * @returns {Promise<Run>} The exit code and what reached stdout and stderr, trailing newline cut.
 */
async function run(...args: readonly string[]): Promise<Run> {
  const written = { stdout: "", stderr: "" };
  for (const stream of ["stdout", "stderr"] as const) {
    vi.spyOn(process[stream], "write").mockImplementation((chunk: unknown) => {
      written[stream] += String(chunk);
      return true;
    });
  }
  await createCli(cliOptions).run(args);
  const code = process.exitCode;
  vi.restoreAllMocks();
  return { code, stdout: written.stdout.trimEnd(), stderr: written.stderr.trimEnd() };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("CLI output escaping", () => {
  it("quotes a rejected address instead of letting it write its own line", async () => {
    const address = `1BadAddress\n${ESCAPE}[32m Valid Bitcoin address`;

    const { code, stderr } = await run("validate", "bitcoin", address);

    expect(code).toBe(1);
    expect(stderr).not.toMatch(CONTROL);
    expect(stderr).toBe(
      'Invalid Bitcoin (bitcoin) address: "1BadAddress\\n\\u001b[32m Valid Bitcoin address" - 39 characters, more than the 35 this chain writes; 7 characters that are not base58 digits, the first "\\n" at position 12',
    );
  });

  it("blanks the C1 bytes JSON.stringify leaves alone in an unresolved chain", async () => {
    const { code, stderr } = await run("resolve", `doge${CSI}31m`);

    expect(code).toBe(1);
    for (const line of stderr.split("\n")) expect(line).not.toMatch(CONTROL);
    expect(stderr).toContain("Unsupported chain:");
  });

  it("quotes a family filter that matched nothing and exits 1", async () => {
    const { code, stderr } = await run("list", "evm\nutxo");

    expect(code).toBe(1);
    for (const line of stderr.split("\n")) expect(line).not.toMatch(CONTROL);
    expect(stderr.split("\n")[0]).toBe('Unknown chain family: "evm\\nutxo"');
  });

  it("says why an EVM address fails", async () => {
    const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F98";

    const { stderr } = await run("validate", "ethereum", address);

    expect(stderr).toBe(
      `Invalid Ethereum (ethereum) address: "${address}" - 39 hex digits after 0x, not 40`,
    );
  });

  it("says what a valid address pays to", async () => {
    const { code, stdout } = await run("validate", "bitcoin", "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2");

    expect(code).toBeUndefined();
    expect(stdout).toBe(
      'Valid Bitcoin (bitcoin) address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2" - p2pkh, hash160 77bff20c60e522dfaa3350c39b030a5d004e839a',
    );
  });

  it("still exits 1 on a rejected address", async () => {
    await expect(run("validate", "bitcoin", "not-an-address")).resolves.toMatchObject({ code: 1 });
  });

  it("quotes a rejected txid under --txid and exits 1", async () => {
    const txid = `deadbeef\n${ESCAPE}[32m Valid Bitcoin txid`;

    const { code, stderr } = await run("validate", "bitcoin", txid, "--txid");

    expect(stderr).not.toMatch(CONTROL);
    expect(stderr).toBe(
      'Invalid Bitcoin (bitcoin) txid: "deadbeef\\n\\u001b[32m Valid Bitcoin txid" - characters that are not hex digits; 33 characters, not 64',
    );
    expect(code).toBe(1);
  });

  it("fails a rejected txid on the txid command as well", async () => {
    const { code, stderr } = await run("txid", "ethereum", "0x12");

    expect(stderr).toBe('Invalid Ethereum (ethereum) txid: "0x12" - 2 hex digits after 0x, not 64');
    expect(code).toBe(1);
  });

  it("names the missing txid validator instead of a format failure", async () => {
    const { code, stderr } = await run("validate", "unvalidated", "deadbeef", "--txid");

    expect(stderr).toBe("Unvalidated (unvalidated) carries no txid validator");
    expect(code).toBe(1);
  });
});

describe("CLI commands kept from citty", () => {
  it("prints the bare canonical key for resolve", async () => {
    await expect(run("resolve", "btc")).resolves.toEqual({
      code: undefined,
      stdout: "bitcoin",
      stderr: "",
    });
  });

  it("answers info through its lookup alias too", async () => {
    const info = await run("info", "matic");
    const lookup = await run("lookup", "matic");

    expect(info.stdout.split("\n")[0]).toBe("Polygon PoS (polygon)");
    expect(lookup).toEqual(info);
  });
});

/** What reached the stream left open and how the CLI exited. */
interface Closed {
  readonly code: number | null;
  readonly output: string;
}

/**
 * Runs the CLI from source with one of its output streams closed before the first write, as after
 * `| head -1` or a pager that quits early, and collects what reached the other one.
 *
 * @param {"stdout" | "stderr"} closed - The stream whose reader goes away.
 * @param {readonly string[]} args - Arguments for `chains`.
 * @returns {Promise<Closed>} The exit code and the text on the stream left open.
 */
async function closedPipe(
  closed: "stdout" | "stderr",
  ...args: readonly string[]
): Promise<Closed> {
  const child = spawn(
    process.execPath,
    [resolvePath(import.meta.dirname, "../../src/cli.ts"), ...args],
    {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  child[closed].destroy();
  let output = "";
  child[closed === "stdout" ? "stderr" : "stdout"]
    .setEncoding("utf8")
    .on("data", (chunk: string) => (output += chunk));
  await once(child, "close");
  return { code: child.exitCode, output };
}

describe("CLI with a closed pipe", () => {
  it.each([[["list"]], [["list", "--json"]]])(
    "chains %j ends quietly when stdout closes",
    async (args) => {
      await expect(closedPipe("stdout", ...args)).resolves.toEqual({ code: 0, output: "" });
    },
  );

  it("keeps exit code 1 when stderr closes under a failure", async () => {
    await expect(closedPipe("stderr", "validate", "bitcoin", "not-an-address")).resolves.toEqual({
      code: 1,
      output: "",
    });
  });
});
