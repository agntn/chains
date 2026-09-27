<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { familyLabel } from "../../utils/chains";
import { hostPath } from "../../utils/format";
import { lookupText } from "../../utils/tools";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

const text = computed(() => lookupText(props.sample.chain));
const title = computed(() => `chains_lookup("${props.sample.entry.alias}")`);

/** Five rows at most; an absent field says `none` out loud, the way the tool text does. */
const rows = computed(() => {
  const chain = props.sample.chain;
  return [
    { label: "key", value: `"${chain.key}"`, accent: true },
    { label: "symbol", value: `${chain.symbol} · ${chain.decimals ?? "unknown"} decimals` },
    { label: "caip2", value: chain.caip2 ?? "none", dim: chain.caip2 === undefined },
    { label: "bip44", value: chain.bip44 === undefined ? "none" : String(chain.bip44), dim: chain.bip44 === undefined },
    { label: "explorer", value: hostPath(chain.explorer) },
  ];
});
</script>

<template>
  <section
    class="tool-console landing-call"
    aria-label="One tool call"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">Call</span>chains_lookup(<Transition
          name="chains-roll"
          mode="out-in"
          ><span :key="sample.entry.alias" class="chains-roll-slot tok-str"
            >"{{ sample.entry.alias }}"</span
          ></Transition
        >)</span
      >
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.chain.key" class="console-cursor" />
    </div>

    <!-- The chain the spelling resolved to on the crosses grid, what the tool text says about it in the readout. -->
    <div class="call-subject">
      <div :key="sample.chain.key" class="console-scan" aria-hidden="true" />
      <div class="call-identity">
        <ConsoleReticle :key="sample.chain.key" :icon="sample.entry.icon" />
        <div class="call-name">
          <span class="console-label">Tool / {{ familyLabel(sample.chain.type) }}</span>
          <h3>{{ sample.chain.name }}</h3>
          <p class="call-note">
            The spelling a model typed, answered with every field and a plain none for what the
            chain doesn't have.
          </p>
        </div>
      </div>
      <div class="console-readout">
        <dl :key="sample.chain.key" class="console-readout-rows console-animate">
          <div v-for="(row, index) in rows" :key="row.label" :style="{ animationDelay: `${index * 45}ms` }">
            <dt>{{ row.label }}</dt>
            <dd :class="{ 'console-accent': row.accent, 'call-dim': row.dim }">
              <span class="call-line">{{ row.value }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <span aria-label="Supported hosts: MCP, Pi and OMP">MCP · Pi · OMP</span>
      <span class="console-meta">chains mcp · stdio</span>
    </footer>
  </section>
</template>

<style scoped>
.call-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.call-subject > :not(.console-scan) {
  position: relative;
}
.call-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.call-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.call-name h3 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ui-text-highlighted);
}
.call-note {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.landing-call .console-readout-rows > div {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
.landing-call .console-readout-rows dt {
  text-transform: none;
  letter-spacing: 0.02em;
}
.call-dim {
  color: var(--ui-text-dimmed);
}
.call-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (width < 400px) {
  .call-subject {
    padding-inline: 14px;
  }
  .call-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
