# AGENTS.md - chains

Scope: canonical blockchain classes, aliases, address validation and txid validation.

## Key files

- `src/core/chain.ts` holds `Chain` and the family abstractions `EVM`, `Move` and `UTXO`
- `src/core/errors.ts` holds the `ChainsError` hierarchy. Never throw a raw `Error`
- `src/core/registry.ts` is the constructor registry
- `src/core/resolve.ts` owns the aliases and `getChain`; canonical keys and display names are matched against the registry, so the alias table holds only real aliases, never a key as its own entry
- `src/core/identify.ts` partitions the registry by an address: matching validators and unchecked chains
- `src/core/text.ts` holds the guards caller text passes through before any surface prints it
- `src/core/base58.ts` decodes base58 through `@agntn/encodings/base58` for chains that check the bytes behind an address, with the length bound in front because decoding is quadratic. The alphabet is a name, `bitcoin` by default and `ripple` for `xrpl`. Both order the same 58 characters, so one pattern keeps foreign text away from the decoder and a rejection throws nothing
- `src/core/base58check.ts` decodes Base58Check on top of `base58.ts`, and `@agntn/encodings` checks the checksum. `readBase58Check` hands back the bytes and every fault in one pass, and `base58CheckFault` adds the width and version bytes, so the reason an address fails can't disagree with whether it does. Bitcoin's legacy form, Litecoin, Pepecoin, Dogecoin, Bitcoin SV, Bitcoin Gold, Dash, Zcash, TRON and the XRP Ledger read through it with SHA-256, Decred with BLAKE-256: the scheme is an alphabet name or the hash that replaces SHA-256
- `src/core/address.ts` holds `DecodedAddress`, what `decodeAddress` hands back: a kind, the payload in hex and the digest behind it. `Chain.decodeAddress` answers `account` after the check, `UTXO` overrides it to throw `AddressDecodingUnsupportedError`, and every built-in UTXO chain overrides it again with its own reader, which `test/unit/decode-address.test.ts` checks. A payload test vector comes from outside the package (a BIP, dcrd's tests, the CashTokens CHIP, CIP-19, `@agntn/keys`), never from this decoder
- `src/core/f4jumble.ts` undoes ZIP-316's F4Jumble, the Feistel permutation over BLAKE2b a Unified Address is scrambled with. Only the inverse, because nothing here writes an address
- `src/core/crc16.ts` is CRC-16/XMODEM, the checksum Stellar's Strkeys and TON's friendly addresses end with. It returns the number, because Stellar writes it little-endian and TON big-endian
- `src/core/crc32.ts` is CRC-32 as zlib computes it, the checksum a Cardano Byron address closes with over its CBOR payload
- `src/core/bech32.ts` reads Bech32 digits and names the case, prefix, length and alphabet faults it meets (`readBech32Digits`). The polymod and the byte packing belong to `@agntn/encodings/bech32`: `checkedWords` asks it whether a checksum holds, and callers pack words with its `fromWordsUnsafe`. The human-readable part and the digit bound are arguments, because BIP-173's 90-character cap is Bitcoin's rule and Cardano, Litecoin's MWEB and Zcash's Unified Addresses write past it
- `src/core/segwit.ts` checks BIP-173/350 SegWit addresses on top of `bech32.ts` for the chains that took Bitcoin's witness program rules. `segwitFault` names every rule an address breaks, and `segwitShaped` picks it over the Base58Check reason for a rejected address that reads as Bech32, another chain's included. `segwitAddress` reads a passed address with encodings' `segwit.decode`. The human-readable part is an argument, `bc` for Bitcoin, `ltc` for Litecoin and `btg` for Bitcoin Gold
- `src/core/txid.ts` checks a txid written as 32 bytes of hex and names every rule it breaks in the same call, so validity and reason can't disagree. The `0x` prefix and the lowercase rule are arguments
- `src/core/cashaddr.ts` decodes CashAddr for Bitcoin Cash and eCash. Its 40-bit polymod stays here, the byte packing is `fromWordsUnsafe` from `@agntn/encodings/bech32`. The prefix is an argument, and so is the choice of types and hash lengths: it hands back what the version byte says and each chain decides what it pays to
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
- `test/unit/cli-loads.test.ts` runs the built bin's usage paths under `test/record-loads.ts`: `--help`, `-h`, `mcp --help`, no arguments and an unknown command must not load the MCP SDK, and `mcp` must load it. It also checks which server `mcp` serves, the source inside a checkout and the bundle everywhere else, and that every module in `src/` imports under plain Node
- `docs/` is the Docus site behind chains.agntn.dev, with its own `AGENTS.md`. It aliases `@agntn/chains` to `src/index.ts` and bundles the sources itself, so it needs neither `dist/` nor the root `node_modules`

## Shape

Constructor registry. Concrete blockchain classes own their metadata and behavior, the registry owns constructors and hands back instances.

## Conventions

- ESM-only. The core imports `@agntn/encodings` and `@agntn/hashes` at runtime, their subpaths only: each root loads the whole registry. The digests come from `@agntn/hashes` because `assertAddress` cannot await one: BLAKE-256 for Decred's checksum, BLAKE2b with its personalization for Zcash's F4Jumble, Keccak-256 for EIP-55 and Monero. Pin `@agntn/hashes` to the version `@agntn/encodings` pins, so an install holds one copy The CLI adds `citty` and `consola`, the MCP server adds `@modelcontextprotocol/sdk`, the extensions need `typebox` and `@earendil-works/pi-coding-agent`
- `typebox` is an optional peer with the `"*"` range Pi 0.99 asks for, because Pi warns on every load of a package that lists it in `dependencies`. The exact pin sits in `devDependencies`. Pi maps the extension's import to its own copy, OMP to its TypeBox shim, and `build.config.ts` inlines one into `dist` for the CLI and the MCP server. `test/unit/host-peers.test.ts` guards the manifest and `test/unit/cli-loads.test.ts` checks that the bundled server loads no `typebox` package
- Build with `obuild`, entries `src/index.ts`, `src/cli.ts`, `src/mcp.ts` and `src/tool-operations.ts`. `obuild` 0.4 accepts only `cwd`, `entries` and `hooks`, everything else is silently ignored
- `sideEffects` names `dist/cli.mjs` and nothing else. That holds only while no module registers itself on import: put a `register()` call back at the top of a chain file and the class reaches the registry through a bare import, which a tree-shaker is free to drop. New chains go in `builtins`
- `obuild` puts the whole core into one chunk, so `sideEffects` can't drop a module a consumer imports one name from: the bundler goes statement by statement. A call, spread or `Array.from` at module scope stays in every bundle along with whatever it reads, which is how `new Map(builtins.map(...))` used to ship all chains with a lone error class. Compute it inside the function that needs it or on first use, like the registry does. `test/unit/tree-shaking.test.ts` bundles `dist/` with rolldown and fails when a chain's import pulls in another chain
- Extensions load `dist/tool-operations.mjs`, so `pnpm build` has to run before `tsc -p tsconfig.extensions.json`, and `test/unit/cli-loads.test.ts` runs `dist/cli.mjs`, so `pnpm test` builds first
- `src/commands/mcp.ts` imports the server and the SDK inside `run()`. citty resolves every subcommand to print the usage, so a module-scope import there puts the whole SDK on `--help` and on every mistyped command
- The OMP loader must keep both dynamic imports literal (`import("../../../dist/tool-operations.mjs")` or `import("../../../src/tool-operations.ts")`). An `import(url.href)` built from a runtime value loses bare-dependency resolution in the compiled OMP binary. Pi may keep the existsSync form.
- MCP is built on the low-level `Server`, deprecated in the SDK, because `McpServer.registerTool` takes Standard Schema only and `typebox` 1.x is not one. The alternative is a second definition of every parameter
- An MCP client reads `content` and never `details`, so tool text has to carry whatever the next call needs
- Caller text reaches a tool's `content` or the CLI's own output through `quoted()` or `stripControlCharacters()` in `src/core/text.ts`, never raw: a newline in an address writes its own line of the answer. `details` keeps the value unchanged, so a surface that renders it owes its own escaping
- Lint and format with `oxlint` plus `oxfmt` (`pnpm run fmt`)
- Test with vitest (`pnpm run test`)
- `verbatimModuleSyntax: true`, so type imports use `import type`
- `noImplicitOverride: true`, the same as the docs app's Nuxt tsconfig, which typechecks `src/` through its alias. A field that shadows an optional one on `Chain`, such as `bip44` or `caip2`, writes `override` like `decimals` does, and `tsc` asks for it when it's missing
- `src/` runs under plain Node type stripping: relative imports end in `.ts`, never `.js`, and `erasableSyntaxOnly` keeps out `enum`, `namespace` and parameter properties
- Inside a checkout, `dist/cli.mjs mcp` loads the server from `src/`, so a local MCP server needs a restart after a change, not `pnpm build`. The npm package and a copy under `node_modules` keep the bundle, and `CHAINS_DIST=1` forces it. A change to `src/cli.ts` itself still needs `pnpm build`
- Canonical chain key is a lowercase `ChainKey` that names the chain rather than its ticker: `ethereum`, not `eth`. A short name is still a name, so `bsc`, `zksync` and `arbitrum` stay; ticker spellings belong in the alias table
- Metadata that encodes the same fact twice gets a cross-field test, not just a type. `chainId` and the `eip155:` reference in `caip2` are checked against each other in `test/unit/chains.test.ts`; Linea shipped a testnet id against a mainnet CAIP-2 until that test existed
- An address validator built only from a character-length window is wrong. Decode when the format is base58 with a known byte length, verify the checksum when the format is Base58Check, and follow the spec's case rules for bech32 and EIP-55. Octra is the exception: its address is a fixed 44 characters cut out of base58, not encoded from a payload, so the width is the whole format and decoding rejects real contract addresses
- A txid validator is a shape check on purpose: there's no transaction to hash. The shape is what the chain's own node writes and what its reader takes, both read before the rule is written: `0x` and 64 hex digits on `EVM` and Aptos, 64 hex digits on `UTXO`, Monero, TRON and the XRP Ledger, lowercase only on Stellar and Octra because Horizon's `isTransactionHash` and the node's `sanitize_hash` read nothing else, base58 decoded to 64 bytes on Solana and 32 on Sui, hex or padded base64 on TON, the address rule on Arweave. A form a reader accepts but no producer writes (bare hex on Aptos, unpadded base64 on TON, `0x` on TRON) stays out
- `magic` is the mainnet P2P message start as the node's own `chainparams.cpp` (or dcrd's `wire`) sends it: lowercase hex in wire order, `netMagic` rather than the `diskMagic` Bitcoin Cash and its forks keep for block files. A new chain on Bitcoin's wire protocol gets one, a chain that frames its messages some other way leaves it unset
- `pow` is the work the node's own header check demands, read from that code (`GetPoWHash`, `CheckEquihashSolution`, dcrd's `PowHashV2`), not from a pool's coin list. Equihash carries its (n, k), because two chains here run it apart. A chain that doesn't mine leaves it unset, and so do Arweave (RandomX and SHA-256 over stored chunks) and Octra (proof of useful work), which have no single hash
- Use contextual class names: `EVM extends Chain`, `Ethereum extends EVM`. Do not repeat `Chain` in subclass names

## Not in scope

Key generation and HD key/address derivation belong in [`@agntn/keys`](https://github.com/agntn/keys), not in the chain classes. RPC calls belong in [`@agntn/nodes`](https://github.com/agntn/nodes). Wallet storage, account management, and transaction building remain outside this package's scope.
