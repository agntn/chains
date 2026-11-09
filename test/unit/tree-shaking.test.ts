import { resolve } from "node:path";
import { rolldown } from "rolldown";
import { describe, expect, it } from "vite-plus/test";
import { builtins } from "../../src/chains/index.ts";

const entry = resolve(import.meta.dirname, "../../dist/index.mjs");

/**
 * Bundles an app that imports one name from the built package, the way a consumer's
 * bundler sees it: `obuild` puts the whole core into one chunk, so what stays out is
 * decided statement by statement, not by `sideEffects`.
 *
 * @param {string} name - Export to import.
 * @returns {Promise<{ code: string; modules: string[] }>} The bundle and the files it was built from.
 */
async function bundled(name: string): Promise<{ code: string; modules: string[] }> {
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
  return { code: output[0].code, modules: Object.keys(output[0].modules) };
}

/**
 * Lists the chain classes a bundle carries, by the `static key` each one declares.
 *
 * @param {string} name - Export to import.
 * @returns {Promise<string[]>} The chain keys the bundle carries.
 */
async function bundledKeys(name: string): Promise<string[]> {
  const { code } = await bundled(name);
  return Array.from(code.matchAll(/static key = "([^"]+)"/gu), (match) => match[1] ?? "");
}

/**
 * Lists the npm packages a bundle pulled in, which is where the hashes live.
 *
 * @param {string} name - Export to import.
 * @returns {Promise<string[]>} Every bundled file that sits under `node_modules`.
 */
async function bundledPackages(name: string): Promise<string[]> {
  const { modules } = await bundled(name);
  return modules.filter((id) => id.includes("/node_modules/"));
}

describe("tree-shaking the built package", () => {
  it("leaves every chain out of an app that imports an error class", async () => {
    await expect(bundledKeys("InvalidAddressError")).resolves.toEqual([]);
  });

  it("reads metadata with no chain class and no hash behind it", async () => {
    await expect(bundledKeys("metadata")).resolves.toEqual([]);
    await expect(bundledPackages("metadata")).resolves.toEqual([]);
    await expect(bundledPackages("Decred")).resolves.not.toEqual([]);
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
