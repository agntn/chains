<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { shorten } from "../../utils/format";

defineProps<{ sample: LandingSample }>();

const CAPTIONS = {
  own: "its own chain",
  foreign: "a chain with another format",
  mistyped: "one character off",
} as const;
</script>

<template>
  <div class="chains-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">chain</span>
        <span class="ms-2 text-highlighted">.assertAddress(address)</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">live · in your browser</p>
    </div>
    <ol class="divide-y divide-muted">
      <li v-for="row in sample.checks" :key="`${row.chain.key}-${row.kind}`" class="px-4 py-3.5">
        <p class="chains-eyebrow mb-2">{{ CAPTIONS[row.kind] }}</p>
        <pre class="chains-tool"><code><span class="tok-fn">create</span>(<span class="tok-str">"{{ row.chain.key }}"</span>).<span class="tok-fn">assertAddress</span>(<span class="tok-str" :title="row.address">"{{ shorten(row.address, 16, 12) }}"</span>)</code></pre>
        <p
          :key="`${row.chain.key}-${row.address}`"
          class="chains-derive mt-2 flex items-start gap-2 font-mono text-[12px] leading-5"
          :class="row.valid ? 'text-primary' : 'text-muted'"
        >
          <UIcon
            :name="row.valid ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
            class="mt-0.5 size-4 shrink-0"
            :class="row.valid ? 'text-primary' : 'chains-text-del'"
          />
          <span class="min-w-0 break-all">
            <template v-if="row.valid">returned unchanged</template>
            <template v-else>{{ row.error }} { chain: "{{ row.chain.key }}" }</template>
          </span>
        </p>
      </li>
    </ol>
  </div>
</template>
