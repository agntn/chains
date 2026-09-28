import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve as resolvePath } from "node:path";
import { runCommand } from "citty";
import consola from "consola";
import { afterEach, describe, expect, it, vi } from "vitest";
import list from "../../src/commands/list.ts";
import { Chain, register, type ChainKey } from "../../src/index.ts";
import resolve from "../../src/commands/resolve.ts";
import validate from "../../src/commands/validate.ts";

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

/**
 * Runs one subcommand and returns what it wrote through the given consola level.
 *
 * @param {"error" | "warn"} level - Consola method to capture.
 * @param {() => Promise<unknown>} execute - Bound command invocation.
 * @returns {Promise<string>} Text written through the selected level.
 */
async function capture(level: "error" | "warn", execute: () => Promise<unknown>): Promise<string> {
  const spy = vi.spyOn(consola, level).mockImplementation(() => {});
  await execute();
  return spy.mock.calls.map(([first]) => String(first)).join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("CLI output escaping", () => {
  it("quotes a rejected address instead of letting it write its own line", async () => {
    const address = `1BadAddress\n${ESCAPE}[32m Valid Bitcoin address`;

    const written = await capture("error", () =>
      runCommand(validate, { rawArgs: ["bitcoin", address] }),
    );

    expect(written).not.toMatch(CONTROL);
    expect(written).toBe(
      'Invalid bitcoin address: "1BadAddress\\n\\u001b[32m Valid Bitcoin address" - 39 characters, more than the 35 this chain writes; 7 characters that are not base58 digits, the first "\\n" at position 12',
    );
  });

  it("blanks the C1 bytes JSON.stringify leaves alone in an unresolved chain", async () => {
    const written = await capture("error", () =>
      runCommand(resolve, { rawArgs: [`doge${CSI}31m`] }),
    );

    expect(written).not.toMatch(CONTROL);
    expect(written).toContain("Unsupported chain:");
  });

  it("quotes a family filter that matched nothing", async () => {
    const written = await capture("warn", () =>
      runCommand(list, { rawArgs: ["--type", "evm\nutxo"] }),
    );

    expect(written).not.toMatch(CONTROL);
    expect(written).toBe('No registered chain has type: "evm\\nutxo"');
  });

  it("says why an EVM address fails", async () => {
    const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F98";

    const written = await capture("error", () =>
      runCommand(validate, { rawArgs: ["ethereum", address] }),
    );

    expect(written).toBe(`Invalid ethereum address: "${address}" - 39 hex digits after 0x, not 40`);
  });

  it("still exits 1 on a rejected address", async () => {
    await capture("error", () => runCommand(validate, { rawArgs: ["bitcoin", "not-an-address"] }));

    expect(process.exitCode).toBe(1);
  });

  it("quotes a rejected txid under --txid and exits 1", async () => {
    const txid = `deadbeef\n${ESCAPE}[32m Valid Bitcoin txid`;

    const written = await capture("error", () =>
      runCommand(validate, { rawArgs: ["bitcoin", txid, "--txid"] }),
    );

    expect(written).not.toMatch(CONTROL);
    expect(written).toBe(
      'Invalid bitcoin txid: "deadbeef\\n\\u001b[32m Valid Bitcoin txid" - characters that are not hex digits; 33 characters, not 64',
    );
    expect(process.exitCode).toBe(1);
  });

  it("names the missing txid validator instead of a format failure", async () => {
    const written = await capture("error", () =>
      runCommand(validate, { rawArgs: ["unvalidated", "deadbeef", "--txid"] }),
    );

    expect(written).toBe("Txid validation is not supported for unvalidated");
    expect(process.exitCode).toBe(1);
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
      // consola keeps its output quiet under NODE_ENV=test, and the text has to reach the pipe.
      env: { ...process.env, CONSOLA_LEVEL: "3" },
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
