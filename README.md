# @agntn/chains

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/chains)](https://npmx.dev/package/@agntn/chains)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/chains)

⛓️ Blockchains as classes, and an address check that actually decodes. Ask for `matic` and you get Polygon, chain ID and coin type included. Paste an address and you get the chains that would take it. Same thing from the terminal, from TypeScript or from an agent.

## Why?

Every web3 thing I write needs the same few facts. Polygon's chain ID. Bitcoin's coin type. Which explorer to link. And is this string even an address? I kept declaring all of that again in every library, a bit differently each time. The address check was a regex counting characters, so a TRON address passed as Bitcoin. Now it all lives here once, as classes, and the check decodes the bytes.

Docs, one page per chain and a playground are at [chains.agntn.dev](https://chains.agntn.dev). The playground is this library running in your browser.

## ✨ Features

- 🧬 **One abstract `Chain`, a class per chain.** Each chain carries its own facts. `EVM` and `Move` hold what a family shares.
- 🏷️ **Aliases people actually type.** `matic`, `btc`, `arb`, `ripple`. Display names work too, so `BNB Chain` comes back as `bsc`.
- 🔍 **Validators that decode.** Base58Check, Bech32, CashAddr, CIP-19, whatever the chain uses. Checksums get checked.
- 🧩 **Addresses read back.** The validator decodes anyway, so `decodeAddress` hands you what it found: `p2wpkh` and the 20-byte hash, not just a yes.
- 🕵️ **Identify an address of unknown origin.** Every validator gets a go and you learn the family.
- 🔗 **Transaction ids, same idea.** Each one in the shape its own node writes. A txid pasted wrong fails here, not three calls later inside an RPC. [The rules](https://chains.agntn.dev/guide/validation#transaction-ids).
- 🧾 **Metadata checked, not remembered.** Every `decimals` value was looked up at the source. XEC really has two.
- 🫙 **Missing stays missing.** Octra has no coin type and no CAIP-2, so you get `undefined`. Nothing made up.
- 🪶 **The core depends on family and nothing else.** Base58 and Bech32 come from `@agntn/encodings`, Keccak and BLAKE from `@agntn/hashes`, which encodings brought along anyway. Nothing registers itself on import, so your bundler drops the chains you don't use.
- 🤖 **CLI, library and agent tools give the same answer.** Seven commands, five tools, and each tool written down once.
- 🧯 **Errors you catch by type.** `InvalidAddressError` carries `.chain` and `.address`. No message parsing.

## 📦 Install

```bash
pnpm add @agntn/chains
```

Node.js 26 or newer.

## 🚀 First call

```bash
npx @agntn/chains info matic
```

```
Polygon PoS (polygon)
symbol: POL
decimals: 18
type: evm
chainId: 0x89
caip2: eip155:137
bip44: 60
explorer: https://polygonscan.com
rpc: https://polygon-bor-rpc.publicnode.com
```

No key, no config, no network. All of that sits in the `Polygon` class. `matic` is an alias, `POL` is the token's name these days, `polygon` is the canonical key. From here on I'll write plain `chains`. That's `pnpm exec chains` in a project, or `pnpm add -g @agntn/chains` once.

Now an address you found in a log:

```bash
chains identify 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
```

```
"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" matches 14 of 37 checked chains.
evm (14): ethereum, base, arbitrum, optimism, polygon, bsc, avalanche, fantom, gnosis, linea, zksync, scroll, berachain, arc
A format match narrows the family; it does not prove the address is used on any of these chains.
```

Fourteen. Not helpful? It's the honest answer. Every EVM chain uses the same 20 bytes, so no decoder can tell them apart. Give it a format that belongs to one chain and the list gets short:

```bash
chains identify bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a
```

```
"bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a" matches 1 of 37 checked chains.
utxo (1): bitcoin
A format match narrows the family; it does not prove the address is used on any of these chains.
```

One. Now a typo. This is the Bitcoin wiki's example address with the last character changed from `2` to `3`:

```bash
chains validate btc 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3
```

```
Invalid Bitcoin (bitcoin) address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3" - the Base58Check checksum does not hold, so a character is wrong
```

Right length, right alphabet, right first character. The checksum still says no, and says so out loud. Exit code is 1, so scripts can trust it.

A few more:

```bash
chains resolve "BNB Chain"
chains resolve xrp
chains list utxo
chains info oct --json
chains identify 11111111111111111111111111111111
chains validate eth 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060 --txid
chains list --json | jq -r '.chains[] | select(.type == "move") | .key'
```

### Commands

| Command    | What it does                                                       | Example                       |
| ---------- | ------------------------------------------------------------------ | ----------------------------- |
| `info`     | Metadata for one chain, also answers to `lookup`                   | `chains info matic`           |
| `resolve`  | Key, ticker, alias or display name in, key out                     | `chains resolve "BNB Chain"`  |
| `validate` | One address, or with `--txid` one txid, against one chain's format | `chains validate btc bc1q...` |
| `txid`     | One txid against one chain's format                                | `chains txid eth 0x5c50...`   |
| `identify` | Every registered chain that accepts an address                     | `chains identify 0x1f98...`   |
| `list`     | The registry, or one family when you name it                       | `chains list utxo`            |
| `mcp`      | The MCP server on stdio                                            | `chains mcp`                  |

Every command but `resolve` prints the exact text the agent tool hands a model, and `--json` swaps it for the structured answer. `info`, `resolve`, `validate`, `txid` and `list` exit 1 when they fail, a rejected address included. `identify` doesn't, a miss is an answer too. More in the [CLI guide](https://chains.agntn.dev/guide/cli).

## 🧠 Library

```ts
import { create, getChain, identify, InvalidAddressError } from "@agntn/chains";

const polygon = getChain("matic");
polygon.key; // "polygon"
polygon.chainId; // "0x89"
polygon.caip2; // "eip155:137"

getChain("btc").assertAddress("bc1qjvm9jkrjw9uvsn8905dwa6eau0guyc9laau03a"); // returns it
getChain("eth").assertTxid("0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"); // the first mainnet transaction, returned too
getChain("btc").decodeAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2");
// { kind: "p2pkh", payload: "77bff20c60e522dfaa3350c39b030a5d004e839a", hash: "hash160" }

try {
  getChain("btc").assertAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3");
} catch (error) {
  error instanceof InvalidAddressError; // true
  (error as InvalidAddressError).chain; // "bitcoin"
}

identify("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984").matches.length; // 13
create("bitcoin").decimals; // 8
```

Most of the API is right there. `create(key)` wants the canonical key. `getChain(whatever)` takes any spelling and defaults to Ethereum. `chains()` lists the keys, `register(Yours)` adds one. `assertAddress` is a format check and nothing more. It doesn't know if the address exists. `decodeAddress` runs the same check, then tells you what the address pays to. The HASH160 you'd dig out with a second library is already in there. On an EVM chain it's plain `account`, nothing more inside. `assertTxid` is the same thing for a transaction id, on every chain that ships. A custom chain that skips it throws `TxidValidationUnsupportedError`, and `validatesTxid` tells you before you ask. Errors are one family under `ChainsError`, seven of them. More: [Registry](https://chains.agntn.dev/guide/registry), [Address validation](https://chains.agntn.dev/guide/validation), [Identify](https://chains.agntn.dev/guide/identify), [Metadata](https://chains.agntn.dev/guide/metadata).

## 🗺️ Chains

| Family    | Chains                                                                                                             | What the check decodes                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evm`     | ethereum, base, arbitrum, optimism, polygon, bsc, avalanche, fantom, gnosis, linea, zksync, scroll, berachain, arc | 40 hex digits behind `0x`, mixed case has to pass EIP-55                                                                                                                                                                                              |
| `utxo`    | bitcoin, litecoin, pepecoin, ecash, cardano, decred, dogecoin, bitcoincash, bitcoinsv, bitcoingold, dash, zcash    | Base58Check with the checksum, BLAKE-256 for Decred, Bech32 and Bech32m for `bc1`, `ltc1` and `btg1`, Bech32 for MWEB's `ltcmweb1`, CashAddr for eCash and Bitcoin Cash, CIP-19 for Cardano, ZIP-316 Unified Addresses with F4Jumble undone for Zcash |
| `solana`  | solana                                                                                                             | 32 base58 bytes, exactly                                                                                                                                                                                                                              |
| `stellar` | stellar                                                                                                            | SEP-23 Strkeys with the CRC16, muxed accounts and contracts included                                                                                                                                                                                  |
| `xrpl`    | xrpl                                                                                                               | Base58Check under the ledger's own alphabet, classic accounts and X-addresses                                                                                                                                                                         |
| `move`    | aptos, sui                                                                                                         | All 32 bytes of hex, or the one-digit short form AIP-40 allows                                                                                                                                                                                        |
| `ton`     | ton                                                                                                                | The TEP-2 friendly form in either base64 alphabet, tag, workchain and CRC16 checked                                                                                                                                                                   |
| `tron`    | tron                                                                                                               | 25 Base58Check bytes under version `0x41`                                                                                                                                                                                                             |
| `octra`   | octra                                                                                                              | `oct` and 44 characters, that's the whole format                                                                                                                                                                                                      |
| `arweave` | arweave                                                                                                            | 43 characters of base64url, a 32-byte hash                                                                                                                                                                                                            |
| `monero`  | monero                                                                                                             | Block base58, the network byte, the 69 or 77 byte envelope and the Keccak checksum                                                                                                                                                                    |
| `near`    | near                                                                                                               | NEAR's account ID grammar, `alice.near` or an implicit hex key. No checksum exists, so there's none to verify                                                                                                                                         |

Transaction ids get the same care: hex, base58 or base64, whatever the chain's node writes, and the [validation guide](https://chains.agntn.dev/guide/validation#transaction-ids) has the table. Testnet addresses are refused wherever the format can tell. Each chain's page says which checksum is verified and which is left alone: [Chains](https://chains.agntn.dev/chains).

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

On the AI SDK? Skip the wrappers, they're already written:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { chainsAiTools } from "@agntn/chains/ai";
import { generateText, isStepCount } from "ai";

const { text } = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  tools: chainsAiTools,
  stopWhen: isStepCount(5),
  prompt: "Which chains accept 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed?",
});
```

Five tools, the same five on MCP, Pi, OMP and the AI SDK. A rejected address is an answer, not a tool error. An unknown chain comes back with the keys that do exist. And fourteen EVM matches are fourteen possibilities, the tool says so itself. [Agents guide](https://chains.agntn.dev/guide/agents).

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
