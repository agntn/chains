<script setup lang="ts">
import { CHAINS, chainEntry, familyLabel } from "../../utils/chains";
import { hostPath, shorten } from "../../utils/format";
import { lookupText } from "../../utils/tools";

const props = defineProps<{ chain: string }>();

const entry = computed(() => chainEntry(props.chain));
const position = computed(() => CHAINS.findIndex((row) => row.key === props.chain) + 1);

/** The optional fields in the order `chains_lookup` prints them; the gauge has one tick per field. */
const fields = computed(() => {
  const chain = entry.value?.chain;
  if (!chain) return [];
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
const set = computed(() => fields.value.filter((field) => field.set).length);

const checks = computed(() => {
  const chain = entry.value?.chain;
  if (!chain) return "none";
  const parts = [chain.validatesAddress && "address", chain.validatesTxid && "txid"].filter(Boolean);
  return parts.length === 0 ? "none" : parts.join(" · ");
});

/** The network fields, `none` where the chain has nothing to say rather than a blank. */
const record = computed(() => {
  const chain = entry.value?.chain;
  if (!chain) return [];
  return [
    { tag: "CAIP-2", value: chain.caip2 ?? "none", full: chain.caip2 },
    { tag: "Magic", value: chain.magic ?? "none", full: chain.magic },
    { tag: "PoW", value: chain.pow ?? "none", full: chain.pow },
    { tag: "RPC", value: chain.rpcDefault ? hostPath(chain.rpcDefault) : "none", full: chain.rpcDefault },
  ];
});

const text = computed(() => (entry.value ? lookupText(entry.value.chain) : ""));
const title = computed(() => `chains_lookup("${props.chain}")`);
</script>

<template>
  <section v-if="entry" class="tool-console console-wide not-prose my-6" aria-label="Chain record">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">ID</span>{{ entry.key
        }}<span class="console-file"
          >{{ String(position).padStart(2, "0") }} / {{ CHAINS.length }}</span
        ></span
      >
      <span class="console-meta">{{ entry.chain.type }} · {{ entry.chain.symbol }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true"><span class="console-cursor" /></div>

    <div class="console-band console-subject-band">
      <div class="console-scan" aria-hidden="true" />
      <div class="console-identity-block">
        <ConsoleReticle :key="entry.key" :icon="entry.icon" />
        <div class="console-name">
          <span class="console-label">Chain / {{ familyLabel(entry.chain.type) }}</span>
          <h3>{{ entry.chain.name }}</h3>
          <p class="chain-spellings">
            <span class="chain-spelling">"{{ entry.key }}"</span>
            <span v-if="entry.alias !== entry.key" class="chain-spelling">"{{ entry.alias }}"</span>
            <span class="chain-spelling">"{{ entry.chain.name }}"</span>
          </p>
        </div>
      </div>

      <div class="console-readout">
        <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <circle cx="3" cy="12" r="2.5" />
          <path d="M5.5 12H14L22 20H32" />
        </svg>
        <dl class="console-readout-rows">
          <div>
            <dt>Symbol</dt>
            <dd>{{ entry.chain.symbol }} · {{ entry.chain.decimals ?? "unknown" }} decimals</dd>
          </div>
          <div>
            <dt>Coin type</dt>
            <dd :class="{ 'chain-none': entry.chain.bip44 === undefined }">
              {{ entry.chain.bip44 ?? "none" }}
            </dd>
          </div>
          <div>
            <dt>{{ entry.chain.chainId ? "Chain ID" : "CAIP-2" }}</dt>
            <dd :class="{ 'chain-none': !entry.chain.chainId && !entry.chain.caip2 }">
              <UTooltip v-if="entry.chain.caip2" :text="entry.chain.caip2">
                <span class="chain-line" tabindex="0">{{
                  entry.chain.chainId ?? shorten(entry.chain.caip2, 10, 4)
                }}</span>
              </UTooltip>
              <template v-else>none</template>
            </dd>
          </div>
          <div>
            <dt>Checks</dt>
            <dd class="console-accent">{{ checks }}</dd>
          </div>
        </dl>
        <div class="console-gauge" :aria-label="`${set} of ${fields.length} optional fields set`">
          <span class="console-ticks" aria-hidden="true">
            <span
              v-for="(field, index) in fields"
              :key="field.label"
              :class="field.set ? 'console-tick-open' : 'console-tick-closed'"
              :style="{ animationDelay: `${index * 12}ms` }"
            />
          </span>
          <span class="console-gauge-read">fields set {{ set }} / {{ fields.length }}</span>
        </div>
      </div>
    </div>

    <div class="console-band">
      <p class="console-label console-rule-title">
        <span>Network <span aria-hidden="true">[ as the class declares it ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <dl class="chain-leads">
        <dd v-for="row in record" :key="row.tag" class="console-lead">
          <span class="console-tag">{{ row.tag }}</span>
          <UTooltip v-if="row.full" :text="row.full">
            <code class="chain-code" tabindex="0">{{ row.value }}</code>
          </UTooltip>
          <code v-else class="chain-code chain-none">none</code>
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Explorer</span>
          <a :href="entry.chain.explorer" target="_blank" rel="noopener" class="chain-code">{{
            hostPath(entry.chain.explorer)
          }}</a>
          <span class="console-leader" aria-hidden="true" />
        </dd>
      </dl>
    </div>

    <div class="console-band">
      <p class="console-label console-rule-title">
        <span>Access <span aria-hidden="true">[ library · CLI · playground ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <dl class="chain-leads">
        <dd class="console-lead">
          <span class="console-tag">Create</span>
          <code class="chain-code"
            ><span class="tok-fn">create</span>(<span class="tok-str">"{{ entry.key }}"</span>)</code
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Resolve</span>
          <code class="chain-code"
            ><span class="tok-fn">getChain</span>(<span class="tok-str">"{{ entry.alias }}"</span>)</code
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">CLI</span>
          <code class="chain-code"><span class="tok-fn">chains</span> info {{ entry.alias }}</code>
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Try</span>
          <NuxtLink
            :to="`/playground?op=validate&chain=${encodeURIComponent(entry.alias)}&address=${encodeURIComponent(entry.sample)}`"
            >playground<span class="chain-dim"> with a sample address</span></NuxtLink
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
      </dl>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <ul class="console-links">
        <li>
          <NuxtLink to="/chains"><span aria-hidden="true">→ </span>All chains</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/guide/identify"><span aria-hidden="true">→ </span>Identify</NuxtLink>
        </li>
      </ul>
      <span class="console-meta">in your browser / no network</span>
    </footer>
  </section>
</template>

<style scoped>
.chain-spellings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0;
}
.chain-spelling {
  padding: 1px 7px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ui-text-highlighted);
  box-shadow: inset 0 0 0 1px var(--console-line);
}
.chain-none {
  color: var(--ui-text-dimmed);
}
/* Values stay on one line for every chain; the whole value is in the tooltip. */
.chain-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
section :deep(.console-readout-rows > div) {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
.chain-code {
  min-width: 0;
  overflow: hidden;
  font: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.chain-code.chain-none {
  color: var(--ui-text-dimmed);
}
/* Values stay on one line for every chain; the whole value is in the tooltip. */
.chain-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
section :deep(.console-readout-rows > div) {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
a.chain-code:hover {
  color: var(--console-accent);
}
.chain-dim {
  color: var(--ui-text-dimmed);
}
.console-lead > a:hover .chain-dim {
  color: inherit;
}
.chain-leads {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 0 28px;
  margin: 0;
}
.chain-leads > .console-lead {
  margin: 0 0 8px;
  flex-wrap: nowrap;
  min-width: 0;
}
@media (width < 640px) {
  .chain-leads .console-leader {
    display: none;
  }
}
</style>
