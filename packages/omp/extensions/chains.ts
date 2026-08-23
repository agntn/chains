import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type * as ChainsTools from "../../../dist/tool-operations.d.mts";

const distributionModulePath = fileURLToPath(
  new URL("../../../dist/tool-operations.mjs", import.meta.url),
);
let toolOperationsPromise: Promise<typeof ChainsTools> | undefined;

/**
 * Loads the built tool executors, falling back to source only when dist is absent.
 *
 * Both specifiers stay literal on purpose: OMP's compiled loader rewrites bare
 * dependencies only for imports it can see statically, so an `import(url.href)`
 * built from a runtime value loses resolution inside the imported graph.
 * Dist comes first because the library's internal imports use `.js` specifiers
 * under NodeNext resolution, which a bare TypeScript-stripping runtime cannot
 * resolve back to `.ts` files. Run `pnpm build` before loading the extension
 * from a working tree.
 */
function loadToolOperations(): Promise<typeof ChainsTools> {
  toolOperationsPromise ??= (
    existsSync(distributionModulePath)
      ? import("../../../dist/tool-operations.mjs")
      : import("../../../src/tool-operations.ts")
  ) as Promise<typeof ChainsTools>;

  return toolOperationsPromise;
}

export default function chainsExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "chains_lookup",
    label: "Chain Lookup",
    description:
      "Resolve a blockchain by key, name, symbol, or alias and return its canonical metadata",
    promptSnippet:
      "Use chains_lookup to resolve a blockchain's canonical key, chain ID, CAIP-2 identifier, or explorer.",
    promptGuidelines: [
      "Accepts aliases such as matic, arb, avax, btc, or a full name such as Ethereum.",
      "Prefer this over hardcoding chain IDs, BIP-44 coin types, or explorer URLs.",
    ],
    parameters: Type.Object({
      chain: Type.String({
        description: "Chain key, name, symbol, or alias (for example: eth, matic, btc)",
        minLength: 1,
        maxLength: 64,
      }),
    }),
    async execute(
      _toolCallId,
      params,
    ): Promise<AgentToolResult<ChainsTools.ChainLookup | ChainsTools.LookupFailure>> {
      const { lookupChain } = await loadToolOperations();
      const { content, details } = lookupChain(params.chain);
      return { content, details };
    },
  });

  pi.registerTool({
    name: "chains_validate_address",
    label: "Validate Chain Address",
    description: "Check an address against the format rules of a specific blockchain",
    promptSnippet:
      "Use chains_validate_address before sending funds or storing an address, to confirm it matches the target chain's format.",
    promptGuidelines: [
      "Validation is a format check, not a checksum or on-chain existence check.",
      "Chains without a registered validator report valid: false with a reason.",
      "When the owning chain is unknown, chains_identify_address checks every validator at once.",
    ],
    parameters: Type.Object({
      chain: Type.String({
        description: "Chain key, name, symbol, or alias",
        minLength: 1,
        maxLength: 64,
      }),
      address: Type.String({
        description: "Address to validate",
        minLength: 1,
        maxLength: 256,
      }),
    }),
    async execute(_toolCallId, params): Promise<AgentToolResult<ChainsTools.AddressCheck>> {
      const { validateChainAddress } = await loadToolOperations();
      const { content, details } = validateChainAddress(params.chain, params.address);
      return { content, details };
    },
  });

  pi.registerTool({
    name: "chains_identify_address",
    label: "Identify Address",
    description: "Report which registered blockchains accept an address's format",
    promptSnippet:
      "Use chains_identify_address when an address's origin is unknown, to narrow it down to the chains whose format rules accept it.",
    promptGuidelines: [
      "A format match narrows the family; every EVM chain shares one address format.",
      "Chains without a validator are reported as unchecked, not as non-matches.",
    ],
    parameters: Type.Object({
      address: Type.String({
        description: "Address of unknown origin",
        minLength: 1,
        maxLength: 256,
      }),
    }),
    async execute(
      _toolCallId,
      params,
    ): Promise<AgentToolResult<ChainsTools.AddressIdentification>> {
      const { identifyAddress } = await loadToolOperations();
      const { content, details } = identifyAddress(params.address);
      return { content, details };
    },
  });

  pi.registerTool({
    name: "chains_list",
    label: "List Chains",
    description: "List every registered blockchain, optionally narrowed to one family",
    promptSnippet:
      "Use chains_list to see which blockchains are available, instead of guessing a chain name.",
    promptGuidelines: [
      "Families are evm, utxo, solana, move, ton, tron and octra.",
      "Every key and name it prints resolves in chains_lookup.",
    ],
    parameters: Type.Object({
      family: Type.Optional(
        Type.String({
          description: "Chain family to filter by (for example: evm, utxo, solana, move)",
          minLength: 1,
          maxLength: 32,
        }),
      ),
    }),
    async execute(_toolCallId, params): Promise<AgentToolResult<ChainsTools.ChainListing>> {
      const { listChains } = await loadToolOperations();
      const { content, details } = listChains(params.family);
      return { content, details };
    },
  });
}
