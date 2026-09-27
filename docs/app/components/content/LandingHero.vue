<script setup lang="ts">
import { version } from "../../../../package.json";
import type { LandingSample } from "../../composables/useLandingChain";
import { CHAINS, FAMILIES } from "../../utils/chains";

defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const INSTALL = "pnpm add @agntn/chains";

const evm = CHAINS.filter((entry) => entry.chain.type === "evm").length;
const utxo = CHAINS.filter((entry) => entry.chain.type === "utxo").length;
const decoding = CHAINS.filter((entry) => entry.chain.validatesAddress).length;
const txids = CHAINS.filter((entry) => entry.chain.validatesTxid).length;
/** The family bases the library exports; every other family is declared per chain. */
const shared = FAMILIES.filter((family) => ["evm", "utxo", "move"].includes(family.key)).length;

const { copied, copy } = useCopied();
</script>

<template>
  <header class="chains-hero hero-page">
    <div class="hero-zone">
      <span class="hero-cross hero-cross-tl" aria-hidden="true">+</span>
      <span class="hero-cross hero-cross-tr" aria-hidden="true">+</span>
      <span class="hero-bracket hero-bracket-l" aria-hidden="true" />
      <span class="hero-bracket hero-bracket-r" aria-hidden="true" />

      <p class="console-id">
        <span class="console-id-tag">ID</span>
        <span>@agntn/chains</span>
        <span class="console-id-sep" aria-hidden="true">/</span>
        <span>v{{ version }}</span>
      </p>

      <h1 class="hero-title">Name a chain. <span>Check an address.</span></h1>
      <p class="hero-lead">
        Blockchains as classes, one file each: chain ID, CAIP-2, coin type, explorer. The spellings
        people actually type resolve to the same class, and every chain checks its own address by
        decoding it, not by counting characters. Nothing here touches a network.
      </p>

      <dl class="hero-metrics">
        <div>
          <dt>Chains</dt>
          <dd>{{ CHAINS.length }}</dd>
          <dd class="hero-metric-sub">{{ evm }} EVM · {{ utxo }} UTXO</dd>
        </div>
        <div>
          <dt>Families</dt>
          <dd>{{ FAMILIES.length }}</dd>
          <dd class="hero-metric-sub">{{ shared }} with a shared base</dd>
        </div>
        <div>
          <dt>Decoded</dt>
          <dd class="hero-metric-accent">
            {{ decoding }} <span>of {{ CHAINS.length }}</span>
          </dd>
          <dd class="hero-metric-sub">{{ txids }} check a txid too</dd>
        </div>
      </dl>

      <div class="console-actions">
        <UButton
          to="/guide"
          color="primary"
          variant="solid"
          trailing-icon="i-lucide-arrow-right"
          label="Get started"
        />
        <UButton
          to="https://github.com/agntn/chains"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
          label="Star on GitHub"
        />
      </div>
      <div class="console-install">
        <span class="console-install-tag">Install</span>
        <code><span class="console-install-prompt">$</span> {{ INSTALL }}</code>
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'install' ? 'i-lucide-check' : 'i-lucide-copy'"
          :aria-label="copied === 'install' ? 'Copied' : 'Copy install command'"
          @click="copy('install', INSTALL)"
        />
      </div>
    </div>

    <!-- One address against the whole registry: the answer identify() gives, chain by chain. -->
    <div class="hero-instrument">
      <svg class="hero-circuit" viewBox="0 0 160 56" aria-hidden="true">
        <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
        <path :key="sample.address" class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
        <path class="hero-circuit-seg" d="M96 38V48" />
        <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
      </svg>
      <span class="hero-circuit-tag" aria-hidden="true">identify</span>
      <LandingRegistry :sample="sample" @step="emit('step', $event)" @pause="emit('pause', $event)" />
    </div>
  </header>
</template>
