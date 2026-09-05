import { runCommand } from "citty";
import consola from "consola";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chains, create, getChain, type ChainKey } from "../../src/index.ts";
import info from "../../src/commands/info.ts";
import { lookupChain } from "../../src/tool-operations.ts";

/** Independent reference values; sources are listed in docs/native-decimals.md. */
const nativeDecimals = {
  ethereum: 18,
  base: 18,
  arbitrum: 18,
  optimism: 18,
  polygon: 18,
  bsc: 18,
  avalanche: 18,
  fantom: 18,
  gnosis: 18,
  linea: 18,
  zksync: 18,
  scroll: 18,
  berachain: 18,
  bitcoin: 8,
  litecoin: 8,
  pepecoin: 8,
  ecash: 2,
  cardano: 6,
  solana: 9,
  stellar: 7,
  xrpl: 6,
  aptos: 8,
  sui: 9,
  ton: 9,
  tron: 6,
  octra: 6,
  arweave: 12,
  monero: 12,
  decred: 8,
} satisfies Record<ChainKey, number>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("native currency decimals", () => {
  it("supplies the reference precision for every built-in chain", () => {
    expect(Object.keys(nativeDecimals).sort()).toEqual(chains().sort());
    for (const key of chains()) {
      expect(create(key), key).toMatchObject({ decimals: nativeDecimals[key] });
    }
  });

  it.each([
    ["ETH", 18],
    ["xec", 2],
    ["apt", 8],
    ["sui", 9],
    ["xlm", 7],
    ["AR", 12],
  ])("keeps %s precision in resolved metadata and tool text", (alias, decimals) => {
    expect(getChain(alias)).toMatchObject({ decimals });
    const result = lookupChain(alias);
    expect(result.isError).not.toBe(true);
    expect(result.details).toMatchObject({ decimals });
    expect(result.content[0]?.text.split("\n")).toContain(`decimals: ${decimals}`);
  });

  it.each([
    ["eth", 18],
    ["xec", 2],
  ])("prints %s precision in CLI text and JSON", async (alias, decimals) => {
    const log = vi.spyOn(consola, "log").mockImplementation(() => {});
    await runCommand(info, { rawArgs: [alias] });
    expect(log.mock.calls.map(([line]) => String(line))).toContain(`  decimals    ${decimals}`);
    log.mockClear();
    await runCommand(info, { rawArgs: [alias, "--json"] });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ decimals });
  });
});
