import { createCli } from "@agntn/tools/cli";
import { vi } from "vite-plus/test";
import { cliOptions } from "../src/cli-commands.ts";

/** What one command line wrote and how it exited. */
export interface Run {
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
export async function run(...args: readonly string[]): Promise<Run> {
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
