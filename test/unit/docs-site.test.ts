import { readFileSync, readdirSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { describe, expect, it } from "vite-plus/test";
import { type Chain, type ChainKey, type DecodedAddress, getChain } from "../../src/index.ts";
import {
  identifyAddress,
  listChains,
  lookupChain,
  validateChainAddress,
  validateChainTxid,
} from "../../src/tool-operations.ts";

/** What `docs/app/utils/chains.ts` exports and these tests read. */
interface SiteChains {
  readonly CHAINS: readonly {
    readonly key: ChainKey;
    readonly alias: string;
    readonly sample: string;
    readonly chain: Chain;
  }[];
  readonly FAMILIES: readonly { readonly key: string }[];
}

/** What `docs/app/utils/tools.ts` exports: the tool text, written a second time. */
interface SiteTools {
  readonly describeAddress: (decoded: DecodedAddress) => string | undefined;
  readonly identifyText: (address: string) => string;
  readonly listText: (family?: string) => string;
  readonly lookupText: (chain: Readonly<Chain>) => string;
  readonly validateText: (...call: readonly [Readonly<Chain>, string, boolean, string?]) => string;
  readonly validateTxidText: (
    ...call: readonly [Readonly<Chain>, string, boolean, string?]
  ) => string;
}

const docs = new URL("../../docs/", import.meta.url);

const library = new URL("../../src/index.ts", import.meta.url).href;

/* Loads a site util under plain Node: Vite wants the tsconfig only `nuxt prepare` writes. */
async function siteModule(file: string): Promise<unknown> {
  const source = stripTypeScriptTypes(readFileSync(new URL(file, docs), "utf8"));
  const wired = source.replace('"@agntn/chains"', JSON.stringify(library));
  return import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(wired)}`);
}

const { CHAINS, FAMILIES } = (await siteModule("app/utils/chains.ts")) as SiteChains;
const { describeAddress, identifyText, listText, lookupText, validateText, validateTxidText } =
  (await siteModule("app/utils/tools.ts")) as SiteTools;

/** No chain reads this, and the override character has to come out blanked on both sides. */
const NONSENSE = `not${String.fromCodePoint(0x202e)}an address`;

/* The text a tool result carries. */
function textOf(result: { readonly content: readonly { readonly text: string }[] }): string {
  return result.content[0]?.text ?? "";
}

/* The reason a chain gives for turning a value down, when it gives one. */
function reasonOf(check: () => unknown): string | undefined {
  try {
    check();
  } catch (error) {
    if (error instanceof Error && "reason" in error && typeof error.reason === "string") {
      return error.reason;
    }
  }
  return undefined;
}

/* The string literals of the array a file under `docs/` writes after a marker. */
function literalsAfter(file: string, marker: string): string[] {
  const source = readFileSync(new URL(file, docs), "utf8");
  const start = source.indexOf(marker);
  const list = start === -1 ? "" : source.slice(start, source.indexOf("]", start));
  return [...list.matchAll(/"([^"]+)"/gu)].map((match) => match[1] ?? "");
}

describe("the tool text the site repeats", () => {
  it.each(CHAINS)("answers chains_lookup for $key like the library", ({ key, chain }) => {
    expect(lookupText(chain)).toBe(textOf(lookupChain(key)));
  });

  it("answers chains_list like the library, whole and by family", () => {
    expect(listText()).toBe(textOf(listChains()));
    for (const { key } of FAMILIES) {
      expect(listText(key)).toBe(textOf(listChains(key)));
    }
  });

  it.each(CHAINS)("answers chains_address_identify for the $key sample", ({ sample }) => {
    expect(identifyText(sample)).toBe(textOf(identifyAddress(sample)));
  });

  it("answers chains_address_identify for an address nobody claims", () => {
    expect(identifyText(NONSENSE)).toBe(textOf(identifyAddress(NONSENSE)));
  });

  it.each(CHAINS)(
    "answers chains_address_validate for $key, pass and fail",
    ({ key, chain, sample }) => {
      const summary = describeAddress(chain.decodeAddress(sample));
      expect(validateText(chain, sample, true, summary)).toBe(
        textOf(validateChainAddress(key, sample)),
      );
      const refusal = textOf(validateChainAddress(key, NONSENSE));
      expect(refusal).toMatch(/^Invalid /u);
      expect(
        validateText(
          chain,
          NONSENSE,
          false,
          reasonOf(() => chain.assertAddress(NONSENSE)),
        ),
      ).toBe(refusal);
    },
  );

  it.each(CHAINS)("answers chains_txid_validate for a txid $key refuses", ({ key, chain }) => {
    const refusal = textOf(validateChainTxid(key, NONSENSE));
    expect(refusal).toMatch(/^Invalid /u);
    expect(
      validateTxidText(
        chain,
        NONSENSE,
        false,
        reasonOf(() => chain.assertTxid(NONSENSE)),
      ),
    ).toBe(refusal);
  });
});

describe("the chain table behind the site", () => {
  it.each(CHAINS)("shows a sample $key accepts and identify finds", ({ key, chain, sample }) => {
    expect(chain.assertAddress(sample)).toBe(sample);
    expect(identifyAddress(sample).details.matches).toContain(key);
  });

  it.each(CHAINS)("spells $key in a way getChain resolves", ({ key, alias }) => {
    expect(getChain(alias).key).toBe(key);
  });
});

describe("the site's own pages", () => {
  const routes = readdirSync(new URL("app/pages/", docs))
    .filter((file) => file.endsWith(".vue"))
    .map((file) => `/${file.slice(0, -".vue".length)}`)
    .sort();

  it("lists every Vue page in the sitemap source, which Docus can't see", () => {
    expect(literalsAfter("server/api/__sitemap__/pages.ts", "const PAGES =").sort()).toEqual(
      routes,
    );
  });

  it("keeps every Vue page out of agent discovery, where its /raw link would 404", () => {
    expect(literalsAfter("nuxt.config.ts", "excludePrefixes:").sort()).toEqual(routes);
  });

  it("draws nothing from Math.random, so the server and the client render the same page", () => {
    const sources = readdirSync(new URL("app/", docs), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(?:ts|vue)$/u.test(file))
      .filter((file) => readFileSync(new URL(`app/${file}`, docs), "utf8").includes("Math.random"));
    expect(sources).toEqual([]);
  });

  it("renders what a visitor types as text, never through v-html", () => {
    const components = readdirSync(new URL("app/", docs), { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".vue"))
      .filter((file) => readFileSync(new URL(`app/${file}`, docs), "utf8").includes("v-html"));
    expect(components).toEqual([]);
  });
});
