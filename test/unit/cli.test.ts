import { runCommand, type ArgsDef, type CommandDef } from "citty";
import consola from "consola";
import { afterEach, describe, expect, it, vi } from "vitest";
import list from "../../src/commands/list.ts";
import resolve from "../../src/commands/resolve.ts";
import validate from "../../src/commands/validate.ts";

const ESCAPE = String.fromCodePoint(27);
const CSI = String.fromCodePoint(155);
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/** Runs one subcommand and returns what it wrote through the given consola level. */
async function capture<T extends ArgsDef>(
  command: CommandDef<T>,
  level: "error" | "warn",
  rawArgs: string[],
): Promise<string> {
  const spy = vi.spyOn(consola, level).mockImplementation(() => {});
  await runCommand(command, { rawArgs });
  return spy.mock.calls.map(([first]) => String(first)).join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("CLI output escaping", () => {
  it("quotes a rejected address instead of letting it write its own line", async () => {
    const address = `1BadAddress\n${ESCAPE}[32m Valid Bitcoin address`;

    const written = await capture(validate, "error", ["bitcoin", address]);

    expect(written).not.toMatch(CONTROL);
    expect(written).toBe(
      'Invalid bitcoin address: "1BadAddress\\n\\u001b[32m Valid Bitcoin address"',
    );
  });

  it("blanks the C1 bytes JSON.stringify leaves alone in an unresolved chain", async () => {
    const written = await capture(resolve, "error", [`doge${CSI}31m`]);

    expect(written).not.toMatch(CONTROL);
    expect(written).toContain("Unsupported chain:");
  });

  it("quotes a family filter that matched nothing", async () => {
    const written = await capture(list, "warn", ["--type", "evm\nutxo"]);

    expect(written).not.toMatch(CONTROL);
    expect(written).toBe('No registered chain has type: "evm\\nutxo"');
  });

  it("still exits 1 on a rejected address", async () => {
    await capture(validate, "error", ["bitcoin", "not-an-address"]);

    expect(process.exitCode).toBe(1);
  });
});
