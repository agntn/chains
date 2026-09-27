<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { CHAINS, familyLabel } from "../../utils/chains";
import { shorten } from "../../utils/format";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

type State = "own" | "match" | "miss" | "unchecked";

/** One cell per registered chain, in registry order; the node carries what identify() said about it. */
const cells = computed(() =>
  CHAINS.map((entry) => {
    const state: State =
      entry.key === props.sample.chain.key
        ? "own"
        : props.sample.matches.includes(entry.key)
          ? "match"
          : props.sample.unchecked.includes(entry.key)
            ? "unchecked"
            : "miss";
    return { entry, state };
  }),
);

const WORDS: Record<State, string> = {
  own: "the sample's chain, accepts",
  match: "accepts the same format",
  miss: "rejects",
  unchecked: "no validator, unchecked",
};

const checked = computed(() => CHAINS.length - props.sample.unchecked.length);
</script>

<template>
  <section
    class="tool-console console-wide landing-registry"
    aria-label="One address against the registry"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">Call</span>identify(<UTooltip :text="sample.address"
          ><span class="tok-str" tabindex="0">"{{ shorten(sample.address, 10, 6) }}"</span></UTooltip
        >)</span
      >
      <span class="console-meta"
        >{{ sample.matches.length }} of {{ checked }} accept · {{ sample.unchecked.length }}
        unchecked</span
      >
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.address" class="console-cursor" />
    </div>

    <div class="registry-subject">
      <div :key="sample.address" class="console-scan" aria-hidden="true" />
      <ConsoleReticle :key="sample.address" :icon="sample.entry.icon" />
      <div class="registry-name">
        <span class="console-label"
          >Address / <span class="console-label-key">{{ sample.chain.key }}</span></span
        >
        <p class="registry-address">{{ sample.address }}</p>
        <p class="registry-note">
          The {{ sample.chain.name }} sample, run through every validator in the registry.
          <template v-if="sample.matches.length > 1"
            >{{ sample.matches.length }} chains take the format. That narrows it to
            {{ familyLabel(sample.chain.type) }}, it doesn't say where the address is used.</template
          >
          <template v-else>Only its own chain takes the format.</template>
        </p>
      </div>
    </div>

    <div class="registry-body">
      <p class="console-label console-rule-title">
        <span>Registry <span aria-hidden="true">[ one validator per chain ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <ul class="registry-cells">
        <li v-for="cell in cells" :key="cell.entry.key">
          <UTooltip :text="`${cell.entry.chain.name} · ${WORDS[cell.state]}`">
            <NuxtLink
              :to="cell.entry.to"
              class="registry-cell"
              :data-state="cell.state"
              :aria-label="`${cell.entry.chain.name}: ${WORDS[cell.state]}`"
            >
              <UIcon :name="cell.entry.icon" class="registry-icon" aria-hidden="true" />
              <span class="registry-key">{{ cell.entry.key }}</span>
              <span class="registry-node" aria-hidden="true" />
            </NuxtLink>
          </UTooltip>
        </li>
      </ul>
    </div>

    <footer class="console-footer console-footer-plain">
      <span class="registry-legend"
        ><span class="registry-node" data-state="match" aria-hidden="true" /> accepts
        <span class="registry-node" data-state="miss" aria-hidden="true" /> rejects</span
      >
      <div class="console-controls" aria-label="Sample addresses">
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-left"
          aria-label="Previous address"
          @click="emit('step', -1)"
        />
        <span>Address</span>
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-right"
          aria-label="Next address"
          @click="emit('step', 1)"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.registry-subject {
  position: relative;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.registry-subject > :not(.console-scan) {
  position: relative;
}
.registry-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}
/* The address on a solid ground, so the crosses never run through it; one line, cut at the end. */
.registry-address {
  justify-self: start;
  max-width: 100%;
  margin: 0;
  padding: 1px 6px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 15px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
  background: var(--ui-bg);
}
.registry-note {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.registry-body {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--console-line);
}
.registry-body > .console-rule-title {
  margin: 0 0 12px;
}
/* The manifest: a cell per chain, the state on the node and the name, never a word in every cell. */
.registry-cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.registry-cell {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) 6px;
  gap: 8px;
  align-items: center;
  padding: 6px 9px;
  box-shadow: inset 0 0 0 1px var(--console-line);
  transition: box-shadow 0.3s ease;
}
.registry-icon {
  width: 14px;
  height: 14px;
  color: var(--ui-text-dimmed);
  transition: color 0.3s ease;
}
.registry-key {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-dimmed);
  transition: color 0.3s ease;
}
.registry-node {
  display: inline-block;
  width: 6px;
  height: 6px;
  box-shadow: inset 0 0 0 1px var(--console-line);
}
.registry-cell[data-state="match"] .registry-key,
.registry-cell[data-state="own"] .registry-key {
  color: var(--ui-text-highlighted);
}
.registry-cell[data-state="match"] .registry-icon {
  color: var(--ui-text-muted);
}
.registry-cell[data-state="own"] .registry-icon {
  color: var(--console-accent);
}
.registry-node[data-state="match"],
.registry-cell[data-state="match"] .registry-node {
  box-shadow: inset 0 0 0 1px var(--console-accent);
}
.registry-cell[data-state="own"] {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--console-accent) 55%, transparent);
}
.registry-cell[data-state="own"] .registry-node {
  background: var(--console-accent);
  box-shadow: none;
}
.registry-cell:hover {
  box-shadow: inset 0 0 0 1px var(--console-accent);
}
.registry-cell:hover .registry-key {
  color: var(--console-accent);
}
.registry-cell:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 2px;
}
.registry-legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.registry-legend > .registry-node + * {
  margin-left: 0;
}
.registry-legend > .registry-node:not(:first-child) {
  margin-left: 8px;
}
@media (width < 400px) {
  .registry-subject {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
    padding-inline: 14px;
  }
  .registry-body {
    padding-inline: 14px;
  }
  .registry-body > .console-rule-title > span:first-child > span {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .registry-cell,
  .registry-icon,
  .registry-key {
    transition: none;
  }
}
</style>
