import { fileURLToPath } from "node:url";
import { chainsTheme } from "./shiki-theme";

/** Bundled from the checkout's sources: a deploy needs neither dist/ nor the root node_modules. */
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const librarySource = fileURLToPath(new URL("../src/index.ts", import.meta.url));

/** Runtime deps under src/index.ts, installed here so they resolve from docs/node_modules. */
const libraryDependencies = ["@agntn/encodings", "@agntn/hashes"];

/** Every subpath src/ imports, so dev bundles them up front, not on demand. */
const libraryEntries = [
  "@agntn/encodings/base32",
  "@agntn/encodings/base58",
  "@agntn/encodings/base64",
  "@agntn/encodings/bech32",
  "@agntn/hashes/blake256",
  "@agntn/hashes/blake2b",
  "@agntn/hashes/keccak",
];

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: fileURLToPath(new URL("./", import.meta.url)),
  alias: {
    "@agntn/chains": librarySource,
  },
  vite: {
    resolve: {
      /** Bare imports in ../src resolve upwards from the importer and skip docs/node_modules. */
      dedupe: libraryDependencies,
    },
    optimizeDeps: {
      include: libraryEntries,
    },
    /** Dev serves workspaceDir only, and the library with its package.json sits one level up. */
    server: {
      fs: {
        allow: [repoRoot],
      },
    },
  },
  devtools: { enabled: false },
  telemetry: false,
  site: {
    url: "https://chains.agntn.dev",
    name: "@agntn/chains",
  },
  /** The playground has no markdown twin, so agents get the page itself, not a `/raw` 404. */
  agentDiscovery: {
    excludePrefixes: { extend: ["/playground"] },
  },
  /** Docus lists `content/` only and leaves app routes out, so the Vue pages come from here. */
  sitemap: {
    sources: ["/api/__sitemap__/pages"],
  },
  llms: {
    domain: "https://chains.agntn.dev",
    title: "@agntn/chains",
    description:
      "Canonical blockchain classes, aliases and address validation for 36 chains, as a library, a CLI, an MCP server, Pi and OMP extensions and AI SDK tools.",
    sections: [
      {
        title: "Playground",
        description: "Resolve a chain, validate an address or identify one, in the browser.",
        links: [
          {
            title: "Playground",
            href: "https://chains.agntn.dev/playground",
            description: "The library running in the page: lookup, validate, identify and list.",
          },
        ],
      },
      /** Spelled out, or agent discovery sees the link above and leaves every content page out. */
      {
        title: "Guide",
        contentCollection: "docs",
        contentFilters: [{ field: "path", operator: "LIKE", value: "/guide%" }],
      },
      {
        title: "Chains",
        contentCollection: "docs",
        contentFilters: [{ field: "path", operator: "LIKE", value: "/chains%" }],
      },
    ],
  },
  /** Docus pages define their own OG images; the alt text is the one thing they leave unset. */
  ogImage: {
    defaults: {
      alt: "@agntn/chains: canonical blockchain classes, aliases and address validation",
    },
  },
  icon: {
    clientBundle: {
      icons: [
        "lucide:arrow-down",
        "lucide:arrow-left",
        "lucide:arrow-right",
        "lucide:arrow-up",
        "lucide:arrow-up-right",
        "lucide:badge-check",
        "lucide:book-open",
        "lucide:bot",
        "lucide:check",
        "lucide:check-circle",
        "lucide:chevron-down",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:chevrons-up-down",
        "lucide:circle-alert",
        "lucide:circle-check",
        "lucide:circle-x",
        "lucide:copy",
        "lucide:expand",
        "lucide:external-link",
        "lucide:flask-conical",
        "lucide:leaf",
        "lucide:link",
        "lucide:list-tree",
        "lucide:octagon",
        "lucide:plus",
        "lucide:scan-search",
        "lucide:shield-alert",
        "lucide:sigma",
        "lucide:terminal",
        "lucide:x",
        "simple-icons:github",
        "simple-icons:npm",
        "token:ada",
        "token:apt",
        "token:ar",
        "token:arbitrum-one",
        "token:arc",
        "token:avax",
        "token:base",
        "token:bch",
        "token:berachain",
        "token:bnb",
        "token:bsv",
        "token:btc",
        "token:btg",
        "token:dash",
        "token:dcr",
        "token:doge",
        "token:eth",
        "token:ftm",
        "token:gno",
        "token:linea",
        "token:ltc",
        "token:op",
        "token:pol",
        "token:scroll",
        "token:sol",
        "token:sui",
        "token:ton",
        "token:trx",
        "token:xec",
        "token:xlm",
        "token:xmr",
        "token:xrp",
        "token:zec",
        "token:zksync",
        "vscode-icons:file-type-js",
        "vscode-icons:file-type-json",
        "vscode-icons:file-type-shell",
        "vscode-icons:file-type-typescript",
      ],
    },
  },
  colorMode: {
    preference: "dark",
  },
  /** Docus links /favicon.ico without shipping one; the icons and manifest are cut from public/favicon.svg. */
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      meta: [
        { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0b0d10" },
        { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#eef1f4" },
        { name: "apple-mobile-web-app-title", content: "chains" },
        { name: "author", content: "oritwoen" },
        { property: "og:locale", content: "en_US" },
      ],
    },
  },
  /** Docus ships an MCP endpoint that wants the Cloudflare Agents SDK on Workers. Not needed. */
  mcp: {
    enabled: false,
  },
  nitro: {
    preset: "cloudflare_module",
    compatibilityDate: "2026-09-03",
    /** Nitro targets ES2019 unless told otherwise, and the library writes BigInt literals. */
    esbuild: { options: { target: "es2024" } },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  /** Nuxt's own prerender option. The same keys under `nitro.prerender` are deprecated. */
  prerender: {
    crawlLinks: true,
    routes: ["/", "/playground", "/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"],
  },
  compatibilityDate: "2026-09-03",
  /** Fonts live in public/fonts and app/assets/fonts.css, where nuxt-og-image reads them from. */
  css: ["~/assets/fonts.css"],
  fonts: {
    families: [
      { name: "Figtree", provider: "local", weights: [400, 500] },
      { name: "Fira Code", provider: "local", weights: [400, 500] },
    ],
  },
  content: {
    database: {
      type: "d1",
      bindingName: "DB",
    },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: chainsTheme,
            light: chainsTheme,
            dark: chainsTheme,
          },
        },
      },
    },
  },
});
