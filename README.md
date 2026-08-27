# @agntn/chains

Canonical blockchain classes, aliases, and address validation.

Every web3 library I write needs the same handful of facts: Polygon's chain ID, Bitcoin's coin type, which explorer to link, whether an address even looks right. Re-declared in every one of them. So they live here once, as classes.

## Stack

TypeScript, ESM-only. The core imports nothing at runtime. The CLI adds `citty` and `consola`, the MCP server adds `@modelcontextprotocol/sdk`, and the agent extensions need `typebox` and `@earendil-works/pi-coding-agent`. The MCP server and the extensions describe their parameters with the same `typebox` schemas.

## Installation

```bash
pnpm add @agntn/chains
```

## Usage

```typescript
import { Ethereum, EVM, create, getChain } from "@agntn/chains";

const ethereum = create("ethereum");

ethereum instanceof Ethereum; // true
ethereum instanceof EVM; // true
ethereum.name; // "Ethereum"
ethereum.symbol; // "ETH"
ethereum.chainId; // "0x1"
ethereum.caip2; // "eip155:1"

// Aliases resolve to the same concrete classes.
const polygon = getChain("matic");
polygon.key; // "polygon"

// Validation lives on the class that knows the format.
ethereum.assertAddress("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");
```

## Architecture

```text
Chain (abstract)
├── EVM (abstract)
│   ├── Ethereum
│   ├── Base
│   ├── Arbitrum
│   └── ...
├── Move (abstract)
│   ├── Aptos
│   └── Sui
├── Bitcoin
├── Solana
├── Stellar
├── Xrpl
├── Ton
├── Tron
└── Octra
```

Each chain is its own class holding its own metadata. `EVM` and `Move` own the family type and the address format, and everything else is declared per class, down to the coin type all thirteen EVM chains repeat.

One list puts them in the registry: `builtins` in `src/chains/index.ts`. No module registers itself as it loads, so the CLI is the only entry that runs anything on import, and `sideEffects` says so, which lets a bundler drop whatever your project never touches. The cost is that a chain file counts for nothing until its class joins that list, and a test compares the two so it cannot drift quietly. `register()` is still there for chains this package does not ship.

## API

### Base classes

- `Chain` is the abstract contract for metadata and address validation
- `EVM` and `Move` hold what their concrete classes share
- `ChainConstructor` is what the registry accepts

### Registry

- `register(ChainClass)` registers a concrete class under its static `key`
- `create(key)` builds a fresh instance of a registered class
- `chains()` returns the registered keys in registration order
- `has(key)` checks whether a class is registered
- `getChain(input?)` takes a key, symbol, or alias and gives you an instance, defaulting to Ethereum
- `identify(address)` partitions the registry by an address: chains whose validator accepts it, and chains with no validator at all

Keys name the chain rather than its ticker, so it is `ethereum`, `berachain` and `octra`. The ticker spellings a caller may already be holding, `eth`, `bera` and `oct`, resolve as aliases.

`getChain` matches keys, symbols, and the aliases people actually type, so `matic`, `btc` and `arb` all work. Display names work too, read straight off the registered classes, so whatever `chain.name` prints resolves back to the same chain — `Arbitrum One`, `BNB Chain`, `zkSync Era`. That round trip matters for agents, which get a name out of one call and put it into the next. Symbols stay out of the automatic index: six chains report `ETH`, so matching on them would depend on registration order.

`getChain()` with no argument still means Ethereum. `getChain("")` or a blank string does not — that is a caller mistake, and it throws rather than quietly answering about the wrong chain.

### Instance behavior

`chain.assertAddress(address)` returns the address when it fits the chain's format and throws when it doesn't. It's a format check, not proof the address exists on chain. A validator may include the format's checksum, as Stellar does, but it does not query network state. Chains without a validator throw instead of quietly saying yes - `chain.validatesAddress` tells you which ones those are before you ask. A false green light costs more than a false alarm when the caller is about to send funds.

The base58 validators decode, because a shape is not enough. Solana requires exactly 32 decoded bytes: character length cannot separate an account from a Bitcoin or TRON address, since those are 34 characters and 25 bytes, while the System Program is 32 characters and 32 bytes. Bitcoin's legacy branch requires the 25 Base58Check bytes under a `0x00` or `0x05` version: the same System Program fit a character-length window, and decoding is what keeps that false match out. The checksum stays unchecked, this is a format check. Bitcoin's bech32 branch uses the BIP-173 charset, which has no `1`, `b`, `i` or `o`, and treats all-lowercase and all-uppercase as valid while rejecting mixed case - uppercase is what QR encoders emit, so rejecting it would fail addresses that spend fine. Stellar accepts SEP-23 Strkeys for classic accounts, muxed accounts and contracts, including the canonical base32 form and its CRC16-XModem checksum.

