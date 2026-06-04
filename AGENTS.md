# AGENTS.md — chains

Scope: blockchain data dictionary — canonical chain info, normalize, inter-lib bridges, address validation.

Key files:
- `src/types.ts` — `Chain`, `ChainInfo`, `ChainType` types
- `src/data.ts` — `CHAIN_DATA`, `CHAIN_ALIASES`, normalize, bridges, guards, assert
- `src/index.ts` — re-export all public API
- `src/version.ts` — version string
- `test/unit/chains.test.ts` — 25 tests (data, aliases, bridges, guards, validation)

Shape: transformer-registry (pure data, no HTTP, no config, no API keys). See [agnostic-library-shapes](../../.aei/wiki/concepts/engineering/agnostic-library-shapes.md).

Not in scope: RPC calls, wallet creation, transaction building. Those live in rpcx/ubichain/webri.

Inter-lib bridges (`rpcxChain()`, `blocexChain()`, etc.) map canonical `Chain` → library-specific key. If a new library needs a different key, add a bridge here, not a parallel alias in the consuming library.