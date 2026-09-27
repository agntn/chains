# Design system

The shared rules (direction, color roles, type, the `console-*` grammar, hero, docs chrome, density, motion, checks) live in the one agntn design system document, kept with the agntn skills until it ships in the shared package. This file records only what chains owns and where it departs from the shared rules. It does not repeat them.

The instruments chains owns:

| Instrument | Where | Object |
| --- | --- | --- |
| [LandingHero.vue](app/components/content/LandingHero.vue) | landing, first screen | hero zone, circuit `identify` into the registry |
| [LandingRegistry.vue](app/components/content/LandingRegistry.vue) | under the hero | one sample address against every chain in the registry |
| [LandingRotatingCode.vue](app/components/content/LandingRotatingCode.vue) | "matic, btc, arb. Same class every time" | `getChain(alias)` and the fields on the class, as a file |
| [LandingValidate.vue](app/components/content/LandingValidate.vue) | "Decode the bytes, not count the characters" | verdict console: own chain, foreign chain, one character off |
| [LandingIdentify.vue](app/components/content/LandingIdentify.vue) | "One address, every validator at once" | `chains_identify_address` as a census of families, full text in the dialog |
| [ChainRoster.vue](app/components/content/ChainRoster.vue) | landing and `/chains` | roster of the registry on `UTable`, sortable |
| [LandingToolCall.vue](app/components/content/LandingToolCall.vue) | "5 tools, three hosts" | one `chains_lookup` call, full text in the dialog |
| [LandingCustom.vue](app/components/content/LandingCustom.vue) | "Extend Chain, call register" | `nano.ts`, a custom chain as a file |
| [LandingStart.vue](app/components/content/LandingStart.vue) | closing section | install, notes, first lookup as a file |
| [ChainFacts.vue](app/components/content/ChainFacts.vue) | every chain page (`::chain-facts`) | chain dossier: ID bar with position, reticle, spellings, readout, network, access |
| [ChainsPlayground.vue](app/components/content/ChainsPlayground.vue) | `/playground` under the hero zone | request and response instruments for the five operations |
| [Landing.takumi.vue](app/components/OgImage/Landing.takumi.vue), [Docs.takumi.vue](app/components/OgImage/Docs.takumi.vue) | OG images | the hero zone in 1200 by 600; a docs page as one instrument, a chain page with its facts and `create()` as chips |

Names, symbols, families, coin types and identifiers come from the library through [chains.ts](app/utils/chains.ts); icons, aliases and sample addresses live there too. The tool text comes from [tools.ts](app/utils/tools.ts).

## Anatomy

- **Registry.** Bar `Call identify("<address>")`, meta `<matches> of <checked> accept`. Subject: the sample chain's reticle, the address whole on a solid ground, one sentence. Rule `Registry [ one validator per chain ]`, then a cell per chain in registry order (glyph, key, node): the sample's own chain a filled node on an accent edge, a chain that also accepts the format an accent outlined node, the rest quiet. Each cell has a `UTooltip` and links to its page. Footer: legend of the two nodes, previous and next.
- **Verdict.** Bar `Call assertAddress("<address>")`. Subject: reticle, `Verdict / <key>`, `accepted once, rejected N×`. Readout: one row per check, the call, the returned value with a node (accent returned, red error), one line on what the row shows.
- **Chain dossier.** ID bar with the key and `14 / 36`, meta `<type> · <symbol>`. Subject: reticle, `Chain / <family>`, name, the spellings as boxed strings. Readout: symbol with decimals, coin type, chain ID or CAIP-2, checks in the accent, a tick per optional field on the class (set in the accent). Bands `Network [ as the class declares it ]` and `Access [ library · CLI · playground ]` as leads, then `03 Full tool response` with the `chains_lookup` text. Values in the readout never wrap; the whole value is in the tooltip.
- **Roster.** Columns chain (glyph, name, boxed key), symbol with decimals, family, chain ID or CAIP-2, coin type behind a leader. Coin types are not in the accent: 36 accent numbers read as a stain.
- **Playground.** Request: operations as leads, fields as `UInput` and `USelectMenu` with variant `none` in the readout, one chip per chain as `UButton` variant `chip`, CLI and tool JSON with copy. Response: a subject band per answer kind (lookup, verdict, census for identify, rows for list, error), `03 Full tool response`, footer to the chain page and the guide.

## Motion

| Change | Motion |
| --- | --- |
| landing sample advances (4.2 s, paused on hover and focus) | ruler cursor once, scan and reticle arcs, readout rows slide in, file name rolls, circuit runs once |
| identify census on a new sample | share bars grow once from the left |
| playground answer changes | cursor and scan once per answer text, not per keystroke that changes nothing |
| reduced motion | no walk; manual previous and next still work |

## Differences

Departures from the shared rules, recorded for the shared package:

- The hero instrument is the registry map, not a walk of one record: the domain is many chains and one address, so the first screen shows the partition `identify()` makes. It hides below 48rem like any landing instrument; the file under it carries previous and next on a phone.
- No network call anywhere: every instrument computes in the browser from the library, so no bar says `recorded` or `live`, and every footer that names locality says `no network`.
- The version comes from the root `package.json`; there is no data version, so ID strips and footers carry none.
- The OG images ship local Figtree and Fira Code TTFs, the keys mechanism.
- `public/image.png`, the package image `package.json` points Pi at, is a copy of the built landing OG card. Copy it again from `.output/public/_og/s/` when the hero changes.

## Checks

Beyond the shared checks: `/`, `/chains`, a chain page with a long CAIP-2 (`/chains/zcash`) and `/playground` with a deep link (`?op=identify&address=…`) at 1440 and 390 px, and no horizontal scroll on `/playground` at 320 px.
