<script setup lang="ts">
import {
  AddressValidationUnsupportedError,
  ChainsError,
  chains,
  create,
  getChain,
  identify,
  InvalidAddressError,
  InvalidTxidError,
  TxidValidationUnsupportedError,
  type Chain,
} from "@agntn/chains";
import { CHAINS, FAMILIES, chainEntry, familyLabel } from "../../utils/chains";
import { hostPath, shellArg, shorten } from "../../utils/format";
import { jsonTokens, shellTokens } from "../../utils/tokens";
import {
  identifyText,
  listText,
  lookupText,
  validateText,
  validateTxidText,
} from "../../utils/tools";

type Operation = "lookup" | "validate" | "txid" | "identify" | "list";

const OPERATIONS: ReadonlyArray<{
  key: Operation;
  label: string;
  tool: string;
  about: string;
}> = [
  {
    key: "lookup",
    label: "Lookup",
    tool: "chains_lookup",
    about: "getChain(input) and every field on the class, the absent ones named as absent.",
  },
  {
    key: "validate",
    label: "Validate",
    tool: "chains_validate_address",
    about: "getChain(input).assertAddress(address): decoded, checksum verified where the format has one.",
  },
  {
    key: "txid",
    label: "Txid",
    tool: "chains_validate_txid",
    about: "getChain(input).assertTxid(txid): the shape the chain's own node writes, nothing more.",
  },
  {
    key: "identify",
    label: "Identify",
    tool: "chains_identify_address",
    about: "identify(address): every validator in the registry at once, grouped by family.",
  },
  {
    key: "list",
    label: "List",
    tool: "chains_list",
    about: "chains().map(create), narrowed to one family if you pick one.",
  },
];

const route = useRoute();
const router = useRouter();

const operation = ref<Operation>("validate");
const chainInput = ref("btc");
const address = ref(chainEntry("bitcoin")!.sample);
/** The genesis coinbase, a real id for the chain the form opens on. */
const txid = ref("4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b");
const family = ref("");

const needsChain = computed(
  () =>
    operation.value === "lookup" || operation.value === "validate" || operation.value === "txid",
);
const needsAddress = computed(() => operation.value === "validate" || operation.value === "identify");
const needsTxid = computed(() => operation.value === "txid");

interface LookupAnswer {
  kind: "lookup";
  chain: Chain;
  text: string;
}
interface ValidateAnswer {
  kind: "validate";
  chain: Chain;
  valid: boolean;
  text: string;
}
interface TxidAnswer {
  kind: "txid";
  chain: Chain;
  valid: boolean;
  text: string;
}
interface IdentifyAnswer {
  kind: "identify";
  matches: Chain[];
  unchecked: Chain[];
  text: string;
}
interface ListAnswer {
  kind: "list";
  rows: Chain[];
  text: string;
}
interface ErrorAnswer {
  kind: "error";
  name: string;
  message: string;
  text: string;
}
type Answer = LookupAnswer | ValidateAnswer | TxidAnswer | IdentifyAnswer | ListAnswer | ErrorAnswer;

function failure(error: unknown): ErrorAnswer {
  const message = error instanceof Error ? error.message : String(error);
  return {
    kind: "error",
    name: error instanceof ChainsError ? error.name : "Error",
    message,
    text: message,
  };
}

/** Resolves the chain field the way the CLI and the tools do: key, name, symbol or alias. */
function resolve(): Chain | ErrorAnswer {
  try {
    return getChain(chainInput.value);
  } catch (error) {
    if (error instanceof ChainsError) return failure(error);
    throw error;
  }
}