TRON is the same 25 Base58Check bytes under version `0x41`, so decoding is also what keeps it and Bitcoin's legacy form apart. The XRP Ledger writes base58 over its own ordering of those same 58 characters, so an address there has to be read under the ledger's digits or the bytes come back wrong instead of rejected. A classic account is 25 Base58Check bytes under version `0x00`, an X-address is 35 bytes under the mainnet prefix `0x05 0x44`, and the testnet prefix is turned away along with the reserved tag bytes XLS-5 requires to be zero. TON takes the TEP-2 friendly form in either base64 alphabet: 36 decoded bytes, a bounceable or non-bounceable tag and one of the two workchains that exist, with the testnet-only flag rejected the way Bitcoin's testnet versions are. Octra is the one base58 chain here where decoding would be a mistake: `oct` and a fixed 44 characters is the whole format, and a contract address is cut out of a base58 string rather than encoded from a payload, so its value runs past 32 bytes. The node takes that width and nothing else, so an address one character short is not a near miss, it is a different string. Aptos and Sui want all 32 bytes of hex written out, or the one-digit short form AIP-40 defines for the special addresses, which is how the framework address `0x1` is actually written - anything in between stays rejected, because accepting dropped leading zeros would make every EVM address a valid move address too. With those in place every registered chain validates, so `identify` gets an answer out of the whole registry.

### Errors

Everything thrown here descends from `ChainsError`, so you catch one type and read fields instead of parsing message strings.

- `UnknownChainError` when `create()` got a key with no registered class, carries `.key`
- `UnsupportedChainError` when `getChain()` got input matching no alias or name, carries `.input`; the message quotes the value, so blank and control-character input stays visible in a log
- `InvalidAddressError` when an address failed its format check, carries `.address` and `.chain`
- `AddressValidationUnsupportedError` when the chain has no validator, carries `.chain`

`.chain` holds the canonical key on both, the same value `create()` takes. It used to name whatever read well in the message - `"EVM"` for all thirteen EVM chains, a display name elsewhere - which made the field useless as an identifier.

## CLI

```bash
chains list --type evm            # every registered EVM chain
chains info matic                 # canonical metadata, add --json for a machine
chains resolve btc                # bitcoin
chains validate eth 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
chains identify 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984   # which chains accept this format
```

`resolve`, `info` and `validate` print a message and exit 1 when they fail. `list` warns and exits 0 when a `--type` filter matches nothing, so don't use it as a check in a script. `identify` exits 0 even when nothing matches, because that is an answer too.

An address the CLI rejects comes back quoted, so a newline or a terminal escape inside one cannot forge a line under the error.

## MCP server

```bash
chains mcp
```

Speaks MCP over stdio and exposes the same four tools as the agent extensions: `chains_lookup`, `chains_validate_address`, `chains_identify_address` and `chains_list`. Point a client at it:

```json
{
  "mcpServers": {
    "chains": { "command": "npx", "args": ["-y", "@agntn/chains", "mcp"] }
  }
}
```

An MCP client sees the text a tool returns and nothing else, so the text carries the whole answer: every metadata field on a hit, and the registered keys when resolution fails, so the next call has somewhere to go. `chains_list` is there for the same reason — without it the only way to learn what the registry holds is to send a value you expect to fail. Absent fields say so out loud (`bip44: none`) rather than vanishing, because a missing coin type reads as "not shown" and invites the caller to supply one from memory.

A rejected address is an answer, not a tool error. Only an unresolvable chain or a chain with no validator sets `isError`, because then nothing was checked.

The address in an answer comes back quoted. It arrives from whatever the caller was reading, and a newline inside one would otherwise write its own line, so a rejected address could read as a match on the chain about to be funded.

`chains_identify_address` turns validation around: it runs an address of unknown origin through every validator at once and reports the chains that accept the format, grouped by family. A chain without a validator would be named as unchecked rather than skipped, though the list is empty right now because every registered chain validates. A match narrows the family and no more - one EVM address is valid on all thirteen EVM chains.

`createMcpServer()` is exported from `@agntn/chains/mcp` for hosts that bring their own transport.

## Agent extensions

Pi and OMP extensions live in `packages/pi/extensions` and `packages/omp/extensions`. They expose `chains_lookup` for resolving a chain into its metadata, `chains_validate_address` for checking an address, `chains_identify_address` for narrowing an address of unknown origin, and `chains_list` for the registry.

All three surfaces call the executors in `src/tool-operations.ts`, so the MCP server and the two extensions answer identically. The extensions add the details the harnesses render; MCP drops them and keeps the text.

The extensions prefer the built executors and fall back to source only when `dist/` is missing, because the internal imports use `.js` specifiers that a plain TypeScript-stripping runtime can't resolve back to `.ts`. Without `pnpm build` the tools still register and the first call dies with a module-resolution error.

## Not in scope

No RPC calls, no wallets, no transaction building. Those belong in rpcx, ubichain and webri.

## `Chain` fields

| Field        | Type        | Description                  |
| ------------ | ----------- | ---------------------------- |
| `key`        | `ChainKey`  | Canonical class key          |
| `name`       | `string`    | Human-readable name          |
| `symbol`     | `string`    | Native token symbol          |
| `type`       | `ChainType` | Blockchain family            |
| `bip44`      | `number?`   | BIP-44 / SLIP-0044 coin type |
| `chainId`    | `string?`   | EVM chain ID in hexadecimal  |
| `caip2`      | `string?`   | CAIP-2 identifier            |
| `explorer`   | `string`    | Block explorer base URL      |
| `rpcDefault` | `string?`   | Default public RPC endpoint  |

Optional fields stay empty when the chain has no registered value. Octra has no BIP-44 coin type and no CAIP-2 namespace, so both are `undefined` rather than invented.

## Supported chains

`ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `bsc`, `avalanche`, `fantom`, `gnosis`, `linea`, `zksync`, `scroll`, `berachain`, `bitcoin`, `litecoin`, `pepecoin`, `ecash`, `cardano`, `solana`, `stellar`, `xrpl`, `aptos`, `sui`, `ton`, `tron`, and `octra`.
