# AGENTS.md - chains

Scope: canonical blockchain classes, aliases, and address validation.

## Key files

- `src/core/chain.ts` holds `Chain` and the shared family abstractions
- `src/core/errors.ts` holds the `ChainsError` hierarchy. Never throw a raw `Error`
- `src/core/registry.ts` is the constructor registry
- `src/core/resolve.ts` owns the aliases and `getChain`
- `src/chains/*.ts` is one concrete blockchain class per file
- `src/index.ts` is the public API and the registration entrypoint
- `src/cli.ts` plus `src/commands/*.ts` is the citty CLI: `info`, `resolve`, `validate`, `list`
- `packages/{pi,omp}/extensions/chains.ts` are the agent tools. The OMP file is a full copy, never a re-export
- `src/version.ts` is the version string
- `test/unit/chains.test.ts` covers hierarchy, registry, metadata, and validation

## Shape

Constructor registry. Concrete blockchain classes own their metadata and behavior, the registry owns constructors and hands back instances.

## Conventions

- ESM-only. The core imports nothing at runtime, the CLI adds `citty` and `consola`, the extensions need `typebox` and `@earendil-works/pi-coding-agent`
- Build with `obuild`, entries `src/index.ts` and `src/cli.ts`. `obuild` 0.4 accepts only `cwd`, `entries` and `hooks`, everything else is silently ignored
- Never set `sideEffects: false`. Registration runs on side-effect imports, so tree-shaking would leave the registry empty
- Extensions load `dist/`, so `pnpm build` has to run before `tsc -p tsconfig.extensions.json`
- Lint and format with `oxlint` plus `oxfmt` (`pnpm run fmt`)
- Test with vitest (`pnpm run test`)
- `verbatimModuleSyntax: true`, so type imports use `import type`
- Canonical chain key is a lowercase `ChainKey`
- Use contextual class names: `EVM extends Chain`, `Ethereum extends EVM`. Do not repeat `Chain` in subclass names

## Not in scope

RPC calls, wallet creation, transaction building. Those live in rpcx, ubichain and webri.
