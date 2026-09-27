<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { CHAINS, FAMILIES } from "../../utils/chains";
import { shorten } from "../../utils/format";
import { identifyText } from "../../utils/tools";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

/** Every family with how many of its chains accept the sample, in the library's family order. */
const census = computed(() =>
  FAMILIES.map((family) => {
    const members = CHAINS.filter((entry) => entry.chain.type === family.key);
    const hits = members.filter((entry) => props.sample.matches.includes(entry.key)).length;
    return { ...family, total: members.length, hits };
  }),
);

const checked = computed(() => CHAINS.length - props.sample.unchecked.length);
const text = computed(() => identifyText(props.sample.address));
const title = computed(() => `chains_identify_address("${props.sample.address}")`);
</script>

<template>
  <section
    class="tool-console landing-identify"
    aria-label="One address grouped by family"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">Call</span>chains_identify_address(<UTooltip
          :text="sample.address"
          ><span class="tok-str" tabindex="0">"{{ shorten(sample.address, 5, 4) }}"</span></UTooltip
        >)</span
      >
      <span class="console-meta">{{ sample.matches.length }} of {{ checked }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.address" class="console-cursor" />
    </div>

    <div class="identify-body">
      <p class="console-label console-rule-title">
        <span>Families <span aria-hidden="true">[ matches per family ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <ul :key="sample.address" class="identify-census">
        <li v-for="family in census" :key="family.key" :data-hit="family.hits > 0 || undefined">
          <span class="identify-label">{{ family.label }}</span>
          <span class="identify-count"
            >{{ family.hits }}<span> / {{ family.total }}</span></span
          >
          <span class="identify-bar" aria-hidden="true"
            ><span :style="{ transform: `scaleX(${family.hits / family.total})` }"
          /></span>
        </li>
      </ul>
      <p class="identify-note">
        <template v-if="sample.matches.length > 1"
          >{{ sample.matches.length }} chains read this address as theirs. A format match narrows
          the family, it doesn't prove the address is used on any of them.</template
        >
        <template v-else
          >One chain in the registry takes this format, and it's the one the address came
          from.</template
        >
      </p>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <span>MCP · Pi · OMP</span>
      <span class="console-meta">same partition as identify()</span>
    </footer>
  </section>
</template>

<style scoped>
.identify-body {
  padding: 16px 20px 18px;
}
.identify-body > .console-rule-title {
  margin: 0 0 12px;
}
/* The census: a counter per family, the count tabular, a 2 px share bar that grows once per sample. */
.identify-census {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: 12px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.identify-census > li {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.identify-label {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ui-text-dimmed);
}
.identify-count {
  font-family: var(--font-mono);
  font-size: 18px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-dimmed);
}
.identify-count > span {
  font-size: 11px;
}
.identify-bar {
  display: block;
  height: 2px;
  background: var(--console-line);
}
.identify-bar > span {
  display: block;
  height: 100%;
  background: var(--console-accent);
  transform-origin: left;
  animation: identify-grow 600ms ease-out both;
}
@keyframes identify-grow {
  from {
    transform: scaleX(0);
  }
}
.identify-census > li[data-hit] .identify-label {
  color: var(--ui-text-muted);
}
.identify-census > li[data-hit] .identify-count {
  color: var(--console-accent);
}
.identify-note {
  margin: 16px 0 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
@media (width < 400px) {
  .identify-body {
    padding-inline: 14px;
  }
  .identify-body > .console-rule-title > span:first-child > span {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .identify-bar > span {
    animation: none;
  }
}
</style>
