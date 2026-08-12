# AGENTS.md — chains

Scope: blockchain data dictionary — canonical chain info, normalize, inter-lib bridges, address validation.

## Key files

- `src/types.ts` — `Chain`, `ChainInfo`, `ChainType` types
- `src/data.ts` — `CHAIN_DATA`, `CHAIN_ALIASES`, normalize, bridges, guards, assert
- `src/index.ts` — re-export all public API
- `src/version.ts` — version string
- `test/unit/chains.test.ts` — 25 tests (data, aliases, bridges, guards, validation)

## Shape

Transformer-registry (pure data, no HTTP, no config, no API keys). See [agnostic-library-shapes](../../.aei/wiki/concepts/engineering/agnostic-library-shapes.md).

## Conventions

- ESM-only, 0 runtime deps (pure data + regex)
- Build: `obuild` (unbuild wrapper), entries: `src/index.ts` + `src/data.ts`
- Lint/format: `oxlint` + `oxfmt` (`pnpm run fmt`)
- Test: vitest (`pnpm run test`)
- `noUncheckedIndexedAccess: true` — use `!` when indexing `CHAIN_DATA`/`CHAIN_ALIASES` with known keys
- `verbatimModuleSyntax: true` — type imports use `import type`
- Canonical chain key = 3-letter lowercase string

## Not in scope

RPC calls, wallet creation, transaction building. Those live in rpcx/ubichain/webri.

## Inter-lib bridges

`rpcxChain()`, `blocexChain()`, etc. map canonical `Chain` → library-specific key. If a new library needs a different key, add a bridge here, not a parallel alias in the consuming library.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **chains** (58 symbols, 71 relationships, 0 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/chains/context` | Codebase overview, check index freshness |
| `gitnexus://repo/chains/clusters` | All functional areas |
| `gitnexus://repo/chains/processes` | All execution flows |
| `gitnexus://repo/chains/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
