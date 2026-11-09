# docs/

Docus site for `@agntn/chains`. Markdown lives in `content/`. The playground is a Vue page that imports the library into the browser. There's no server API because the library needs none: the core never touches a network.

## Layout

```
docs/
├── DESIGN.md                      # the instruments this site owns and where it departs from the agntn design system
├── nuxt.config.ts                 # extends: ['docus'], cloudflare_module preset (Workers)
├── shiki-theme.ts                 # the code block theme, every colour a `--shiki-token-*` variable from app.css
├── app/app.config.ts              # title, github, the Nuxt UI variants that give controls the instrument look
├── app/app.css                    # tokens, the shared `console-*` instrument grammar, hero, roster, header, search, tooltip, `chains-*` classes
├── app/components/                # Docus overrides: header (logo, areas, section tabs, mobile menu), sidebar, table of contents, page header links, page surround, footer, callout; UI icons are Lucide, chain logos the monochrome token collection, GitHub and npm simple-icons
├── app/components/content/        # MDC components (`::landing-home`, `::chain-facts`, `::chain-roster`), the landing instruments, ChainsPlayground, ConsoleReticle, ConsoleResponse, the Prose* overrides
├── app/components/OgImage/        # Docs.takumi and Landing.takumi override the Docus OG templates
├── app/assets/fonts.css           # @font-face for the TTFs served from public/fonts (site and OG images)
├── app/composables/               # useLandingChain (one clock for every live instrument), useSubNavigation, useCopied, useRosterFlip
├── app/utils/                     # chains table (icons, aliases, samples over the library), tools.ts (the tool text, ported), tokens.ts and tool-response.ts (snippet and response colouring), roster.ts, formatting
├── app/pages/playground.vue       # playground, own route outside the docs layout, its own useSeo and OG image
├── server/api/__sitemap__/pages.ts # the Vue pages the Docus sitemap cannot see, for `sitemap.sources`
├── public/                        # fonts, favicon.svg and the icons and manifest cut from it, image.png (the landing OG card, for Pi)
├── content/index.md               # landing
├── content/1.guide/               # getting started, registry, validation, identify, metadata, cli, agents, custom, playground
└── content/2.chains/              # one page per chain, in registry order
```

## Commands

```bash
pnpm install          # anywhere in the repo: one workspace, one lockfile at the root
pnpm dev              # http://localhost:3000
pnpm build            # Cloudflare Workers output in .output/, content routes prerendered
pnpm deploy           # build, then wrangler deploy to chains.agntn.dev
pnpm generate         # static output; nothing on this site needs the worker at runtime
```

Deployment: Nitro preset `cloudflare_module`. Nuxt Content wants a D1 binding named `DB`. `wrangler.jsonc` carries it plus the `NUXT_SITE_URL` var, and Nitro merges that into the generated `.output/server/wrangler.json`. Create the database once with `wrangler d1 create agntn-chains` and put the id in `wrangler.jsonc`. Until then the id is all zeros on purpose, `pnpm deploy` with zeros binds nothing, so don't run it before the id is real. No KV binding. Nothing is fetched, so nothing is cached.

`@agntn/chains` is an alias in `nuxt.config.ts` for `../src/index.ts`. Vite and Nitro bundle the checkout's sources into the page and the worker, so `dist/` is never touched. `docs/` is a member of the root workspace. Workers Builds runs its install in `docs/`, pnpm walks up to the root lockfile and fills both `node_modules`. The subgraph under `src/index.ts` imports two packages from npm, `@agntn/encodings` and `@agntn/hashes`. The root package declares them and a bare import in `../src` resolves there, so `docs/package.json` doesn't repeat them. A new one still goes into `libraryDependencies` and its subpaths into `libraryEntries`, plus a check of both the browser bundle and the worker before anyone relies on it. The CLI, MCP and tool entries stay out of the alias.

Two things follow from the shared workspace:

- Nothing is hoisted, so every package the site's own files import sits in `docs/package.json`, and `test/unit/docs-dependencies.test.ts` at the root fails on the one you forgot. Versions live in the catalogs of the root `pnpm-workspace.yaml`.
- Peers resolve from the workspace root, and the root's TypeScript 7 has no JS API. Docus parses through `@typescript-eslint`, which needs one, so the site takes its own TypeScript from the `nuxt` catalog.

## Live values

