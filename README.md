# @agntn/chains

Canonical blockchain classes, aliases, and address validation.

Every web3 library I write needs the same handful of facts: Polygon's chain ID, Bitcoin's coin type, which explorer to link, whether an address even looks right. Re-declared in every one of them. So they live here once, as classes.

## Stack

TypeScript, ESM-only. The core imports nothing at runtime. The CLI adds `citty` and `consola`, and the agent extensions need `typebox` and `@earendil-works/pi-coding-agent`.

## Installation

```bash
pnpm add @agntn/chains
```

## Usage

```typescript
import { Ethereum, EVM, create, getChain } from "@agntn/chains";

const ethereum = create("eth");

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
├── Ton
├── Tron
└── Octra
```

Each chain is its own class holding its own metadata. `EVM` and `Move` own the family type and the address format, and everything else is declared per class, down to the coin type all thirteen EVM chains repeat. Importing the package registers all of them.

Registration runs on side-effect imports. Set `sideEffects: false` and the bundler eats the `register()` calls, so `create("eth")` throws on a key that is right there in the source. Bundler docs and package linters both suggest that flag, and nothing complains until a production build hands you an empty registry.

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

`getChain` matches keys, symbols, and the aliases people actually type, so `matic`, `btc` and `arb` all work. Full display names don't. `Arbitrum One` throws `UnsupportedChainError`, because nobody types that.

### Instance behavior

`chain.assertAddress(address)` returns the address when it fits the chain's format and throws when it doesn't. It's a format check, not a checksum, and not proof the address exists on chain. Chains without a validator throw instead of quietly saying yes. A false green light costs more than a false alarm when the caller is about to send funds.

### Errors

Everything thrown here descends from `ChainsError`, so you catch one type and read fields instead of parsing message strings.

- `UnknownChainError` when `create()` got a key with no registered class, carries `.key`
- `UnsupportedChainError` when `getChain()` got input matching no alias, carries `.input`
- `InvalidAddressError` when an address failed its format check, carries `.address` and `.chain`
- `AddressValidationUnsupportedError` when the chain has no validator, carries `.chain`

Careful with `.chain` on `InvalidAddressError`: it names the validator that rejected the address, not the chain you asked about. Every EVM chain reports `"EVM"`, because they share one validator. Use the key you passed to `create()` if you need to know which chain it was.

## CLI

```bash
chains list --type evm            # every registered EVM chain
chains info matic                 # canonical metadata, add --json for a machine
chains resolve btc                # bitcoin
chains validate eth 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
```

`resolve`, `info` and `validate` print a message and exit 1 when they fail. `list` warns and exits 0 when a `--type` filter matches nothing, so don't use it as a check in a script.

## Agent extensions

Pi and OMP extensions live in `packages/pi/extensions` and `packages/omp/extensions`. They expose `chains_lookup` for resolving a chain into its metadata and `chains_validate_address` for checking an address.

Both prefer the built library and fall back to source only when `dist/` is missing, because the internal imports use `.js` specifiers that a plain TypeScript-stripping runtime can't resolve back to `.ts`. Without `pnpm build` the tools still register and the first call dies with a module-resolution error.

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

`eth`, `base`, `arbitrum`, `optimism`, `polygon`, `bsc`, `avalanche`, `fantom`, `gnosis`, `linea`, `zksync`, `scroll`, `bera`, `bitcoin`, `solana`, `aptos`, `sui`, `ton`, `tron`, and `oct`.