const answer = computed<Answer>(() => {
  const trimmed = address.value.trim();
  if (operation.value === "list") {
    const rows = chains()
      .map((key) => create(key))
      .filter((chain) => family.value === "" || chain.type === family.value);
    return { kind: "list", rows, text: listText(family.value || undefined) };
  }
  if (operation.value === "identify") {
    const { matches, unchecked } = identify(trimmed);
    return { kind: "identify", matches, unchecked, text: identifyText(trimmed) };
  }
  const chain = resolve();
  if ("kind" in chain) return chain;
  if (operation.value === "lookup") {
    return { kind: "lookup", chain, text: lookupText(chain) };
  }
  if (operation.value === "txid") {
    const id = txid.value.trim();
    try {
      chain.assertTxid(id);
      return { kind: "txid", chain, valid: true, text: validateTxidText(chain, id, true) };
    } catch (error) {
      if (error instanceof InvalidTxidError) {
        return { kind: "txid", chain, valid: false, text: validateTxidText(chain, id, false) };
      }
      if (error instanceof TxidValidationUnsupportedError) return failure(error);
      throw error;
    }
  }
  try {
    chain.assertAddress(trimmed);
    return { kind: "validate", chain, valid: true, text: validateText(chain, trimmed, true) };
  } catch (error) {
    if (error instanceof InvalidAddressError) {
      return {
        kind: "validate",
        chain,
        valid: false,
        text: validateText(chain, trimmed, false, error.reason),
      };
    }
    if (error instanceof AddressValidationUnsupportedError) return failure(error);
    throw error;
  }
});

const current = computed(() => OPERATIONS.find((row) => row.key === operation.value)!);
const position = computed(() => OPERATIONS.findIndex((row) => row.key === operation.value) + 1);

/** The chain the answer is about, for the reticle and the links; none for identify, list and errors. */
const answerChain = computed(() =>
  "chain" in answer.value ? chainEntry(answer.value.chain.key) : undefined,
);

/** The same call as one CLI line. */
const cliLine = computed(() => {
  switch (operation.value) {
    case "lookup":
      return `chains info ${shellArg(chainInput.value)}`;
    case "validate":
      return `chains validate ${shellArg(chainInput.value)} ${shellArg(address.value.trim())}`;
    case "txid":
      return `chains validate ${shellArg(chainInput.value)} ${shellArg(txid.value.trim())} --txid`;
    case "identify":
      return `chains identify ${shellArg(address.value.trim())}`;
    default:
      return family.value ? `chains list --type ${family.value}` : "chains list";
  }
});

const toolArgs = computed((): Record<string, string> =>
  operation.value === "lookup"
    ? { chain: chainInput.value }
    : operation.value === "validate"
      ? { chain: chainInput.value, address: address.value.trim() }
      : operation.value === "txid"
        ? { chain: chainInput.value, txid: txid.value.trim() }
        : operation.value === "identify"
          ? { address: address.value.trim() }
          : family.value
            ? { family: family.value }
            : {},
);

/** The same call as a tool invocation, the JSON an MCP client sends. */
const toolCall = computed(() =>
  JSON.stringify({ name: current.value.tool, arguments: toolArgs.value }, null, 2),
);

/** The call in short form for the response bar: the tool with its arguments shortened. */
const call = computed(() => {
  const args = Object.values(toolArgs.value).map((value) => `"${shorten(value, 8, 4)}"`);
  return `${current.value.tool}(${args.join(", ")})`;
});
const responseTitle = computed(() => `${current.value.tool}(${JSON.stringify(toolArgs.value)})`);

/** The optional fields on the class, the ones `chains_lookup` prints; the gauge has a tick each. */
const lookupFields = computed(() => {
  if (answer.value.kind !== "lookup") return [];
  const chain = answer.value.chain;
  return [
    { label: "decimals", set: chain.decimals !== undefined },
    { label: "chainId", set: chain.chainId !== undefined },
    { label: "caip2", set: chain.caip2 !== undefined },
    { label: "bip44", set: chain.bip44 !== undefined },
    { label: "magic", set: chain.magic !== undefined },
    { label: "pow", set: chain.pow !== undefined },
    { label: "rpc", set: chain.rpcDefault !== undefined },
    { label: "address check", set: chain.validatesAddress },
    { label: "txid check", set: chain.validatesTxid },
  ];
});

/** The network fields as leads, `none` where the class has nothing to say. */
const lookupLeads = computed(() => {
  if (answer.value.kind !== "lookup") return [];
  const chain = answer.value.chain;
  return [
    { tag: "caip2", value: chain.caip2 ?? "none", full: chain.caip2 },
    { tag: "magic", value: chain.magic ?? "none", full: chain.magic },
    { tag: "pow", value: chain.pow ?? "none", full: chain.pow },
    { tag: "rpc", value: chain.rpcDefault ? hostPath(chain.rpcDefault) : "none", full: chain.rpcDefault },
    { tag: "explorer", value: hostPath(chain.explorer), full: chain.explorer },
  ];
});

