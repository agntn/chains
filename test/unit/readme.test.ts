import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { run } from "../run-cli.ts";

/** One command the README runs and the output it prints right under it. */
const TRANSCRIPT = /```bash\n(?:npx @agntn\/chains|chains) ([^\n]+)\n```\n\n```\n(.+?)\n```/gsu;

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

const transcripts = [...readme.matchAll(TRANSCRIPT)].map(
  ([, command = "", printed = ""]) => [command, printed] as const,
);

afterEach(() => {
  process.exitCode = undefined;
});

describe("README transcripts", () => {
  it("finds every command the README answers", () => {
    expect(transcripts.map(([command]) => command)).toEqual([
      "info matic",
      "identify 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      "identify bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a",
      "validate btc 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3",
    ]);
  });

  it.each(transcripts)("chains %s prints what the README shows", async (command, printed) => {
    const { stderr, stdout } = await run(...command.split(" "));

    expect(stdout || stderr).toBe(printed);
  });
});
