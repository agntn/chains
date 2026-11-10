import { writeSync } from "node:fs";
import { registerHooks } from "node:module";

/**
 * Every module URL Node loaded after this file, reported as one `@loaded [...]` line on stderr at
 * exit. Written synchronously, because a piped stderr flushes late and the exit handler can't wait.
 */
const loaded: string[] = [];

registerHooks({
  load(url, context, nextLoad) {
    loaded.push(url);
    return nextLoad(url, context);
  },
});

/** A full pipe takes the report in parts and answers `EAGAIN` in between, so keep writing. */
function report(): void {
  const bytes = Buffer.from(`\n@loaded ${JSON.stringify(loaded)}\n`);
  let offset = 0;
  while (offset < bytes.length) {
    try {
      offset += writeSync(2, bytes, offset);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EAGAIN")) {
        throw error;
      }
    }
  }
}

process.on("exit", report);
