import { create, getChain, identify, InvalidAddressError, type Chain } from "@agntn/chains";
import { chainEntry, type ChainEntry } from "../utils/chains";

/** The order the landing walks the chains in. EVM chains are spread out, they all look alike. */
const WALK = [
  "ethereum",
  "bitcoin",
  "solana",
  "base",
  "cardano",
  "ton",
  "arbitrum",
  "stellar",
  "arweave",
  "optimism",
  "tron",
  "monero",
  "polygon",
  "xrpl",
  "aptos",
  "bsc",
  "litecoin",
  "decred",
  "avalanche",
  "sui",
  "ecash",
  "fantom",
  "octra",
  "gnosis",
  "pepecoin",
  "linea",
  "zksync",
  "scroll",
  "dogecoin",
  "bitcoincash",
  "bitcoinsv",
  "bitcoingold",
  "dash",
  "berachain",
  "arc",
] as const;

export interface AddressCheck {
  /** The chain the address was checked against. */
  chain: Chain;
  address: string;
  valid: boolean;
  /** The error class when rejected, empty when the address came back unchanged. */
  error: string;
  /** What the row demonstrates: `own`, `foreign` or `mistyped`. */
  kind: "own" | "foreign" | "mistyped";
}

export interface LandingSample {
  entry: ChainEntry;
  chain: Chain;
  address: string;
  /** The sample against its own chain, against a foreign chain, and one character off. */
  checks: AddressCheck[];
  /** Keys of every chain whose validator accepts the sample. */
  matches: string[];
  /** Keys of chains that carry no validator; empty while every built-in has one. */
  unchecked: string[];
}

/** Moves one character to the next one of its kind, so a checksum has something to catch. */
function bump(character: string): string {
  if (/[0-9]/u.test(character)) return String((Number(character) + 1) % 10);
  if (/[a-z]/u.test(character)) return character === "z" ? "a" : String.fromCodePoint(character.codePointAt(0)! + 1);
  if (/[A-Z]/u.test(character)) return character === "Z" ? "A" : String.fromCodePoint(character.codePointAt(0)! + 1);
  return character;
}

/** The first small edit the chain rejects: last character bumped, then last character dropped. */
function mistype(chain: Chain, address: string): string | undefined {
  const candidates = [address.slice(0, -1) + bump(address.at(-1) ?? ""), address.slice(0, -1)];
  return candidates.find((candidate) => {
    try {
      chain.assertAddress(candidate);
      return false;
    } catch {
      return true;
    }
  });
}

function check(chain: Chain, address: string, kind: AddressCheck["kind"]): AddressCheck {
  try {
    chain.assertAddress(address);
    return { chain, address, valid: true, error: "", kind };
  } catch (error) {
    if (!(error instanceof InvalidAddressError)) throw error;
    return { chain, address, valid: false, error: error.name, kind };
  }
}

/** Builds one fixed sample. A throw here is a broken sample, not a runtime case. */
export function buildSample(entry: ChainEntry): LandingSample {
  const chain = entry.chain;
  const foreign = getChain(chain.type === "evm" ? "bitcoin" : "ethereum");
  const wrong = mistype(chain, entry.sample);
  const checks = [check(chain, entry.sample, "own"), check(foreign, entry.sample, "foreign")];
  if (wrong !== undefined) checks.push(check(chain, wrong, "mistyped"));
  const partition = identify(entry.sample);
  return {
    entry,
    chain,
    address: entry.sample,
    checks,
    matches: partition.matches.map((match) => match.key),
    unchecked: partition.unchecked.map((match) => match.key),
  };
}

/** One clock for every landing panel. The library computes the samples, at build and live. */
export function useLandingChain() {
  const samples = WALK.map((key) => buildSample(chainEntry(key)!));
  const tick = ref(0);
  const paused = ref(false);
  const index = computed(() => tick.value % samples.length);
  const current = computed(() => samples[index.value]!);

  let timer: number | undefined;

  /** Wraps at both ends, so the previous button on the first chain lands on the last one. */
  function step(delta: number) {
    tick.value = (tick.value + delta + samples.length) % samples.length;
  }

  function stopWalk() {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function startWalk() {
    stopWalk();
    if (!import.meta.client || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    timer = window.setInterval(() => {
      if (!paused.value && !document.hidden) {
        step(1);
      }
    }, 4200);
  }

  onMounted(startWalk);
  onUnmounted(stopWalk);

  return { samples, tick, index, paused, current, step, create };
}