/** Families with their hit counts, for the identify census. */
const identifyCells = computed(() => {
  if (answer.value.kind !== "identify") return [];
  const matches = answer.value.matches;
  return FAMILIES.map((row) => {
    const members = CHAINS.filter((entry) => entry.chain.type === row.key);
    const hits = members.filter((entry) => matches.some((match) => match.key === entry.key));
    return { ...row, total: members.length, hits: hits.length };
  });
});

const familyItems = [
  { label: "every family", value: "" },
  ...FAMILIES.map((row) => ({ label: `${row.label} · ${row.key}`, value: row.key })),
];

/** The cursor and the scan run once per answer, not once per keystroke that changes nothing. */
const scan = ref(0);
watch(
  () => answer.value.text,
  () => {
    scan.value += 1;
  },
);

function loadSample(key: string) {
  const entry = chainEntry(key);
  if (!entry) return;
  chainInput.value = entry.alias;
  address.value = entry.sample;
  if (operation.value === "list") operation.value = "validate";
}

const { copied, copy } = useCopied();

/** Query in, state out. Only values the form knows are read, the rest of the query is ignored. */
function readQuery(query: Record<string, unknown>) {
  const op = String(query.op ?? "");
  if (OPERATIONS.some((row) => row.key === op)) {
    operation.value = op as Operation;
  }
  if (typeof query.chain === "string") chainInput.value = query.chain;
  if (typeof query.address === "string") address.value = query.address;
  if (typeof query.txid === "string") txid.value = query.txid;
  if (typeof query.family === "string" && FAMILIES.some((row) => row.key === query.family)) {
    family.value = query.family;
  }
}

const shareQuery = computed(() => {
  const query: Record<string, string> = { op: operation.value };
  if (needsChain.value) query.chain = chainInput.value;
  if (needsAddress.value) query.address = address.value.trim();
  if (needsTxid.value) query.txid = txid.value.trim();
  if (operation.value === "list" && family.value) query.family = family.value;
  return query;
});

/** Deep link once after mount. A prerendered page hydrates with an empty query at first. */
function applyDeepLink() {
  const stop = watch(
    () => route.query,
    (query) => {
      readQuery(query as Record<string, unknown>);
      stop();
    },
    { once: true, flush: "post" },
  );
  if (Object.keys(route.query).length > 0) {
    stop();
    readQuery(route.query as Record<string, unknown>);
  }
}

onMounted(() => {
  applyDeepLink();
  watch(shareQuery, (query) => {
    void router.replace({ query });
  });
});

const shareLink = computed(() => {
  if (!import.meta.client) {
    return "";
  }
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(shareQuery.value).toString();
  return url.toString();
});
</script>

