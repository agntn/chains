import { fileURLToPath } from "node:url";

/** Bundled from the checkout's sources: a deploy needs neither dist/ nor the root node_modules. */
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const librarySource = fileURLToPath(new URL("../src/index.ts", import.meta.url));

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: fileURLToPath(new URL("./", import.meta.url)),
  alias: {
    "@agntn/chains": librarySource,
  },
  /** The dev server serves files under workspaceDir only; the library and its package.json sit one level up. */
  vite: {
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
  llms: {
    domain: "https://chains.agntn.dev",
    title: "@agntn/chains",
    description:
      "Canonical blockchain classes, aliases and address validation for 32 chains, as a library, a CLI, an MCP server and Pi and OMP extensions.",
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
        "lucide:arrow-right",
        "lucide:arrow-up-right",
        "lucide:badge-check",
        "lucide:book-open",
        "lucide:bot",
        "lucide:check",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:circle-check",
        "lucide:circle-x",
        "lucide:copy",
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
        "token:arc",
        "token:arbitrum-one",
        "token:avax",
        "token:base",
        "token:berachain",
        "token:bnb",
        "token:bch",
        "token:btc",
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
    prerender: {
      crawlLinks: true,
      routes: ["/", "/playground", "/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"],
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  compatibilityDate: "2026-09-03",
  /** Fonts live in public/fonts and app/assets/fonts.css, where nuxt-og-image reads them from. */
  css: ["~/assets/fonts.css"],
  fonts: {
    families: [
      { name: "Space Grotesk", provider: "local", weights: [400, 500, 600] },
      { name: "Space Mono", provider: "local", weights: [400, 700] },
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
            default: "github-light",
            light: "github-light",
            dark: "poimandres",
          },
        },
      },
    },
  },
});
