<script setup lang="ts">
import type { AddressCheck, LandingSample } from "../../composables/useLandingChain";
import { shorten } from "../../utils/format";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

const NOTES: Record<AddressCheck["kind"], string> = {
  own: "its own chain",
  foreign: "a chain with another format",
  mistyped: "one character off",
};

const rows = computed(() =>
  props.sample.checks.map((check) => ({
    key: `${check.kind}-${check.chain.key}`,
    call: `create("${check.chain.key}").assertAddress(${check.kind === "mistyped" ? "typo" : "address"})`,
    value: check.valid ? "returned unchanged" : check.error,
    state: check.valid ? "ok" : "failed",
    note:
      check.kind === "mistyped"
        ? `${NOTES.mistyped}: ${shorten(check.address, 10, 8)}`
        : `${NOTES[check.kind]}, ${check.chain.name}`,
  })),
);

/** Where the format carries a checksum, the typo row is the one that shows it being checked. */
const rejected = computed(() => props.sample.checks.filter((check) => !check.valid).length);

const playground = computed(
  () =>
    `/playground?op=validate&chain=${encodeURIComponent(props.sample.entry.alias)}&address=${encodeURIComponent(props.sample.address)}`,
);
</script>

<template>
  <section
    class="tool-console landing-verify"
    aria-label="One address checked three ways"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">Call</span>assertAddress(<UTooltip :text="sample.address"
          ><span class="tok-str" tabindex="0">"{{ shorten(sample.address, 8, 4) }}"</span></UTooltip
        >)</span
      >
      <span class="console-meta">{{ sample.checks.length }} checks</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.address" class="console-cursor" />
    </div>

    <!-- The verdict on the crosses grid, then the calls behind it, each with what it returned. -->
    <div class="verify-subject">
      <div :key="sample.address" class="console-scan" aria-hidden="true" />
      <div class="verify-identity">
        <ConsoleReticle :key="sample.address" :icon="sample.entry.icon" />
        <div class="verify-name">
          <span class="console-label"
            >Verdict / <span class="console-label-key">{{ sample.chain.key }}</span></span
          >
          <h3>
            <span class="verify-ok">accepted</span> once,
            <span class="verify-failed">rejected</span> {{ rejected }}×
          </h3>
          <span class="verify-aliases">{{ sample.chain.type }} / {{ sample.chain.symbol }}</span>
        </div>
      </div>
      <ol :key="sample.address" class="console-readout console-animate verify-steps">
        <li v-for="(row, index) in rows" :key="row.key" :style="{ animationDelay: `${index * 45}ms` }">
          <code class="tok-fn verify-call">{{ row.call }}</code>
          <span class="verify-value" :data-state="row.state">{{ row.value }}</span>
          <p class="verify-note">{{ row.note }}</p>
        </li>
      </ol>
    </div>

    <footer class="console-footer console-footer-plain">
      <span>In your browser / no network</span>
      <NuxtLink :to="playground" class="verify-link"
        ><span aria-hidden="true">→ </span>change a character yourself</NuxtLink
      >
    </footer>
  </section>
</template>

<style scoped>
/* The subject band: crosses behind it, the verdict with the chain's glyph, the three calls in one readout under it. */
.verify-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.verify-subject > :not(.console-scan) {
  position: relative;
}
.verify-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.verify-name {
  min-width: 0;
}
.verify-name h3 {
  margin: 4px 0 6px;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--ui-text-highlighted);
}
.verify-ok {
  color: var(--console-accent);
}
.verify-failed {
  color: var(--chains-del);
}
.verify-aliases {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}
/* One row per call: the call, then the value it returned with a marker, one line on what it means under both. */
.verify-steps {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
  container-type: inline-size;
}
.verify-steps > li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 2px 16px;
  padding: 9px 12px;
}
.verify-steps > li + li {
  border-top: 1px solid var(--console-line);
}
.verify-call {
  min-width: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.verify-value {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.verify-value::before {
  content: "";
  flex: none;
  width: 7px;
  height: 7px;
  box-shadow: inset 0 0 0 1px var(--console-corner);
}
.verify-value[data-state="ok"] {
  color: var(--ui-text-highlighted);
}
.verify-value[data-state="ok"]::before {
  background: var(--console-accent);
  box-shadow: none;
}
.verify-value[data-state="failed"] {
  color: var(--chains-del);
}
.verify-value[data-state="failed"]::before {
  box-shadow: inset 0 0 0 1px var(--chains-del);
}
.verify-note {
  grid-column: 1 / -1;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ui-text-dimmed);
}
.verify-link {
  margin-left: auto;
  color: var(--ui-text-highlighted);
}
.verify-link:hover {
  color: var(--console-accent);
}
.verify-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 400px) {
  .verify-subject {
    padding-inline: 14px;
  }
  .verify-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
/* Too narrow for the longest call and value side by side: every value goes under its call, never just one. */
@container (width < 30rem) {
  .verify-steps > li {
    grid-template-columns: minmax(0, 1fr);
  }
  .verify-value {
    white-space: normal;
  }
}
</style>