<template>
  <div class="playground">
    <form class="tool-console console-wide" @submit.prevent>
      <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
      <span class="console-cross console-cross-br" aria-hidden="true">+</span>
      <header class="console-bar">
        <span class="console-title"
          ><span class="console-tag">Call</span>{{ current.tool
          }}<span class="console-file"
            >{{ String(position).padStart(2, "0") }} / {{ OPERATIONS.length }}</span
          ></span
        >
        <span class="console-meta" aria-label="Supported hosts: MCP, Pi and OMP"
          >MCP · Pi · OMP</span
        >
        <span class="console-mark" aria-hidden="true" />
      </header>
      <div class="console-ruler" aria-hidden="true"><span class="console-cursor" /></div>

      <div class="console-band playground-band-first playground-columns">
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span
              >Operation <span aria-hidden="true">[ {{ OPERATIONS.length }} ]</span></span
            >
            <span class="console-mark" aria-hidden="true" />
          </p>
          <div role="group" aria-label="Operation" class="playground-ops console-draw">
            <button
              v-for="(row, index) in OPERATIONS"
              :key="row.key"
              type="button"
              class="console-lead"
              :aria-pressed="operation === row.key"
              @click="operation = row.key"
            >
              <span class="console-tag">{{ row.label }}</span>
              <span>{{ row.tool }}</span>
              <span
                class="console-leader"
                aria-hidden="true"
                :style="{ animationDelay: `${index * 60}ms` }"
              />
            </button>
          </div>
          <p class="console-about playground-tool-about">{{ current.about }}</p>
        </div>

        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span
              >Input
              <span aria-hidden="true"
                >[
                {{
                  [needsChain && "chain", needsAddress && "address", needsTxid && "txid"]
                    .filter(Boolean)
                    .join(" · ") || "family"
                }}
                ]</span
              ></span
            >
            <span class="console-mark" aria-hidden="true" />
          </p>

          <div class="console-readout">
            <dl class="console-readout-rows">
              <div v-if="needsChain">
                <dt><label for="playground-chain">chain</label></dt>
                <dd>
                  <UInput
                    id="playground-chain"
                    v-model="chainInput"
                    variant="none"
                    placeholder="matic, btc, Arbitrum One"
                    spellcheck="false"
                    autocomplete="off"
                    class="w-full"
                  />
                </dd>
              </div>
              <div v-if="needsAddress">
                <dt><label for="playground-address">address</label></dt>
                <dd>
                  <UInput
                    id="playground-address"
                    v-model="address"
                    variant="none"
                    placeholder="bc1q…, 0x…, addr1…"
                    spellcheck="false"
                    autocomplete="off"
                    class="w-full"
                  />
                </dd>
              </div>
              <div v-if="needsTxid">
                <dt><label for="playground-txid">txid</label></dt>
                <dd>
                  <UInput
                    id="playground-txid"
                    v-model="txid"
                    variant="none"
                    placeholder="64 hex digits, 0x… on EVM"
                    spellcheck="false"
                    autocomplete="off"
                    class="w-full"
                  />
                </dd>
              </div>
              <div v-if="operation === 'list'">
                <dt><label for="playground-family">family</label></dt>
                <dd>
                  <USelectMenu
                    id="playground-family"
                    v-model="family"
                    :items="familyItems"
                    value-key="value"
                    variant="none"
                    :search-input="false"
                    class="w-full"
                  />
                </dd>
              </div>
            </dl>
          </div>

          <div
            v-if="operation !== 'list'"
            class="playground-chips"
            role="group"
            aria-label="Sample chains"
          >
            <UButton
              v-for="entry in CHAINS"
              :key="entry.key"
              :color="answerChain?.key === entry.key ? 'primary' : 'neutral'"
              variant="chip"
              :icon="entry.icon"
              :label="entry.key"
              :aria-pressed="answerChain?.key === entry.key"
              @click="loadSample(entry.key)"
            />
          </div>

          <p class="playground-note">
            The chain field takes what getChain takes: a key, a display name or an alias. A sample
            loads a known good address, so the fastest way to see a rejection is to load one and
            change a character.
          </p>
        </div>
      </div>

      <div class="console-band playground-columns">
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span>CLI <span aria-hidden="true">[ same call ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'cli' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'cli' ? 'copied' : 'copy'"
              :aria-label="copied === 'cli' ? 'Copied' : 'Copy the CLI line'"
              @click="copy('cli', cliLine)"
            />
          </p>
          <!-- prettier-ignore -->
          <pre class="console-snippet"><code><span class="playground-prompt">$ </span><span v-for="(token, index) in shellTokens(cliLine)" :key="index" :class="token.cls">{{ token.text }}</span></code></pre>
        </div>
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span>Tool <span aria-hidden="true">[ what an MCP client sends ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'tool' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'tool' ? 'copied' : 'copy'"
              :aria-label="copied === 'tool' ? 'Copied' : 'Copy the tool call'"
              @click="copy('tool', toolCall)"
            />
          </p>
          <!-- prettier-ignore -->
          <pre class="console-snippet"><code><span v-for="(token, index) in jsonTokens(toolCall)" :key="index" :class="token.cls">{{ token.text }}</span></code></pre>
        </div>
      </div>

      <footer class="console-footer console-footer-plain">
        <ul class="console-links">
          <li>
            <button type="button" @click="copy('link', shareLink)">
              <span aria-hidden="true">→ </span
              >{{ copied === "link" ? "permalink copied" : "copy the permalink" }}
            </button>
          </li>
        </ul>
        <span class="console-meta">every state is a link</span>
      </footer>
    </form>

    <!-- The call runs from the request down into the response, the way the zone's circuit runs into the request. -->
    <div class="playground-link" aria-hidden="true">
      <svg :key="cliLine" class="hero-circuit" viewBox="0 0 160 56">
        <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
        <path class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
        <path class="hero-circuit-seg" d="M96 38V48" />
        <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
      </svg>
      <span class="hero-circuit-tag">answer</span>
    </div>

    <section class="tool-console console-wide" aria-live="polite">
      <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
      <span class="console-cross console-cross-br" aria-hidden="true">+</span>
      <header class="console-bar">
        <span class="console-title playground-call"
          ><span class="console-tag">{{ current.label }}</span
          >{{ call }}</span
        >
        <span v-if="answer.kind === 'validate' || answer.kind === 'txid'" class="console-meta">{{
          answer.valid ? "valid" : "invalid"
        }}</span>
        <span v-else-if="answer.kind === 'identify'" class="console-meta"
          >{{ answer.matches.length }} of {{ CHAINS.length - answer.unchecked.length }} accept</span
        >
        <span v-else-if="answer.kind === 'list'" class="console-meta"
          ><span class="console-ticks-bar" aria-hidden="true"
            ><span v-for="row in answer.rows" :key="row.key" class="console-tick-closed" /></span
          >{{ answer.rows.length }} chains</span
        >
        <span v-else-if="answer.kind === 'lookup'" class="console-meta"
          >{{ answer.chain.type }} · {{ answer.chain.symbol }}</span
        >
        <span v-else class="console-meta">{{ answer.name }}</span>
        <span class="console-mark" aria-hidden="true" />
      </header>
      <div class="console-ruler" aria-hidden="true">
        <span :key="scan" class="console-cursor" />
      </div>

      <div
        v-if="answer.kind === 'lookup' && answerChain"
        class="console-band console-subject-band"
      >
        <div :key="scan" class="console-scan" aria-hidden="true" />
        <div class="console-identity-block">
          <ConsoleReticle :key="answer.chain.key" :icon="answerChain.icon" />
          <div class="console-name">
            <span class="console-label"
              >Chain / <span class="console-label-key">{{ answer.chain.key }}</span></span
            >
            <h3>{{ answer.chain.name }}</h3>
            <p class="console-about">
              {{ chainInput.trim() === answer.chain.key ? "The key itself" : `"${chainInput.trim()}"` }}
              resolves to the {{ familyLabel(answer.chain.type) }} class in its own file.
            </p>
          </div>
        </div>
        <div class="console-readout">
          <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
            <circle cx="3" cy="12" r="2.5" />
            <path d="M5.5 12H14L22 20H32" />
          </svg>
          <dl :key="scan" class="console-readout-rows console-animate">
            <div :style="{ animationDelay: '0ms' }">
              <dt>Symbol</dt>
              <dd>{{ answer.chain.symbol }} · {{ answer.chain.decimals ?? "unknown" }} decimals</dd>
            </div>
            <div :style="{ animationDelay: '45ms' }">
              <dt>Coin type</dt>
              <dd :class="{ 'playground-none': answer.chain.bip44 === undefined }">
                {{ answer.chain.bip44 ?? "none" }}
              </dd>
            </div>
            <div :style="{ animationDelay: '90ms' }">
              <dt>Chain ID</dt>
              <dd :class="{ 'playground-none': !answer.chain.chainId }">
                {{ answer.chain.chainId ?? "none" }}
              </dd>
            </div>
            <div :style="{ animationDelay: '135ms' }">
              <dt>Checks</dt>
              <dd class="console-accent">
                {{
                  [answer.chain.validatesAddress && "address", answer.chain.validatesTxid && "txid"]
                    .filter(Boolean)
                    .join(" · ") || "none"
                }}
              </dd>
            </div>
          </dl>
          <div class="console-gauge">
            <span class="console-ticks" aria-hidden="true">
              <span
                v-for="(field, index) in lookupFields"
                :key="field.label"
                :class="field.set ? 'console-tick-open' : 'console-tick-closed'"
                :style="{ animationDelay: `${index * 12}ms` }"
              />
            </span>
            <span class="console-gauge-read"
              >fields set {{ lookupFields.filter((field) => field.set).length }} /
              {{ lookupFields.length }}</span
            >
          </div>
        </div>
      </div>

      <div v-if="answer.kind === 'lookup'" class="console-band">
        <p class="console-label console-rule-title">
          <span>Network <span aria-hidden="true">[ as the class declares it ]</span></span>
          <span class="console-mark" aria-hidden="true" />
        </p>
        <dl class="playground-leads">
          <dd v-for="row in lookupLeads" :key="row.tag" class="console-lead">
            <span class="console-tag">{{ row.tag }}</span>
            <UTooltip v-if="row.full" :text="row.full">
              <code class="playground-code" tabindex="0">{{ row.value }}</code>
            </UTooltip>
            <code v-else class="playground-code playground-none">none</code>
            <span class="console-leader" aria-hidden="true" />
          </dd>
        </dl>
      </div>

      <div
        v-else-if="(answer.kind === 'validate' || answer.kind === 'txid') && answerChain"
        class="console-band console-subject-band"
      >
        <div :key="scan" class="console-scan" aria-hidden="true" />
        <div class="console-identity-block">
          <ConsoleReticle :key="answer.chain.key" :icon="answerChain.icon" />
          <div class="console-name">
            <span class="console-label"
              >Verdict / <span class="console-label-key">{{ answer.chain.key }}</span></span
            >
            <h3
              class="console-name-mono"
              :class="answer.valid ? 'playground-valid' : 'playground-invalid'"
            >
              {{ answer.valid ? "valid" : "invalid" }}
            </h3>
            <p class="console-about">
              <template v-if="answer.kind === 'validate' && answer.valid">
                Fits the {{ answer.chain.name }} format. Not proof it exists on chain, and where the
                format has a checksum the chain's page says whether it was verified.
              </template>
              <template v-else-if="answer.kind === 'validate'">
                Doesn't fit the {{ answer.chain.name }} format.
                <button type="button" class="playground-inline" @click="operation = 'identify'">
                  Identify
                </button>
                shows which chains, if any, accept it.
              </template>
              <template v-else-if="answer.valid">
                Fits the {{ answer.chain.name }} transaction id format. Whether it was ever mined is
                a question for a node, not for this page.
              </template>
              <template v-else>
                Doesn't fit the {{ answer.chain.name }} transaction id format. The prefix and the
                length are where a paste usually goes wrong.
              </template>
            </p>
          </div>
        </div>
        <div class="console-readout">
          <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
            <circle cx="3" cy="12" r="2.5" />
            <path d="M5.5 12H14L22 20H32" />
          </svg>
          <dl :key="scan" class="console-readout-rows console-animate">
            <div :style="{ animationDelay: '0ms' }">
              <dt>Chain</dt>
              <dd>{{ answer.chain.name }}</dd>
            </div>
            <div :style="{ animationDelay: '45ms' }">
              <dt>{{ answer.kind === "txid" ? "Txid" : "Address" }}</dt>
              <dd>
                <UTooltip :text="answer.kind === 'txid' ? txid.trim() : address.trim()">
                  <span class="playground-line" tabindex="0">{{
                    shorten(answer.kind === "txid" ? txid.trim() : address.trim(), 12, 8) || "empty"
                  }}</span>
                </UTooltip>
              </dd>
            </div>
            <div :style="{ animationDelay: '90ms' }">
              <dt>Returns</dt>
              <dd :class="answer.valid ? 'console-accent' : 'playground-invalid'">
                {{
                  answer.valid
                    ? "the input, unchanged"
                    : answer.kind === "txid"
                      ? "InvalidTxidError"
                      : "InvalidAddressError"
                }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div v-else-if="answer.kind === 'identify'" class="console-band">
        <p class="console-label console-rule-title">
          <span>Families <span aria-hidden="true">[ matches per family ]</span></span>
          <span class="console-mark" aria-hidden="true" />
        </p>
        <ul :key="scan" class="playground-census">
          <li v-for="cell in identifyCells" :key="cell.key" :data-hit="cell.hits > 0 || undefined">
            <span class="playground-census-label">{{ cell.label }}</span>
            <span class="playground-census-count"
              >{{ cell.hits }}<span> / {{ cell.total }}</span></span
            >
            <span class="playground-census-bar" aria-hidden="true"
              ><span :style="{ transform: `scaleX(${cell.hits / cell.total})` }"
            /></span>
          </li>
        </ul>
        <div v-if="answer.matches.length > 0" class="playground-chips">
          <UButton
            v-for="match in answer.matches"
            :key="match.key"
            :to="`/chains/${match.key}`"
            color="primary"
            variant="chip"
            :icon="chainEntry(match.key)?.icon"
            :label="match.key"
          />
        </div>
        <p class="playground-note">
          <template v-if="answer.matches.length === 0"
            >No chain in the registry accepts it. Check the paste before you check the
            library.</template
          >
          <template v-else
            >A format match narrows the family. It doesn't prove the address is used on any of
            them.</template
          >
          <template v-if="answer.unchecked.length > 0">
            {{ answer.unchecked.length }} chains have no validator and stay unchecked.</template
          >
        </p>
      </div>

      <ol v-else-if="answer.kind === 'list'" :key="scan" class="console-rows console-animate playground-list">
        <li
          v-for="(row, index) in answer.rows"
          :key="row.key"
          :style="{ animationDelay: `${Math.min(index * 30, 600)}ms` }"
        >
          <NuxtLink :to="`/chains/${row.key}`" class="playground-list-key"
            ><UIcon :name="chainEntry(row.key)?.icon ?? 'i-lucide-link'" aria-hidden="true" />{{
              row.key
            }}</NuxtLink
          >
          <span class="playground-list-symbol">{{ row.symbol }}</span>
          <span class="playground-list-family">{{ row.type }}</span>
          <span class="playground-list-name"
            ><span class="console-leader" aria-hidden="true" />{{ row.name }}</span
          >
        </li>
      </ol>

      <div v-else-if="answer.kind === 'error'" class="console-band console-subject-band">
        <div :key="scan" class="console-scan" aria-hidden="true" />
        <div class="console-identity-block">
          <ConsoleReticle :key="answer.name" icon="i-lucide-circle-alert" />
          <div class="console-name">
            <span class="console-label">Error / thrown</span>
            <h3 class="console-name-mono playground-invalid">{{ answer.name }}</h3>
            <p class="console-about">{{ answer.message }}</p>
          </div>
        </div>
        <div class="console-readout">
          <dl class="console-readout-rows">
            <div>
              <dt>Known keys</dt>
              <dd>
                <UTooltip :text="CHAINS.map((entry) => entry.key).join(', ')">
                  <span tabindex="0">{{ CHAINS.length }} keys, and their aliases</span>
                </UTooltip>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <ConsoleResponse :title="responseTitle" :text="answer.text" />

      <footer class="console-footer console-footer-plain">
        <ul class="console-links">
          <li v-if="answerChain">
            <NuxtLink :to="answerChain.to"
              ><span aria-hidden="true">→ </span>{{ answerChain.chain.name }}</NuxtLink
            >
          </li>
          <li>
            <NuxtLink :to="`/guide/${operation === 'txid' || operation === 'validate' ? 'validation' : operation === 'identify' ? 'identify' : 'registry'}`"
              ><span aria-hidden="true">→ </span>How it works</NuxtLink
            >
          </li>
        </ul>
        <span class="console-meta">in your browser / no network</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.playground {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}
/* The link between the two instruments: the zone's circuit, standing on its own 56 px of height. */
.playground-link {
  position: relative;
  height: 56px;
}
.playground-link > .hero-circuit {
  bottom: 0;
}
.playground-link > .hero-circuit-tag {
  bottom: 18px;
}
/* One track by default: an implicit auto track would grow to the widest chip row and push the page sideways. */
.playground-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px 48px;
}
.playground-column {
  min-width: 0;
}
@media (width >= 56rem) {
  .playground-columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
@media (width >= 80rem) {
  .playground-ops {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* The playground carries more rows than a dossier, so its bands breathe a little wider. */
.playground .console-bar {
  padding-block: 12px;
}
.playground .console-band {
  padding: 22px 24px 24px;
}
.playground .console-rule-title {
  margin-bottom: 18px;
}
.playground .console-readout-rows > div {
  padding: 12px 16px;
}
.playground-prompt {
  color: var(--ui-text-dimmed);
}
.playground .console-snippet {
  padding: 12px 16px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.playground .console-footer {
  padding: 14px 24px;
}
.playground .console-rows li {
  padding: 12px 24px;
}
.playground-band-first {
  border-top: 0;
}
.playground-tool-about {
  margin-top: 20px;
  font-size: 14px;
}
.playground-ops {
  display: grid;
  gap: 0 40px;
  margin-top: -12px;
}
.playground-ops .console-lead {
  margin-top: 12px;
  padding: 2px 0;
}
.playground-ops .console-lead > span:not(.console-tag, .console-leader) {
  white-space: nowrap;
  color: var(--ui-text-muted);
}
.playground-ops .console-lead[aria-pressed="true"] > span:not(.console-tag, .console-leader),
.playground-ops .console-lead:hover > span:not(.console-tag, .console-leader) {
  color: var(--ui-text-highlighted);
}
.playground-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.playground-note {
  margin: 16px 0 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--ui-text-muted);
}
.playground-call {
  overflow-wrap: anywhere;
}
.playground-none {
  color: var(--ui-text-dimmed);
}
.playground-valid {
  color: var(--console-accent);
}
.playground-invalid {
  color: var(--chains-del);
}
.playground-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.playground-inline {
  color: var(--console-accent);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.playground-inline:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 2px;
}
.playground-code {
  min-width: 0;
  overflow: hidden;
  font: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.playground-code.playground-none {
  color: var(--ui-text-dimmed);
}
.playground-leads {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 0 28px;
  margin: 0;
}
.playground-leads > .console-lead {
  margin: 0 0 8px;
  flex-wrap: nowrap;
  min-width: 0;
}
/* The census: a counter per family, the count tabular, a 2 px share bar. */
.playground-census {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: 12px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.playground-census > li {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.playground-census-label {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ui-text-dimmed);
}
.playground-census-count {
  font-family: var(--font-mono);
  font-size: 18px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-dimmed);
}
.playground-census-count > span {
  font-size: 11px;
}
.playground-census-bar {
  display: block;
  height: 2px;
  background: var(--console-line);
}
.playground-census-bar > span {
  display: block;
  height: 100%;
  background: var(--console-accent);
  transform-origin: left;
}
.playground-census > li[data-hit] .playground-census-label {
  color: var(--ui-text-muted);
}
.playground-census > li[data-hit] .playground-census-count {
  color: var(--console-accent);
}
/* One row per chain: the key with its glyph, the symbol, the family, a leader to the name. */
.playground-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 4px 16px;
}
.playground-list-key {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text-highlighted);
}
.playground-list-key > :first-child {
  width: 14px;
  height: 14px;
  color: var(--ui-text-muted);
}
.playground-list-key:hover {
  color: var(--console-accent);
}
.playground-list-symbol {
  color: var(--ui-text-muted);
}
.playground-list-family,
.playground-list-name {
  display: none;
}
.playground-list-family {
  color: var(--ui-text-dimmed);
}
.playground-list-name {
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-muted);
}
@media (width >= 40rem) {
  .playground-list li {
    grid-template-columns: 10rem 5rem 6rem minmax(0, 1fr);
  }
  .playground-list-family {
    display: block;
  }
  .playground-list-name {
    display: flex;
  }
}
@media (width < 640px) {
  .playground-leads .console-leader {
    display: none;
  }
}
@media (width < 400px) {
  .playground .console-band,
  .playground .console-footer,
  .playground .console-rows li {
    padding-inline: 14px;
  }
}
</style>
