<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { lookupText } from "../../utils/tools";

const props = defineProps<{ sample: LandingSample }>();

const text = computed(() => lookupText(props.sample.chain));
</script>

<template>
  <div class="chains-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">tool</span>
        <span class="ms-2 text-highlighted">chains_lookup</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">MCP · Pi · OMP</p>
    </div>
    <div class="divide-y divide-muted">
      <div class="px-4 py-4">
        <p class="chains-eyebrow mb-3">input</p>
        <pre class="chains-tool"><code>{
  <span class="tok-key">"chain"</span>: <span class="tok-str">"<Transition name="chains-roll" mode="out-in"><span :key="sample.entry.alias" class="chains-roll-slot">{{ sample.entry.alias }}</span></Transition>"</span>
}</code></pre>
      </div>
      <div class="px-4 py-4">
        <p class="chains-eyebrow mb-3">output · content[0].text</p>
        <pre :key="sample.chain.key" class="chains-tool chains-derive"><code>{{ text }}</code></pre>
      </div>
    </div>
  </div>
</template>
