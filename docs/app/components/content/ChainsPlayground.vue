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
import { shellArg } from "../../utils/format";
import {
  identifyText,
  listText,
  lookupText,
  validateText,
  validateTxidText,
} from "../../utils/tools";

type Operation = "lookup" | "validate" | "txid" | "identify" | "list";

const OPERATIONS: ReadonlyArray<{ key: Operation; label: string; tool: string; command: string }> =
  [
    { key: "lookup", label: "Lookup", tool: "chains_lookup", command: "info" },
    { key: "validate", label: "Validate", tool: "chains_validate_address", command: "validate" },
    { key: "txid", label: "Txid", tool: "chains_validate_txid", command: "validate --txid" },
    { key: "identify", label: "Identify", tool: "chains_identify_address", command: "identify" },
    { key: "list", label: "List", tool: "chains_list", command: "list" },
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
}
type Answer = LookupAnswer | ValidateAnswer | TxidAnswer | IdentifyAnswer | ListAnswer | ErrorAnswer;

function failure(error: unknown): ErrorAnswer {
  return {
    kind: "error",
    name: error instanceof ChainsError ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
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
      return { kind: "validate", chain, valid: false, text: validateText(chain, trimmed, false) };
    }
    if (error instanceof AddressValidationUnsupportedError) return failure(error);
    throw error;
  }
});

const current = computed(() => OPERATIONS.find((row) => row.key === operation.value)!);

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

/** The same call as a tool invocation, the JSON an MCP client sends. */
const toolCall = computed(() => {
  const args: Record<string, string> =
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
              : {};
  return JSON.stringify({ name: current.value.tool, arguments: args }, null, 2);
});

/** The lookup card: every field on the class, absent ones shown as such. */
const lookupRows = computed(() => {
  if (answer.value.kind !== "lookup") return [];
  const chain = answer.value.chain;
  return [
    { label: "key", value: chain.key },
    { label: "name", value: chain.name },
    { label: "symbol", value: chain.symbol },
    { label: "decimals", value: chain.decimals === undefined ? "unknown" : String(chain.decimals) },
    { label: "type", value: `${chain.type} · ${familyLabel(chain.type)}` },
    { label: "bip44", value: chain.bip44 === undefined ? "none" : String(chain.bip44) },
    { label: "chainId", value: chain.chainId ?? "none" },
    { label: "caip2", value: chain.caip2 ?? "none" },
    { label: "explorer", value: chain.explorer, href: chain.explorer },
    { label: "rpc", value: chain.rpcDefault ?? "none", href: chain.rpcDefault },
    { label: "validates", value: chain.validatesAddress ? "yes" : "no validator" },
    { label: "validates txid", value: chain.validatesTxid ? "yes" : "no validator" },
  ];
});

/** Families with their hit counts, for the identify grid. */
const identifyCells = computed(() => {
  if (answer.value.kind !== "identify") return [];
  const matches = answer.value.matches;
  return FAMILIES.map((row) => {
    const members = CHAINS.filter((entry) => entry.chain.type === row.key);
    const hits = members.filter((entry) => matches.some((match) => match.key === entry.key));
    return { ...row, total: members.length, hits: hits.length };
  });
});

function loadSample(key: string) {
  const entry = chainEntry(key);
  if (!entry) return;
  chainInput.value = entry.alias;
  address.value = entry.sample;
  if (operation.value === "list") operation.value = "validate";
}

