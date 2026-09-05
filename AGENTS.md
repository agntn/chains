# AGENTS.md - chains

Scope: canonical blockchain classes, aliases, and address validation.

## Key files

- `src/core/chain.ts` holds `Chain` and the shared family abstractions
- `src/core/errors.ts` holds the `ChainsError` hierarchy. Never throw a raw `Error`
- `src/core/registry.ts` is the constructor registry
- `src/core/resolve.ts` owns the aliases and `getChain`; canonical keys and display names are matched against the registry, so the alias table holds only real aliases, never a key as its own entry
- `src/core/identify.ts` partitions the registry by an address: matching validators and unchecked chains
- `src/core/text.ts` holds the guards caller text passes through before any surface prints it
- `src/core/base58.ts` decodes base58 for chains that check the bytes behind an address. The alphabet is an argument, Bitcoin's by default and the XRP Ledger's for `xrpl`
- `src/chains/*.ts` is one concrete blockchain class per file
- `src/chains/index.ts` holds `builtins`, the ordered list the registry is seeded from. A chain file that is not in it is not in the registry
- `src/index.ts` is the public API
- `src/cli.ts` plus `src/commands/*.ts` is the citty CLI: `info`, `resolve`, `validate`, `identify`, `list`, `mcp`
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
- `sideEffects` names `dist/cli.mjs` and nothing else. That holds only while no module registers itself on import: put a `register()` call back at the top of a chain file and the class reaches the registry through a bare import, which a tree-shaker is free to drop. New chains go in `builtins`
- Extensions load `dist/tool-operations.mjs`, so `pnpm build` has to run before `tsc -p tsconfig.extensions.json`
- The OMP loader must keep both dynamic imports literal (`import("../../../dist/tool-operations.mjs")` or `import("../../../src/tool-operations.ts")`). An `import(url.href)` built from a runtime value loses bare-dependency resolution in the compiled OMP binary. Pi may keep the existsSync form.
- MCP is built on the low-level `Server`, deprecated in the SDK, because `McpServer.registerTool` takes Standard Schema only and `typebox` 1.x is not one. The alternative is a second definition of every parameter
- An MCP client reads `content` and never `details`, so tool text has to carry whatever the next call needs
- Caller text reaches a tool's `content` or the CLI's own output through `quoted()` or `stripControlCharacters()` in `src/core/text.ts`, never raw: a newline in an address writes its own line of the answer. `details` keeps the value unchanged, so a surface that renders it owes its own escaping
- Lint and format with `oxlint` plus `oxfmt` (`pnpm run fmt`)
- Test with vitest (`pnpm run test`)
- `verbatimModuleSyntax: true`, so type imports use `import type`
- Canonical chain key is a lowercase `ChainKey` that names the chain rather than its ticker: `ethereum`, not `eth`. A short name is still a name, so `bsc`, `zksync` and `arbitrum` stay; ticker spellings belong in the alias table
- Metadata that encodes the same fact twice gets a cross-field test, not just a type. `chainId` and the `eip155:` reference in `caip2` are checked against each other in `test/unit/chains.test.ts`; Linea shipped a testnet id against a mainnet CAIP-2 until that test existed
- An address validator built only from a character-length window is wrong. Decode when the format is base58 with a known byte length, and follow the spec's case rules for bech32. Octra is the exception: its address is a fixed 44 characters cut out of base58, not encoded from a payload, so the width is the whole format and decoding rejects real contract addresses
- Use contextual class names: `EVM extends Chain`, `Ethereum extends EVM`. Do not repeat `Chain` in subclass names

## Not in scope

Key generation and HD key/address derivation belong in [`@agntn/keys`](https://github.com/agntn/keys), not in the chain classes. RPC calls belong in [`@agntn/nodes`](https://github.com/agntn/nodes). Wallet storage, account management, and transaction building remain outside this package's scope.
