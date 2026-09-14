<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { CHAINS, FAMILIES } from "../../utils/chains";
import { shorten } from "../../utils/format";

const props = defineProps<{ sample: LandingSample }>();

/** Every family with how many of its chains accept the sample. */
const cells = computed(() =>
  FAMILIES.map((family) => {
    const members = CHAINS.filter((entry) => entry.chain.type === family.key);
    const hits = members.filter((entry) => props.sample.matches.includes(entry.key));
    return { ...family, total: members.length, hits: hits.length, keys: hits.map((entry) => entry.key) };
  }),
);

const matched = computed(() => cells.value.filter((cell) => cell.hits > 0));
</script>

<template>
  <div class="chains-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="min-w-0 truncate font-mono text-xs text-muted">
        <span class="text-dimmed">identify</span>
        <span class="ms-2 text-highlighted" :title="sample.address">("{{ shorten(sample.address, 14, 10) }}")</span>
      </p>
      <p class="shrink-0 font-mono text-[11px] text-dimmed">{{ CHAINS.length - sample.unchecked.length }} validators</p>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-4">
      <div
        v-for="(cell, i) in cells"
        :key="cell.key"
        class="border-muted px-4 py-3 transition-colors duration-500"
        :class="{
          'border-t': i >= 3,
          'sm:border-t-0': i < 4,
          'border-l': i % 3 !== 0,
          'sm:border-l': i % 4 !== 0,
          'sm:border-l-0': i % 4 === 0,
          'chains-cell-active': cell.hits > 0,
        }"
      >
        <p class="text-sm font-medium" :class="cell.hits > 0 ? 'text-highlighted' : 'text-dimmed'">
          {{ cell.label }}
        </p>
        <p class="mt-0.5 font-mono text-[11px]" :class="cell.hits > 0 ? 'text-primary' : 'text-dimmed'">
          {{ cell.hits }} of {{ cell.total }}
        </p>
      </div>
      <div class="border-t border-muted px-4 py-3 sm:border-l">
        <p class="text-sm font-medium text-dimmed">unchecked</p>
        <p class="mt-0.5 font-mono text-[11px] text-dimmed">{{ sample.unchecked.length }} chains</p>
      </div>
    </div>
    <div :key="sample.address" class="chains-derive border-t border-muted px-4 py-3.5 text-sm leading-6 text-muted">
      <span class="text-highlighted">{{ sample.matches.length }} of {{ CHAINS.length - sample.unchecked.length }}</span>
      checked chains accept it<template v-if="matched.length > 0"
        >: <span class="font-mono text-[12px] text-highlighted">{{ matched.map((cell) => cell.keys.join(", ")).join(", ") }}</span></template
      >. A format match narrows the family, it doesn't prove the address is used on any of them.
    </div>
  </div>
</template>
