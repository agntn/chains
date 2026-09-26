import { resolve } from "node:path";
import { rolldown } from "rolldown";
import { describe, expect, it } from "vitest";
import { builtins } from "../../src/chains/index.ts";

const entry = resolve(import.meta.dirname, "../../dist/index.mjs");

/**
 * Bundles an app that imports one name from the built package, the way a consumer's
 * bundler sees it: `obuild` puts the whole core into one chunk, so what stays out is
 * decided statement by statement, not by `sideEffects`.
 *
 * @param {string} name - Export to import.
 * @returns {Promise<string[]>} The chain keys the bundle carries.
 */
async function bundledKeys(name: string): Promise<string[]> {
  const bundle = await rolldown({
    input: "app",
    logLevel: "silent",
    plugins: [
      {
        name: "app",
        resolveId: (id) => (id === "app" ? id : undefined),
        load: (id) =>
          id === "app"
            ? `import { ${name} } from ${JSON.stringify(entry)}; console.log(${name});`
            : undefined,
      },
    ],
  });
  const { output } = await bundle.generate({ format: "esm" });
  await bundle.close();
  return Array.from(output[0].code.matchAll(/static key = "([^"]+)"/gu), (match) => match[1] ?? "");
}

describe("tree-shaking the built package", () => {
  it("leaves every chain out of an app that imports an error class", async () => {
    await expect(bundledKeys("InvalidAddressError")).resolves.toEqual([]);
  });

  it.each(builtins.map((chainClass) => [chainClass.name, chainClass.key] as const))(
    "keeps %s and no other chain",
    async (name, key) => {
      await expect(bundledKeys(name)).resolves.toEqual([key]);
    },
  );

  it("keeps every chain for getChain, which resolves any of them", async () => {
    const keys = await bundledKeys("getChain");
    expect(keys.sort()).toEqual(builtins.map((chainClass) => chainClass.key).sort());
  });
});
