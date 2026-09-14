# docs/

Docus site for `@agntn/chains`. Markdown lives in `content/`. The playground is a Vue page that imports the library into the browser. There's no server API because the library needs none: the core imports nothing at runtime and never touches a network.

## Layout

```
docs/
├── nuxt.config.ts                 # extends: ['docus'], cloudflare_module preset (Workers)
├── app/app.config.ts              # title, github, theme
├── app/app.css                    # theme tokens (light + .dark), shared `chains-*` classes
├── app/components/                # Docus overrides: AppHeaderLogo, AppHeaderCTA (nav), AppFooterLeft, DocsAsideLeftBody; UI icons are Lucide, chain logos the monochrome token collection, GitHub and npm simple-icons
├── app/components/content/        # MDC components (`::landing-home`, `::chain-facts`), the landing panels, ChainsPlayground
├── app/components/OgImage/        # Docs.takumi and Landing.takumi override the Docus OG templates
├── app/assets/fonts.css           # @font-face for the TTFs served from public/fonts (site and OG images)
├── app/composables/               # useLandingChain (one clock for every live panel), useSubNavigation
├── app/utils/                     # chains table (icons, aliases, samples over the library), tools.ts (the tool text, ported), formatting
├── app/pages/playground.vue       # playground, own route outside the docs layout, its own useSeo and OG image
├── server/routes/sitemap.xml.ts   # Docus sitemap plus the Vue pages it cannot see
├── public/                        # fonts, favicon.svg and the icons and manifest cut from it
├── content/index.md               # landing
├── content/1.guide/               # getting started, registry, validation, identify, metadata, cli, agents, custom, playground
└── content/2.chains/              # one page per chain, in registry order
```

## Commands

```bash
pnpm install          # from docs/, after pnpm build in the repo root
pnpm dev              # http://localhost:3000
pnpm build            # Cloudflare Workers output in .output/, content routes prerendered
pnpm deploy           # build, then wrangler deploy to chains.agntn.dev
pnpm generate         # static output; nothing on this site needs the worker at runtime
```

Deployment: Nitro preset `cloudflare_module`. Nuxt Content wants a D1 binding named `DB`. `wrangler.jsonc` carries it plus the `NUXT_SITE_URL` var, and Nitro merges that into the generated `.output/server/wrangler.json`. Create the database once with `wrangler d1 create agntn-chains` and put the id in `wrangler.jsonc`. Until then the id is all zeros on purpose, `pnpm deploy` with zeros binds nothing, so don't run it before the id is real. No KV binding. Nothing is fetched, so nothing is cached.

The site imports `@agntn/chains` from `file:..`. Build the parent package first, with `pnpm build` and not `pnpm dev`: a stub `dist/` re-exports `src/index.ts` and the docs build falls over on the type annotations. `pnpm install` copies the package into the store rather than linking it, so after a root rebuild it is `rm -rf docs/node_modules && pnpm install` to pick the new build up. `dist/index.mjs` has no imports that need Node, so it bundles for the browser as it is.

Two resolution traps, both because the repo root is its own pnpm workspace:

- `pnpm-workspace.yaml` sets `shamefullyHoist: true`. Without it `docs/node_modules` holds only direct dependencies, Node walks up to the root `node_modules`, and the server bundle can end up with a second copy of Vue.
- `nuxt.config.ts` pins `workspaceDir` to `docs/` and disables devtools and telemetry, which would otherwise resolve from the root.

## Live values

- Every number on the landing and every facts strip comes from the library at render time. `CHAINS` in `app/utils/chains.ts` maps `chains()` through `create(key)`, `useLandingChain` runs `assertAddress` and `identify` on the sample addresses. A chain added to the library shows up in the grid by itself and needs one line in `PRESENTATION` for its icon, alias and sample. The chain pages in `content/2.chains/` are written by hand, though, so a new chain needs a page too.
- The samples are public test vectors and well known contracts, every one checked against `dist/` before it went into `PRESENTATION`. Check a new one the same way. Don't derive one by hand.
- The samples are deterministic, so SSR and the client agree and hydration doesn't flicker. Keep it that way. No `Math.random`, no clock inside a computed.
- `app/utils/tools.ts` repeats the text the four tools return, because `src/tool-operations.ts` isn't a package export. It mirrors `lookupChain`, `validateChainAddress`, `identifyAddress` and `listChains` line for line. A change to the wording in the library is a change here, and there's no test that catches the drift, so read both when touching either.
- `ChainsPlayground.vue` reads the deep link through a `watch(route.query)` registered in `onMounted` that fires once. A prerendered page hydrates with an empty query and Nuxt restores the address only afterwards, so reading `route.query` in setup gives you nothing. It writes state back with `router.replace` on every change.
- The playground catches `ChainsError` and shows the class name and the message. Anything else is a bug in the library and belongs there, not in a try/catch here.

## SEO

- `seo.schema` in `app/app.config.ts` emits the landing JSON-LD: `WebSite`, the agntn `Organization` as publisher, and a free `SoftwareApplication` with `sameAs` on GitHub and npm. Docs pages get `Article` plus `BreadcrumbList` from Docus on their own.
- The Docus sitemap reads content collections only. `server/routes/sitemap.xml.ts` wraps it and appends the Vue pages listed in `PAGES`; a new page under `app/pages/` goes there too, and into `llms.sections` in `nuxt.config.ts`, or it's invisible to crawlers and to `llms.txt`.
- Docus links `/favicon.ico` without shipping one. `public/favicon.svg` is the source, the PNGs come from `rsvg-convert` and the `.ico` from ImageMagick, `app.head` in `nuxt.config.ts` links them with the manifest and theme colours.

## OG images

- `app/components/OgImage/Docs.takumi.vue` and `Landing.takumi.vue` override the Docus templates of the same name and are rendered by Takumi at build time. Takumi has no CSS variables, so the theme colours from `app.css` are repeated there as literals. Annoying, but that's what it is.
- nuxt-og-image doesn't see the faces `@nuxt/fonts` generates on this Nuxt version, but it does parse `@font-face` rules from the files in `css`. That's why `app/assets/fonts.css` declares the five TTFs in `public/fonts` and `fonts.families` uses the `local` provider. Site and OG images share the same files.
- The landing OG file is named from the SEO description. Nitro refuses to write a prerender path containing `..`, so a description ending in a period is silently skipped and the landing ships with a dead `og:image`. Keep the description in `content/index.md` without a trailing period.

## Constraints

- Text a visitor types into the playground is rendered as text, through interpolation or a `<pre>`. Never `v-html`, never evaluate.
- Chain icons, aliases and sample addresses live once, in `app/utils/chains.ts`. Sidebar, landing grid, playground chips and `::chain-facts` read from it; the chain pages repeat the icon in their frontmatter. Logos come from `@iconify-json/token`, the monochrome set, so they take the muted and accent colours like every other icon. Pepecoin and Octra aren't in it and keep a Lucide glyph, and `token:pepe` is the ERC-20 memecoin, not Pepecoin, so don't reach for it. Names, symbols, families, coin types and identifiers come from the library and aren't repeated here.
- Every address quoted in `content/` passed `assertAddress` on `dist/index.mjs`, and every rejected one on the validation page was checked to fail. Check a new one the same way before writing it down.
- The site makes no network request for its own work and stays that way. The footer says so.