- The look follows the agntn design system; `DESIGN.md` lists the instruments this site owns and its departures. Controls are Nuxt UI components whose look comes from their variant in `app.config.ts`, never a hand-built button with `console-*` classes.
- Every number on the landing and every chain dossier comes from the library at render time. `CHAINS` in `app/utils/chains.ts` maps `chains()` through `create(key)`, `useLandingChain` runs `assertAddress` and `identify` on the sample addresses. A chain added to the library shows up in the registry map and the roster by itself and needs one line in `PRESENTATION` for its icon, alias and sample. The chain pages in `content/2.chains/` are written by hand, though, so a new chain needs a page too.
- The samples are public test vectors and well known contracts, every one checked against `dist/` before it went into `PRESENTATION`. Check a new one the same way. Don't derive one by hand.
- The samples are deterministic, so SSR and the client agree and hydration doesn't flicker. Keep it that way. No `Math.random`, no clock inside a computed.
- `app/utils/tools.ts` repeats the text the five tools return, because `src/tool-operations.ts` isn't a package export. It mirrors `lookupChain`, `validateChainAddress`, `validateChainTxid`, `identifyAddress` and `listChains` line for line. A change to the wording in the library is a change here, and there's no test that catches the drift, so read both when touching either.
- `ChainsPlayground.vue` reads the deep link through a `watch(route.query)` registered in `onMounted` that fires once. A prerendered page hydrates with an empty query and Nuxt restores the address only afterwards, so reading `route.query` in setup gives you nothing. It writes state back with `router.replace` on every change. Reka refuses `""` as a menu value, so the family menu keys "every family" as `*` through `familyModel`, while the call still reads `""`.
- The playground catches `ChainsError` and shows the class name and the message. Anything else is a bug in the library and belongs there, not in a try/catch here.

## SEO

- `seo.schema` in `app/app.config.ts` emits the landing JSON-LD: `WebSite`, the agntn `Organization` as publisher, and a free `SoftwareApplication` with `sameAs` on GitHub and npm. Docs pages get `Article` plus `BreadcrumbList` from Docus on their own.
- The Docus sitemap reads content collections only. `server/api/__sitemap__/pages.ts` hands the Vue pages in `PAGES` to `@nuxtjs/sitemap` through `sitemap.sources`. A new page under `app/pages/` goes there too, and into `llms.sections` and `agentDiscovery.excludePrefixes` in `nuxt.config.ts`, or crawlers don't see it and agents get a `/raw` link that 404s.
- Docus links `/favicon.ico` without shipping one. `public/favicon.svg` is the source, the PNGs come from `rsvg-convert` and the `.ico` from ImageMagick, `app.head` in `nuxt.config.ts` links them with the manifest and theme colours.

## OG images

- `app/components/OgImage/Docs.takumi.vue` and `Landing.takumi.vue` override the Docus templates of the same name and are rendered by Takumi at build time. Takumi has no CSS variables, so the theme colours from `app.css` are repeated there as literals. Annoying, but that's what it is.
- nuxt-og-image doesn't see the faces `@nuxt/fonts` generates on this Nuxt version, but it does parse `@font-face` rules from the files in `css`. That's why `app/assets/fonts.css` declares the four Figtree and Fira Code TTFs in `public/fonts` and `fonts.families` uses the `local` provider. Site and OG images share the same files.
- Since Docus 5.15 the OG files are named by a hash, so a description never reaches a file name and may end in a period.

## Constraints

- Text a visitor types into the playground is rendered as text, through interpolation or a `<pre>`. Never `v-html`, never evaluate.
- Chain icons, aliases and sample addresses live once, in `app/utils/chains.ts`. Sidebar, registry map, roster, playground chips and `::chain-facts` read from it; the chain pages repeat the icon in their frontmatter. Logos come from `@iconify-json/token`, the monochrome set, so they take the muted and accent colours like every other icon. Pepecoin and Octra aren't in it and keep a Lucide glyph, and `token:pepe` is the ERC-20 memecoin, not Pepecoin, so don't reach for it. Names, symbols, families, coin types and identifiers come from the library and aren't repeated here.
- Every address quoted in `content/` passed `assertAddress` on `dist/index.mjs`, and every rejected one on the validation page was checked to fail. Check a new one the same way before writing it down.
- The site makes no network request for its own work and stays that way. The footer says so.
