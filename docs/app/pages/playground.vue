<script setup lang="ts">
import { version } from "@agntn/chains";
import { CHAINS, FAMILIES, TOOLS } from "../utils/chains";

definePageMeta({ layout: "default" });

const title = "Playground";
const description =
  "Resolve a chain by any spelling, check an address against its format, or run one address through every validator. In the browser, same library the CLI and the agent tools run.";
/** The OG pipeline drops commas from its props, so the card gets a version written without them. */
const cardDescription =
  "Resolve a chain by any spelling. Check an address against its format. Run one address through every validator. In the browser with the library itself.";

useSeo({
  title,
  description,
  type: "article",
  breadcrumbs: [{ title: "Playground", path: "/playground" }],
});

defineOgImage(
  "Docs",
  { headline: "Playground", title, description: cardDescription },
  { alt: "The @agntn/chains playground: lookup, validate, identify and list a chain in the browser" },
);
</script>

<template>
  <div class="chains-landing not-prose">
    <header class="chains-hero hero-page">
      <div class="hero-zone">
        <span class="hero-cross hero-cross-tl" aria-hidden="true">+</span>
        <span class="hero-cross hero-cross-tr" aria-hidden="true">+</span>
        <span class="hero-bracket hero-bracket-l" aria-hidden="true" />
        <span class="hero-bracket hero-bracket-r" aria-hidden="true" />

        <p class="console-id">
          <span class="console-id-tag">ID</span>
          <span>playground</span>
          <span class="console-id-sep" aria-hidden="true">/</span>
          <span>@agntn/chains v{{ version }}</span>
        </p>

        <h1 class="hero-title">
          Any chain, any address. <br class="playground-break" />
          <span>Right here, in the page.</span>
        </h1>
        <p class="hero-lead">
          The page imports @agntn/chains and runs it in your browser. Nothing you paste leaves the
          tab, and every state is a link you can send to someone.
        </p>

        <dl class="hero-metrics">
          <div>
            <dt>Tools</dt>
            <dd>{{ TOOLS.length }}</dd>
            <dd class="hero-metric-sub">same as MCP, Pi and OMP</dd>
          </div>
          <div>
            <dt>Chains</dt>
            <dd>{{ CHAINS.length }}</dd>
            <dd class="hero-metric-sub">{{ FAMILIES.length }} families</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd class="hero-metric-accent">0 <span>calls</span></dd>
            <dd class="hero-metric-sub">the library never asks</dd>
          </div>
        </dl>

        <p class="playground-note">
          <span class="console-tag">Note</span>
          <span
            >A valid result means the address fits the chain's format. It doesn't mean the address
            exists, has a balance, or belongs to who you think.</span
          >
        </p>
      </div>

      <div class="hero-instrument hero-instrument-keep">
        <svg class="hero-circuit" viewBox="0 0 160 56" aria-hidden="true">
          <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
          <path class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
          <path class="hero-circuit-seg" d="M96 38V48" />
          <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
        </svg>
        <span class="hero-circuit-tag" aria-hidden="true">call</span>
        <ChainsPlayground />
      </div>
    </header>
  </div>
</template>

<style scoped>
/* One sentence per line on wide screens; narrow, the title wraps where it fits. */
@media (width < 64rem) {
  .playground-break {
    display: none;
  }
}
/* The note reads as a line of the zone, like the share bar's legend on the landing: no box of its own. */
.playground-note {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 12px;
  max-width: 44rem;
  margin: 28px auto 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
  color: var(--ui-text-muted);
}
.playground-note > .console-tag {
  flex: none;
  margin: 0;
  color: var(--console-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--console-accent) 55%, transparent);
}
</style>
