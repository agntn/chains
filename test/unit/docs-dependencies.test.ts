import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const docsDir = fileURLToPath(new URL("../../docs/", import.meta.url));

/** An import or re-export opening a line, or `import()` anywhere. Never a snippet in a string. */
const SPECIFIER =
  /^\s*(?:import|export|\})\b[^"'\n]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/gmu;

/** Not a package, whatever it looks like: a relative path, a Nuxt alias, a builtin. */
const LOCAL = /^(?:[.~#]|node:)/u;

/* The package a bare specifier names: `@scope/name` or `name`, without a subpath. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
}

/* Packages the site's own sources import. The library is an alias for `../src` and stays out. */
function importedPackages(): Set<string> {
  const files = globSync(["app/**/*.{ts,vue}", "server/**/*.ts", "shared/**/*.ts", "*.ts"], {
    cwd: docsDir,
  });
  const names = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(`${docsDir}${file}`, "utf8").matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3] ?? "";
      if (!LOCAL.test(specifier) && specifier !== "@agntn/chains") {
        names.add(packageName(specifier));
      }
    }
  }
  return names;
}

const srcDir = fileURLToPath(new URL("../../src/", import.meta.url));

/** The runtime packages the core imports, each one a registry of its own behind the root. */
const LIBRARY_PACKAGES = ["@agntn/encodings", "@agntn/hashes"];

/* Every specifier `src/` imports from the runtime packages, sorted and once each. */
function librarySpecifiers(): string[] {
  const specifiers = new Set<string>();
  for (const file of globSync("**/*.ts", { cwd: srcDir })) {
    for (const match of readFileSync(`${srcDir}${file}`, "utf8").matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3] ?? "";
      if (LIBRARY_PACKAGES.includes(packageName(specifier))) specifiers.add(specifier);
    }
  }
  return [...specifiers].sort();
}

/* The string literals of the array `docs/nuxt.config.ts` assigns to a name. */
function configList(name: string): string[] {
  const config = readFileSync(`${docsDir}nuxt.config.ts`, "utf8");
  const start = config.indexOf(`const ${name} = [`);
  const list = start === -1 ? "" : config.slice(start, config.indexOf("]", start));
  return [...list.matchAll(/"([^"]+)"/gu)].map((match) => match[1] ?? "");
}

describe("the library's runtime packages", () => {
  it("come in by subpath, since either root loads every codec or hash there is", () => {
    const specifiers = librarySpecifiers();
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((specifier) => LIBRARY_PACKAGES.includes(specifier))).toEqual([]);
  });

  it("are listed for the site, which bundles `src/` and prebundles each subpath", () => {
    expect(configList("libraryDependencies")).toEqual(LIBRARY_PACKAGES);
    expect(configList("libraryEntries").sort()).toEqual(librarySpecifiers());
  });

  it("pin the hashes that encodings pins, so an install holds one copy", () => {
    const read = (path: string) =>
      JSON.parse(readFileSync(new URL(`../../node_modules/${path}`, import.meta.url), "utf8")) as {
        readonly version: string;
        readonly dependencies?: Readonly<Record<string, string>>;
      };
    expect(read("@agntn/encodings/package.json").dependencies?.["@agntn/hashes"]).toBe(
      read("@agntn/hashes/package.json").version,
    );
  });
});

describe("docs dependencies", () => {
  it("declares every package the site imports, since the workspace hoists nothing", () => {
    const manifest = JSON.parse(readFileSync(`${docsDir}package.json`, "utf8")) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly devDependencies?: Readonly<Record<string, string>>;
    };
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]);
    const imported = importedPackages();
    expect(imported).toContain("@nuxt/content");
    expect([...imported].filter((name) => !declared.has(name))).toEqual([]);
  });
});
