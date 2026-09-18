# @agntn/chains

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/chains)

⛓️ Thirty blockchains as classes, and an address check that actually decodes. Ask for `matic` and you get Polygon, chain ID and coin type included. Paste an address and you get the chains that would take it. Same thing from the terminal, from TypeScript or from an agent.

## Why?

Every web3 thing I write needs the same few facts. Polygon's chain ID. Bitcoin's coin type. Which explorer to link. And is this string even an address? I kept declaring all of that again in every library, a bit differently each time. The address check was a regex counting characters, so a TRON address passed as Bitcoin. Now it all lives here once, as classes, and the check decodes the bytes.

Docs, one page per chain and a playground are at [chains.agntn.dev](https://chains.agntn.dev). The playground is this library running in your browser.

## ✨ Features

- 🧬 **Thirty chains, one abstract `Chain`.** Each chain is its own class with its own facts. `EVM` and `Move` hold what a family shares.
- 🏷️ **Aliases people actually type.** `matic`, `btc`, `arb`, `ripple`. Display names work too, so `BNB Chain` comes back as `bsc`.
- 🔍 **Validators that decode.** Base58Check, Bech32, CashAddr, CIP-19, whatever the chain uses. Checksums get checked.
- 🕵️ **Identify an address of unknown origin.** Every validator gets a go and you learn the family.
- 🔗 **Transaction ids, same idea.** `0x` and 64 hex on the EVM chains, 64 hex on the UTXO chains and Monero, 43 base64url characters on Arweave. A txid pasted wrong fails here, not three calls later inside an RPC.
- 🧾 **Metadata checked, not remembered.** Every `decimals` value was looked up at the source. XEC really has two.
- 🫙 **Missing stays missing.** Octra has no coin type and no CAIP-2, so you get `undefined`. Nothing made up.
- 🪶 **The core imports nothing at runtime.** Nothing registers itself on import either, so your bundler drops what you don't use.
- 🤖 **CLI, library and agent tools give the same answer.** Six commands, five tools, one set of executors.
- 🧯 **Errors you catch by type.** `InvalidAddressError` carries `.chain` and `.address`. No message parsing.

## 📦 Install

```bash
pnpm add @agntn/chains
```

Node.js 24 or newer.

## 🚀 First call

```bash
npx @agntn/chains info matic
```

```
Polygon PoS (polygon)
  symbol      POL
  decimals    18
  type        evm
  bip44       60
  chainId     0x89
  caip2       eip155:137
  explorer    https://polygonscan.com
  rpc         https://polygon-bor-rpc.publicnode.com
```

No key, no config, no network. All of that sits in the `Polygon` class. `matic` is an alias, `POL` is the token's name these days, `polygon` is the canonical key. From here on I'll write plain `chains`. That's `pnpm exec chains` in a project, or `pnpm add -g @agntn/chains` once.

Now an address you found in a log:

```bash
chains identify 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
```

```
ethereum   evm     Ethereum
base       evm     Base
arbitrum   evm     Arbitrum One
optimism   evm     Optimism
polygon    evm     Polygon PoS
bsc        evm     BNB Chain
avalanche  evm     Avalanche C-Chain
fantom     evm     Fantom Opera
gnosis     evm     Gnosis Chain
linea      evm     Linea
zksync     evm     zkSync Era
scroll     evm     Scroll
berachain  evm     Berachain
arc        evm     Arc
```

Fourteen. Not helpful? It's the honest answer. Every EVM chain uses the same 20 bytes, so no decoder can tell them apart. Give it a format that belongs to one chain and the list gets short:

```bash
chains identify bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a
```

```
bitcoin    utxo    Bitcoin
```

One. Now a typo. This is the Bitcoin wiki's example address with the last character changed from `2` to `3`:

```bash
chains validate btc 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3
```

```

 ERROR  Invalid bitcoin address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3"

```

Right length, right alphabet, right first character. The checksum still says no. Exit code is 1, so scripts can trust it.

A few more:

```bash
chains resolve "BNB Chain"
chains resolve xrp
chains list --type utxo
chains info oct --json
chains identify 11111111111111111111111111111111
chains validate eth 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060 --txid
chains list --json | jq -r '.[] | select(.type == "move") | .key'
```

### Commands

| Command    | What it does                                      | Example                       |
| ---------- | ------------------------------------------------- | ----------------------------- |
| `info`     | Metadata for one chain, Ethereum if you name none | `chains info matic`           |
| `resolve`  | Key, ticker, alias or display name in, key out    | `chains resolve "BNB Chain"`  |
| `validate` | One address, or with `--txid` one txid, against one chain's format | `chains validate btc bc1q...` |
| `identify` | Every registered chain that accepts an address    | `chains identify 0x1f98...`   |
| `list`     | The registry, `--type` for one family             | `chains list --type utxo`     |
| `mcp`      | The MCP server on stdio                           | `chains mcp`                  |

`--json` on `info`, `identify` and `list`. `info`, `resolve` and `validate` exit 1 when they fail. `identify` doesn't, a miss is an answer too. More in the [CLI guide](https://chains.agntn.dev/guide/cli).

## 🧠 Library

```ts
import { create, getChain, identify, InvalidAddressError } from "@agntn/chains";

const polygon = getChain("matic");
polygon.key; // "polygon"
polygon.chainId; // "0x89"
polygon.caip2; // "eip155:137"

getChain("btc").assertAddress("bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a"); // returns it
getChain("eth").assertTxid("0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"); // the first mainnet transaction, returned too

try {
  getChain("btc").assertAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3");
} catch (error) {
  error instanceof InvalidAddressError; // true
  (error as InvalidAddressError).chain; // "bitcoin"
}

identify("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984").matches.length; // 13
create("bitcoin").decimals; // 8
```

Most of the API is right there. `create(key)` wants the canonical key. `getChain(whatever)` takes any spelling and defaults to Ethereum. `chains()` lists the keys, `register(Yours)` adds one. `assertAddress` is a format check and nothing more. It doesn't know if the address exists. `assertTxid` is the same thing for a transaction id, on the EVM and UTXO chains, Monero and Arweave. The rest throw `TxidValidationUnsupportedError`, and `validatesTxid` tells you before you ask. Errors are one family under `ChainsError`, six of them. More: [Registry](https://chains.agntn.dev/guide/registry), [Address validation](https://chains.agntn.dev/guide/validation), [Identify](https://chains.agntn.dev/guide/identify), [Metadata](https://chains.agntn.dev/guide/metadata).

## 🗺️ Chains

| Family    | Chains                                                                                                             | What the check decodes                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `evm`     | ethereum, base, arbitrum, optimism, polygon, bsc, avalanche, fantom, gnosis, linea, zksync, scroll, berachain, arc | 40 hex digits behind `0x`, mixed case has to pass EIP-55                                                                             |
| `utxo`    | bitcoin, litecoin, pepecoin, ecash, cardano, decred                                                                | Base58Check with the checksum, BLAKE-256 for Decred, Bech32 and Bech32m for `bc1` and `ltc1`, CashAddr for eCash, CIP-19 for Cardano |
| `solana`  | solana                                                                                                             | 32 base58 bytes, exactly                                                                                                             |
| `stellar` | stellar                                                                                                            | SEP-23 Strkeys with the CRC16, muxed accounts and contracts included                                                                 |
| `xrpl`    | xrpl                                                                                                               | Base58Check under the ledger's own alphabet, classic accounts and X-addresses                                                        |
| `move`    | aptos, sui                                                                                                         | All 32 bytes of hex, or the one-digit short form AIP-40 allows                                                                       |
| `ton`     | ton                                                                                                                | The TEP-2 friendly form in either base64 alphabet, tag, workchain and CRC16 checked                                                  |
| `tron`    | tron                                                                                                               | 25 Base58Check bytes under version `0x41`                                                                                            |
| `octra`   | octra                                                                                                              | `oct` and 44 characters, that's the whole format                                                                                     |
| `arweave` | arweave                                                                                                            | 43 characters of base64url, a 32-byte hash                                                                                           |
| `monero`  | monero                                                                                                             | Block base58, the network byte and the 69 or 77 byte envelope                                                                        |

Transaction ids: `0x` and 64 hex digits on `evm`, 64 hex digits on `utxo` and `monero`, the address rule on `arweave`. The other families aren't checked yet and `validatesTxid` says `false` there. Testnet addresses are refused wherever the format can tell. Each chain's page says which checksum is verified and which is left alone: [Chains](https://chains.agntn.dev/chains).

## 🤖 Agents

```bash
chains mcp
pi install npm:@agntn/chains
omp install @agntn/chains
```

```json
{
  "mcpServers": {
    "chains": { "command": "npx", "args": ["-y", "@agntn/chains", "mcp"] }
  }
}
```

Five tools, the same five on MCP, Pi and OMP. A rejected address is an answer, not a tool error. An unknown chain comes back with the keys that do exist. And fourteen EVM matches are fourteen possibilities, the tool says so itself. [Agents guide](https://chains.agntn.dev/guide/agents).

## 🚫 What this does not do

Keys. No mnemonics, no derivation, no signing. That's [@agntn/keys](https://github.com/agntn/keys). No RPC either. `rpcDefault` is a string you hand to something else. And a passing address is well formed, not funded, and not yours.

## 🧩 Adding a chain

Missing one? Extend `Chain`, add a `key`, a `type`, the metadata and an `assertAddress`, then `register()` it. `getChain` and `identify` won't know the difference. Nano is the worked example: [Custom chains](https://chains.agntn.dev/guide/custom).

## 🛠️ Development

```bash
pnpm install
pnpm dev         # obuild --stub
pnpm fmt         # builds, then oxlint --fix and oxfmt
pnpm lint        # builds, then oxlint
pnpm typecheck   # tsc, then a build and the extensions against dist/
pnpm test        # vitest
pnpm build       # obuild
pnpm docs        # the Docus site, bundled from src/
```

## 💛 Thanks

Anthropic and OpenAI both give open source projects access to their models, through [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) and [Codex for Open Source](https://developers.openai.com/community/codex-for-oss). A lot of this package was written with that help. Thanks, both of you <3

## 📄 License

[MIT](./LICENSE)
