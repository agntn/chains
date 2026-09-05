# Changelog

## v0.3.3

[compare changes](https://github.com/agntn/chains/compare/v0.3.2...v0.3.3)

### 🚀 Enhancements

- Bring Arweave into the chain registry ([#25](https://github.com/agntn/chains/pull/25))

### 🩹 Fixes

- **bitcoin:** Reject invalid SegWit addresses ([#26](https://github.com/agntn/chains/pull/26))

### 📖 Documentation

- Point key derivation and RPC scope to keys and nodes ([c6ef61a](https://github.com/agntn/chains/commit/c6ef61a))

### 🏡 Chore

- Enforce shared Ox policy ([#24](https://github.com/agntn/chains/pull/24))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.3.2

[compare changes](https://github.com/agntn/chains/compare/v0.3.1...v0.3.2)

### 🚀 Enhancements

- Support Stellar Strkey addresses ([#14](https://github.com/agntn/chains/pull/14))
- Register the XRP Ledger ([#19](https://github.com/agntn/chains/pull/19))

### 🩹 Fixes

- **version:** Read package metadata ([#15](https://github.com/agntn/chains/pull/15))
- **mcp:** Stop unknown tool output injection ([#16](https://github.com/agntn/chains/pull/16))
- Hold Octra addresses to their fixed width ([#17](https://github.com/agntn/chains/pull/17))
- Quote the address in tool answers ([#18](https://github.com/agntn/chains/pull/18))
- **cli:** Escape caller text before printing it ([#20](https://github.com/agntn/chains/pull/20))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.3.1

[compare changes](https://github.com/agntn/chains/compare/v0.3.0...v0.3.1)

### 🚀 Enhancements

- Add eCash ([#13](https://github.com/agntn/chains/pull/13))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.3.0

[compare changes](https://github.com/agntn/chains/compare/v0.2.3...v0.3.0)

### 🚀 Enhancements

- Add Pepecoin ([#11](https://github.com/agntn/chains/pull/11))

### 💅 Refactors

- Registry without import side effects ([#10](https://github.com/agntn/chains/pull/10))
- ⚠️ Canonical keys name the chain, not the ticker ([#12](https://github.com/agntn/chains/pull/12))

#### ⚠️ Breaking Changes

- ⚠️ Canonical keys name the chain, not the ticker ([#12](https://github.com/agntn/chains/pull/12))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.2.3

[compare changes](https://github.com/agntn/chains/compare/v0.2.2...v0.2.3)

### 🚀 Enhancements

- Support Cardano across both address eras ([#9](https://github.com/agntn/chains/pull/9))

### 🔥 Performance

- Bundle typebox into the dist chunks ([#6](https://github.com/agntn/chains/pull/6))

### 🩹 Fixes

- Ask the registry before the alias table ([#7](https://github.com/agntn/chains/pull/7))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.2.2

[compare changes](https://github.com/agntn/chains/compare/v0.2.1...v0.2.2)

### 🚀 Enhancements

- Identify which chains accept an address ([#1](https://github.com/agntn/chains/pull/1))
- Add address validators for TRON, TON, Aptos and Sui ([#2](https://github.com/agntn/chains/pull/2))
- Register Litecoin in the chain registry ([#4](https://github.com/agntn/chains/pull/4))

### 🩹 Fixes

- Keep the OMP loader imports literal ([#3](https://github.com/agntn/chains/pull/3))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.2.1

[compare changes](https://github.com/agntn/chains/compare/v0.2.0...v0.2.1)

### 🩹 Fixes

- **ci:** Change `gitChecks` to `false` ([1511ca8](https://github.com/agntn/chains/commit/1511ca8))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))

## v0.2.0

### 🚀 Enhancements

- Chains — blockchain data dictionary (18 chains, aliases, inter-lib bridges, address validation) ([2522db9](https://github.com/agntn/chains/commit/2522db9))
- Add Octra chain metadata ([550491a](https://github.com/agntn/chains/commit/550491a))
- ⚠️ Class registry, @agntn scope, CLI and agent extensions ([4137cb2](https://github.com/agntn/chains/commit/4137cb2))
- Resolve chain display names from the registry ([9a9d59e](https://github.com/agntn/chains/commit/9a9d59e))
- MCP server over stdio with shared tool executors ([ec68c07](https://github.com/agntn/chains/commit/ec68c07))

### 🩹 Fixes

- Decode base58 and follow BIP-173 instead of matching address length ([aba5643](https://github.com/agntn/chains/commit/aba5643))
- Correct Linea chain id and replace dead default RPCs ([a8a2b1f](https://github.com/agntn/chains/commit/a8a2b1f))

### 📖 Documentation

- Rewrite README and AGENTS for the class registry ([930930c](https://github.com/agntn/chains/commit/930930c))
- Cover the MCP surface and the stricter validators ([86e8ae5](https://github.com/agntn/chains/commit/86e8ae5))

#### ⚠️ Breaking Changes

- ⚠️ Class registry, @agntn scope, CLI and agent extensions ([4137cb2](https://github.com/agntn/chains/commit/4137cb2))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))
