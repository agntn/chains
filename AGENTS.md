# AGENTS.md - chains

Scope: canonical blockchain classes, aliases, and address validation.

## Key files

- `src/core/chain.ts` holds `Chain` and the shared family abstractions
- `src/core/errors.ts` holds the `ChainsError` hierarchy. Never throw a raw `Error`
- `src/core/registry.ts` is the constructor registry
- `src/core/resolve.ts` owns the aliases and `getChain`; display names are matched against the registry, not a second table
- `src/core/base58.ts` decodes base58 for chains whose address is a key of a known byte length
- `src/chains/*.ts` is one concrete blockchain class per file
- `src/index.ts` is the public API and the registration entrypoint
- `src/cli.ts` plus `src/commands/*.ts` is the citty CLI: `info`, `resolve`, `validate`, `list`, `mcp`
- `src/tool-operations.ts` holds the tool executors shared by MCP, Pi and OMP. No surface reimplements an operation
- `src/mcp.ts` exports `createMcpServer()`, `src/commands/mcp.ts` runs it over stdio
- `packages/{pi,omp}/extensions/chains.ts` are the agent tools. The OMP file is a full copy, never a re-export
- `src/version.ts` is the version string
- `test/unit/chains.test.ts` covers hierarchy, registry, metadata, and validation
- `test/unit/mcp.test.ts` drives the MCP server over an in-memory transport

## Shape

Constructor registry. Concrete blockchain classes own their metadata and behavior, the registry owns constructors and hands back instances.

## Conventions

- ESM-only. The core imports nothing at runtime, the CLI adds `citty` and `consola`, the MCP server adds `@modelcontextprotocol/sdk`, the extensions need `typebox` and `@earendil-works/pi-coding-agent`
- Build with `obuild`, entries `src/index.ts`, `src/cli.ts`, `src/mcp.ts` and `src/tool-operations.ts`. `obuild` 0.4 accepts only `cwd`, `entries` and `hooks`, everything else is silently ignored
- Never set `sideEffects: false`. Registration runs on side-effect imports, so tree-shaking would leave the registry empty
- Extensions load `dist/tool-operations.mjs`, so `pnpm build` has to run before `tsc -p tsconfig.extensions.json`
- MCP is built on the low-level `Server`, deprecated in the SDK, because `McpServer.registerTool` takes Standard Schema only and `typebox` 1.x is not one. The alternative is a second definition of every parameter
- An MCP client reads `content` and never `details`, so tool text has to carry whatever the next call needs
- Lint and format with `oxlint` plus `oxfmt` (`pnpm run fmt`)
- Test with vitest (`pnpm run test`)
- `verbatimModuleSyntax: true`, so type imports use `import type`
- Canonical chain key is a lowercase `ChainKey`
- Metadata that encodes the same fact twice gets a cross-field test, not just a type. `chainId` and the `eip155:` reference in `caip2` are checked against each other in `test/unit/chains.test.ts`; Linea shipped a testnet id against a mainnet CAIP-2 until that test existed
- An address validator built only from a character-length window is wrong. Decode when the format is base58 with a known byte length, and follow the spec's case rules for bech32
- Use contextual class names: `EVM extends Chain`, `Ethereum extends EVM`. Do not repeat `Chain` in subclass names

## Not in scope

RPC calls, wallet creation, transaction building. Those live in rpcx, ubichain and webri.