const copiedKey = ref<string | null>(null);
async function copy(key: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    return;
  }
  copiedKey.value = key;
  setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = null;
    }
  }, 1200);
}

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
  <div class="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <form class="chains-frame flex flex-col gap-5 rounded-xl p-5" @submit.prevent>
      <div class="chains-seg" role="group" aria-label="Operation">
        <button
          v-for="row in OPERATIONS"
          :key="row.key"
          type="button"
          :aria-pressed="operation === row.key"
          @click="operation = row.key"
        >
          {{ row.label }}
        </button>
      </div>

      <label v-if="needsChain" class="flex flex-col gap-1.5">
        <span class="chains-eyebrow">chain<span class="normal-case tracking-normal text-dimmed"> · key, name, symbol or alias</span></span>
        <input
          v-model="chainInput"
          class="chains-field"
          type="text"
          placeholder="matic, btc, Arbitrum One"
          spellcheck="false"
          autocomplete="off"
          list="chains-keys"
        />
        <datalist id="chains-keys">
          <option v-for="entry in CHAINS" :key="entry.key" :value="entry.key">{{ entry.chain.name }}</option>
        </datalist>
      </label>

      <label v-if="needsAddress" class="flex flex-col gap-1.5">
        <span class="chains-eyebrow">address</span>
        <textarea v-model="address" class="chains-textarea" spellcheck="false" />
      </label>

      <label v-if="needsTxid" class="flex flex-col gap-1.5">
        <span class="chains-eyebrow">txid</span>
        <textarea v-model="txid" class="chains-textarea" spellcheck="false" />
      </label>

      <label v-if="operation === 'list'" class="flex flex-col gap-1.5">
        <span class="chains-eyebrow">family</span>
        <select v-model="family" class="chains-field">
          <option value="">every family</option>
          <option v-for="row in FAMILIES" :key="row.key" :value="row.key">
            {{ row.label }} · {{ row.key }}
          </option>
        </select>
      </label>

      <div>
        <p class="chains-eyebrow mb-2">samples</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="entry in CHAINS"
            :key="entry.key"
            type="button"
            class="chains-chip"
            :class="{ 'chains-chip-ok': needsChain && answer.kind !== 'error' && 'chain' in answer && answer.chain.key === entry.key }"
            :title="entry.chain.name"
            @click="loadSample(entry.key)"
          >
            {{ entry.key }}
          </button>
        </div>
      </div>
    </form>

    <div class="flex min-w-0 flex-col gap-4">
      <div class="chains-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="min-w-0 truncate font-mono text-xs text-muted">
            <span class="text-dimmed">{{ operation === "list" ? "chains()" : operation === "identify" ? "identify" : `getChain("${chainInput}")` }}</span>
            <span class="ms-2 text-highlighted">{{ operation === "lookup" ? "" : operation === "validate" ? ".assertAddress" : operation === "txid" ? ".assertTxid" : operation === "identify" ? "(address)" : ".map(create)" }}</span>
          </p>
          <span
            v-if="answer.kind === 'validate' || answer.kind === 'txid'"
            class="chains-state shrink-0"
            :class="answer.valid ? 'chains-state-ok' : 'chains-state-failed'"
          >
            {{ answer.valid ? "accepted" : "rejected" }}
          </span>
          <span v-else-if="answer.kind === 'error'" class="chains-state chains-state-failed shrink-0">
            {{ answer.name }}
          </span>
        </div>

        <template v-if="answer.kind === 'lookup'">
          <dl class="chains-kv">
            <template v-for="row in lookupRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd class="font-mono text-[13px]">
                <a v-if="row.href" :href="row.href" target="_blank" rel="noopener" class="hover:underline">{{ row.value }}</a>
                <template v-else>{{ row.value }}</template>
              </dd>
            </template>
          </dl>
        </template>

        <div v-else-if="answer.kind === 'validate'" class="px-4 py-4">
          <p class="text-sm leading-6" :class="answer.valid ? 'text-highlighted' : 'text-muted'">
            <template v-if="answer.valid">
              Fits the {{ answer.chain.name }} format. Not proof it exists on chain, and where the
              format has a checksum the chain's page says whether it was verified.
            </template>
            <template v-else>
              Doesn't fit the {{ answer.chain.name }} format. Try
              <button type="button" class="font-medium text-primary hover:underline" @click="operation = 'identify'">identify</button>
              to see which chains, if any, accept it.
            </template>
          </p>
          <pre class="chains-output mt-3 rounded-lg bg-muted text-sm">{{ answer.text }}</pre>
        </div>

        <div v-else-if="answer.kind === 'txid'" class="px-4 py-4">
          <p class="text-sm leading-6" :class="answer.valid ? 'text-highlighted' : 'text-muted'">
            <template v-if="answer.valid">
              Fits the {{ answer.chain.name }} transaction id format. Whether it was ever mined is a
              question for a node, not for this page.
            </template>
            <template v-else>
              Doesn't fit the {{ answer.chain.name }} transaction id format. The prefix and the
              length are where a paste usually goes wrong.
            </template>
          </p>
          <pre class="chains-output mt-3 rounded-lg bg-muted text-sm">{{ answer.text }}</pre>
        </div>

        <template v-else-if="answer.kind === 'identify'">
          <div class="grid grid-cols-3 sm:grid-cols-4">
            <div
              v-for="(cell, i) in identifyCells"
              :key="cell.key"
              class="border-muted px-4 py-3"
              :class="{
                'border-t': i >= 3,
                'sm:border-t-0': i < 4,
                'border-l': i % 3 !== 0,
                'sm:border-l': i % 4 !== 0,
                'sm:border-l-0': i % 4 === 0,
                'chains-cell-active': cell.hits > 0,
              }"
            >
              <p class="text-sm font-medium" :class="cell.hits > 0 ? 'text-highlighted' : 'text-dimmed'">{{ cell.label }}</p>
              <p class="mt-0.5 font-mono text-[11px]" :class="cell.hits > 0 ? 'text-primary' : 'text-dimmed'">{{ cell.hits }} of {{ cell.total }}</p>
            </div>
            <div class="border-t border-muted px-4 py-3 sm:border-l">
              <p class="text-sm font-medium text-dimmed">unchecked</p>
              <p class="mt-0.5 font-mono text-[11px] text-dimmed">{{ answer.unchecked.length }} chains</p>
            </div>
          </div>
          <div class="border-t border-muted px-4 py-3.5">
            <div v-if="answer.matches.length > 0" class="mb-3 flex flex-wrap gap-1.5">
              <NuxtLink v-for="match in answer.matches" :key="match.key" :to="`/chains/${match.key}`" class="chains-chip chains-chip-ok">
                {{ match.key }}
              </NuxtLink>
            </div>
            <pre class="chains-output rounded-lg bg-muted text-sm">{{ answer.text }}</pre>
          </div>
        </template>

        <template v-else-if="answer.kind === 'list'">
          <ol class="divide-y divide-muted">
            <li v-for="row in answer.rows" :key="row.key" class="grid grid-cols-[6.5rem_4rem_1fr] gap-3 px-4 py-2.5 font-mono text-[12px] sm:grid-cols-[6.5rem_4rem_5rem_1fr]">
              <NuxtLink :to="`/chains/${row.key}`" class="text-highlighted hover:underline">{{ row.key }}</NuxtLink>
              <span class="text-muted">{{ row.symbol }}</span>
              <span class="hidden text-dimmed sm:block">{{ row.type }}</span>
              <span class="truncate text-muted">{{ row.name }}</span>
            </li>
          </ol>
          <p class="border-t border-muted px-4 py-3 font-mono text-[11px] text-dimmed">
            {{ answer.rows.length }} chains · every key and name resolves in lookup
          </p>
        </template>

        <div v-else class="px-4 py-5">
          <p class="text-sm leading-6 text-muted">{{ answer.message }}</p>
          <p class="mt-2 font-mono text-[11px] text-dimmed">
            Known keys: {{ CHAINS.map((entry) => entry.key).join(", ") }}
          </p>
        </div>
      </div>

      <div class="chains-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="font-mono text-xs text-muted">
            <span class="text-dimmed">$</span>
            <span class="ms-2 text-highlighted">CLI</span>
          </p>
          <button
            type="button"
            class="chains-copy"
            :data-copied="copiedKey === 'cli'"
            @click="copy('cli', cliLine)"
          >
            <UIcon :name="copiedKey === 'cli' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
            {{ copiedKey === "cli" ? "copied" : "copy" }}
          </button>
        </div>
        <pre class="chains-rotating"><code>{{ cliLine }}</code></pre>
      </div>

      <div class="chains-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="font-mono text-xs text-muted">
            <span class="text-dimmed">tool</span>
            <span class="ms-2 text-highlighted">{{ current.tool }}</span>
          </p>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="chains-copy"
              :data-copied="copiedKey === 'link'"
              @click="copy('link', shareLink)"
            >
              <UIcon :name="copiedKey === 'link' ? 'i-lucide-check' : 'i-lucide-arrow-up-right'" class="size-3.5" />
              {{ copiedKey === "link" ? "copied" : "permalink" }}
            </button>
            <button
              type="button"
              class="chains-copy"
              :data-copied="copiedKey === 'tool'"
              @click="copy('tool', toolCall)"
            >
              <UIcon :name="copiedKey === 'tool' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
              {{ copiedKey === "tool" ? "copied" : "copy" }}
            </button>
          </div>
        </div>
        <pre class="chains-rotating"><code>{{ toolCall }}</code></pre>
      </div>
    </div>
  </div>
</template>
