<script setup lang="ts">
import { chainEntry, familyLabel } from "../../utils/chains";
import { hostPath } from "../../utils/format";

const props = defineProps<{ chain: string }>();

const entry = computed(() => chainEntry(props.chain));

const facts = computed(() => {
  const current = entry.value;
  if (!current) {
    return [];
  }
  const chain = current.chain;
  return [
    { label: "create", value: `create("${chain.key}")`, mono: true },
    { label: "family", value: `${familyLabel(chain.type)} · ${chain.type}`, mono: false },
    { label: "symbol", value: `${chain.symbol} · ${chain.decimals ?? "unknown"} decimals`, mono: true },
    { label: "bip44", value: chain.bip44 === undefined ? "none" : String(chain.bip44), mono: true },
    {
      label: chain.chainId ? "chainId · caip2" : "caip2",
      value: chain.chainId ? `${chain.chainId} · ${chain.caip2}` : (chain.caip2 ?? "none"),
      mono: true,
    },
    { label: "explorer", value: hostPath(chain.explorer), mono: true },
  ];
});
</script>

<template>
  <dl
    v-if="facts.length > 0"
    class="chains-frame not-prose my-6 grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3"
  >
    <div
      v-for="(fact, index) in facts"
      :key="fact.label"
      class="border-muted px-4 py-3.5"
      :class="{
        'border-t': index >= 2,
        'sm:border-t-0': index < 3,
        'border-l': index % 2 === 1,
        'sm:border-l': index % 3 !== 0,
        'sm:border-l-0': index % 3 === 0,
      }"
    >
      <dt class="font-mono text-[10px] tracking-[0.12em] text-dimmed uppercase">
        {{ fact.label }}
      </dt>
      <dd
        class="mt-1 text-sm text-highlighted"
        :class="{ 'font-mono text-[13px] break-words': fact.mono }"
      >
        {{ fact.value }}
      </dd>
    </div>
  </dl>
</template>
