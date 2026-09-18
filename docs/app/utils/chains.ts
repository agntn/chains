import { chains, create, type Chain, type ChainKey, type ChainType } from "@agntn/chains";

/** Chain families as the library names them, plus a label the page can show. */
export const FAMILIES: ReadonlyArray<{ key: ChainType; label: string }> = [
  { key: "evm", label: "EVM" },
  { key: "utxo", label: "UTXO" },
  { key: "solana", label: "Solana" },
  { key: "stellar", label: "Stellar" },
  { key: "xrpl", label: "XRP Ledger" },
  { key: "move", label: "Move" },
  { key: "ton", label: "TON" },
  { key: "tron", label: "TRON" },
  { key: "octra", label: "Octra" },
  { key: "arweave", label: "Arweave" },
  { key: "monero", label: "Monero" },
];

/** The address every EVM chain accepts: the UNI token contract, 40 hex digits behind 0x. */
const EVM_SAMPLE = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

/**
 * Icon, one spelling `getChain` accepts and a sample address per chain. Icons come from the
 * monochrome `token` collection; Pepecoin and Octra have none there, so they keep a Lucide glyph.
 * The samples are public test vectors and well known contracts, checked against `dist/`
 * before they were written down. Everything else comes from `create(key)`.
 */
const PRESENTATION: Record<ChainKey, { icon: string; alias: string; sample: string }> = {
  ethereum: { icon: "i-token-eth", alias: "eth", sample: EVM_SAMPLE },
  base: { icon: "i-token-base", alias: "coinbase", sample: EVM_SAMPLE },
  arbitrum: { icon: "i-token-arbitrum-one", alias: "arb", sample: EVM_SAMPLE },
  optimism: { icon: "i-token-op", alias: "op", sample: EVM_SAMPLE },
  polygon: { icon: "i-token-pol", alias: "matic", sample: EVM_SAMPLE },
  bsc: { icon: "i-token-bnb", alias: "bnb", sample: EVM_SAMPLE },
  avalanche: { icon: "i-token-avax", alias: "avax", sample: EVM_SAMPLE },
  fantom: { icon: "i-token-ftm", alias: "ftm", sample: EVM_SAMPLE },
  gnosis: { icon: "i-token-gno", alias: "xdai", sample: EVM_SAMPLE },
  linea: { icon: "i-token-linea", alias: "Linea", sample: EVM_SAMPLE },
  zksync: { icon: "i-token-zksync", alias: "zksync-era", sample: EVM_SAMPLE },
  scroll: { icon: "i-token-scroll", alias: "Scroll", sample: EVM_SAMPLE },
  berachain: { icon: "i-token-berachain", alias: "bera", sample: EVM_SAMPLE },
  arc: { icon: "i-token-arc", alias: "circle", sample: EVM_SAMPLE },
  bitcoin: {
    icon: "i-token-btc",
    alias: "btc",
    sample: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
  },
  litecoin: {
    icon: "i-token-ltc",
    alias: "ltc",
    sample: "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w",
  },
  pepecoin: { icon: "i-lucide-leaf", alias: "pep", sample: "PftB3JYp6r3PPkiLPoPoT6vdS77NR4mhyb" },
  ecash: {
    icon: "i-token-xec",
    alias: "xec",
    sample: "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2",
  },
  cardano: {
    icon: "i-token-ada",
    alias: "ada",
    sample:
      "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
  },
  solana: {
    icon: "i-token-sol",
    alias: "sol",
    sample: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  stellar: {
    icon: "i-token-xlm",
    alias: "xlm",
    sample: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
  },
  xrpl: { icon: "i-token-xrp", alias: "ripple", sample: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH" },
  aptos: { icon: "i-token-apt", alias: "apt", sample: "0x1" },
  sui: {
    icon: "i-token-sui",
    alias: "Sui",
    sample: "0x0000000000000000000000000000000000000000000000000000000000000002",
  },
  ton: {
    icon: "i-token-ton",
    alias: "ton",
    sample: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  },
  tron: { icon: "i-token-trx", alias: "trx", sample: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  octra: {
    icon: "i-lucide-octagon",
    alias: "oct",
    sample: "oct7xCozDD9JEsbeVpo5C7HXp2BJbKqfmNUHmDDCCTtWcGb",
  },
  arweave: {
    icon: "i-token-ar",
    alias: "ar",
    sample: "kY9RAgTJEImkBpiKgVeXrsGV02T-D4dI3ZvSpnn7HSk",
  },
  monero: {
    icon: "i-token-xmr",
    alias: "xmr",
    sample:
      "4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge",
  },
  decred: { icon: "i-token-dcr", alias: "dcr", sample: "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJu" },
};

export interface ChainEntry {
  key: ChainKey;
  to: string;
  icon: string;
  alias: string;
  sample: string;
  chain: Chain;
}

/** The built-in chains in registry order, with a live instance each. */
export const CHAINS: readonly ChainEntry[] = chains().map((key) => ({
  key,
  to: `/chains/${key}`,
  icon: PRESENTATION[key].icon,
  alias: PRESENTATION[key].alias,
  sample: PRESENTATION[key].sample,
  chain: create(key),
}));

export function chainEntry(key: string): ChainEntry | undefined {
  return CHAINS.find((entry) => entry.key === key);
}

export function familyLabel(family: ChainType | string): string {
  return FAMILIES.find((row) => row.key === family)?.label ?? family;
}

/** The five agent tools. Same names over MCP, Pi and OMP. */
export const TOOLS = [
  "chains_lookup",
  "chains_validate_address",
  "chains_validate_txid",
  "chains_identify_address",
  "chains_list",
] as const;
