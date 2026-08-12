# chains

Blockchain data dictionary — canonical chain info, aliases, inter-lib bridges, address validation.

Słownik danych o blockchainach. Jeden zestaw prawdy dla wszystkich web3 bibliotek Ori.

## Stack

TypeScript, ESM-only, 0 runtime deps (pure data + regex).

## Instalacja

```bash
pnpm add chains
```

## Użycie

```typescript
import { CHAIN_DATA, normalizeChain, assertEvmAddress, isEvm, rpcxChain } from "chains";

// Normalize any chain input
const chain = normalizeChain("matic"); // → 'polygon'
const chain2 = normalizeChain("avax"); // → 'avalanche'

// Lookup chain data
const eth = CHAIN_DATA.eth;
eth.name; // 'Ethereum'
eth.symbol; // 'ETH'
eth.bip44; // 60
eth.chainId; // '0x1'
eth.caip2; // 'eip155:1'
eth.type; // 'evm'
eth.explorer; // 'https://etherscan.io'

// Inter-lib bridges
rpcxChain("eth"); // → 'ethereum'  (rpcx uses full names)
blocexChain("eth"); // → 'eth'       (blocex uses 3-letter keys)

// Type guards
isEvm("polygon"); // → true
isUtxo("bitcoin"); // → true

// Address validation
assertEvmAddress("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");
assertSolanaAddress("So11111111111111111111111111111111111111112");
assertBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
```

## API

### Data

- `CHAIN_DATA` — `Record<Chain, ChainInfo>` z 20 chainami
- `CHAIN_ALIASES` — `Record<string, Chain>` wszystkie znane aliasy

### Normalize

- `normalizeChain(input?)` — dowolny input → canonical Chain (default `'eth'`)

### Inter-lib bridges

| Funkcja                | Zwraca              | Dla biblioteki |
| ---------------------- | ------------------- | -------------- |
| `blocexChain(chain)`   | 3-letter key        | blocex         |
| `rpcxChain(chain)`     | full name           | rpcx           |
| `ubichainChain(chain)` | full name           | ubichain       |
| `webriChain(chain)`    | full name/undefined | webri          |
| `tokriskChain(chain)`  | 3-letter key        | tokrisk        |
| `chainpexChain(chain)` | 3-letter key        | chainpex       |

### Type guards

`isEvm()`, `isSolana()`, `isUtxo()`, `isMove()`, `isTon()`, `isTron()`, `isOctra()`

### Address validation

`assertEvmAddress()`, `assertSolanaAddress()`, `assertBitcoinAddress()`, `assertOctraAddress()` — throw on invalid (path injection defense).

## ChainInfo fields

Każdy wpis w `CHAIN_DATA` to `ChainInfo`:

| Pole         | Typ         | Opis                                                          |
| ------------ | ----------- | ------------------------------------------------------------- |
| `name`       | `string`    | Pełna nazwa ("Ethereum")                                      |
| `symbol`     | `string`    | Symbol natywnego tokena ("ETH")                               |
| `bip44`      | `number?`   | BIP-44 / SLIP-0044 coin type, jeśli zarejestrowany            |
| `chainId`    | `string?`   | EVM chainId w hex (tylko EVM)                                 |
| `type`       | `ChainType` | Kategoria: evm/utxo/solana/move/ton/tron/octra                |
| `caip2`      | `string?`   | Identyfikator CAIP-2, jeśli istnieje udokumentowany namespace |
| `explorer`   | `string`    | URL block explorera                                           |
| `rpcDefault` | `string?`   | Domyślny publiczny endpoint RPC                               |

## Status

v0.1.0 — stabilny słownik, gotowy do konsumpcji. Identyfikatory RPC, SLIP-0044 i CAIP-2 są zapisywane tylko po weryfikacji. Licencja: brak (prywatny pakiet Ori).

## Obsługiwane chainy

| Key       | Name              | Type   | bip44 | ChainId |
| --------- | ----------------- | ------ | ----- | ------- |
| eth       | Ethereum          | EVM    | 60    | 0x1     |
| base      | Base              | EVM    | 60    | 0x2105  |
| arbitrum  | Arbitrum One      | EVM    | 60    | 0xa4b1  |
| optimism  | Optimism          | EVM    | 60    | 0xa     |
| polygon   | Polygon PoS       | EVM    | 60    | 0x89    |
| bsc       | BNB Chain         | EVM    | 60    | 0x38    |
| avalanche | Avalanche C-Chain | EVM    | 60    | 0xa86a  |
| fantom    | Fantom Opera      | EVM    | 60    | 0xfa    |
| gnosis    | Gnosis Chain      | EVM    | 60    | 0x64    |
| linea     | Linea             | EVM    | 60    | 0xe704  |
| zksync    | zkSync Era        | EVM    | 60    | 0x144   |
| scroll    | Scroll            | EVM    | 60    | 0x82750 |
| bitcoin   | Bitcoin           | UTXO   | 0     | —       |
| solana    | Solana            | Solana | 501   | —       |
| aptos     | Aptos             | Move   | 637   | —       |
| sui       | Sui               | Move   | 784   | —       |
| ton       | TON (TON)         | TON    | 607   | —       |
| tron      | TRON              | TRON   | 195   | —       |
| oct       | Octra             | Octra  | —     | —       |
