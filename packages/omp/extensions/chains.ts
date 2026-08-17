import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type * as ChainsModule from "../../../dist/index.d.mts";

const distributionModuleUrl = new URL("../../../dist/index.mjs", import.meta.url);
const sourceModuleUrl = new URL("../../../src/index.ts", import.meta.url);
let chainsModulePromise: Promise<typeof ChainsModule> | undefined;

/**
 * Loads the built library, falling back to source only when dist is absent.
 *
 * Dist comes first because the library's internal imports use `.js` specifiers
 * under NodeNext resolution, which a bare TypeScript-stripping runtime cannot
 * resolve back to `.ts` files. Run `pnpm build` before loading the extension
 * from a working tree.
 */
function loadLibrary(): Promise<typeof ChainsModule> {
  chainsModulePromise ??= import(
    existsSync(fileURLToPath(distributionModuleUrl))
      ? distributionModuleUrl.href
      : sourceModuleUrl.href
  ) as Promise<typeof ChainsModule>;

  return chainsModulePromise;
}

interface ChainLookup {
  key: string;
  name: string;
  symbol: string;
  type: string;
  bip44?: number;
  chainId?: string;
  caip2?: string;
  explorer: string;
  rpcDefault?: string;
}

/** Returned when the input matched no known chain. */
interface LookupFailure {
  error: string;
  input: string;
}

interface AddressCheck {
  /** Canonical key, or null when the chain itself could not be resolved. */
  chain: string | null;
  address: string;
  valid: boolean;
  reason?: string;
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
    async execute(_toolCallId, params): Promise<AgentToolResult<ChainLookup | LookupFailure>> {
      const { getChain, ChainsError } = await loadLibrary();

      try {
        const chain = getChain(params.chain);

        const details: ChainLookup = {
          key: chain.key,
          name: chain.name,
          symbol: chain.symbol,
          type: chain.type,
          bip44: chain.bip44,
          chainId: chain.chainId,
          caip2: chain.caip2,
          explorer: chain.explorer,
          rpcDefault: chain.rpcDefault,
        };

        const lines = [
          `${details.name} (${details.key})`,
          `symbol: ${details.symbol}`,
          `type: ${details.type}`,
          details.chainId ? `chainId: ${details.chainId}` : undefined,
          details.caip2 ? `caip2: ${details.caip2}` : undefined,
          details.bip44 === undefined ? undefined : `bip44: ${details.bip44}`,
          `explorer: ${details.explorer}`,
          details.rpcDefault ? `rpc: ${details.rpcDefault}` : undefined,
        ].filter(Boolean);

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details,
        };
      } catch (error) {
        if (error instanceof ChainsError) {
          return {
            content: [{ type: "text", text: error.message }],
            details: { error: error.message, input: params.chain },
          };
        }
        throw error;
      }
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
    async execute(_toolCallId, params): Promise<AgentToolResult<AddressCheck>> {
      const { getChain, ChainsError } = await loadLibrary();

      try {
        const chain = getChain(params.chain);
        try {
          chain.assertAddress(params.address);
          const details: AddressCheck = {
            chain: chain.key,
            address: params.address,
            valid: true,
          };
          return {
            content: [{ type: "text", text: `Valid ${chain.name} address` }],
            details,
          };
        } catch (error) {
          if (error instanceof ChainsError) {
            const details: AddressCheck = {
              chain: chain.key,
              address: params.address,
              valid: false,
              reason: error.message,
            };
            return {
              content: [{ type: "text", text: error.message }],
              details,
            };
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof ChainsError) {
          return {
            content: [{ type: "text", text: error.message }],
            details: {
              chain: null,
              address: params.address,
              valid: false,
              reason: error.message,
            },
          };
        }
        throw error;
      }
    },
  });
}
