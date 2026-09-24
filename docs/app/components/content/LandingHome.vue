<script setup lang="ts">
import { CHAINS, FAMILIES, TOOLS } from "../../utils/chains";

const { samples, tick, paused, current, step } = useLandingChain();

const stats = [
  { value: String(CHAINS.length), label: "chains" },
  { value: String(FAMILIES.length), label: "families" },
  { value: String(TOOLS.length), label: "agent tools" },
  { value: "0", label: "network calls" },
] as const;

const copied = ref(false);

async function copyInstall() {
  try {
    await navigator.clipboard.writeText("pnpm add @agntn/chains");
  } catch {
    return;
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1200);
}

/** The chain grid highlights whichever chain the panels are showing. */
const activeChain = computed(() => current.value.chain.key);
</script>

<template>
  <div class="chains-landing not-prose">
    <header
      class="chains-hero mx-auto w-full max-w-[var(--ui-container)] px-8 pt-24 pb-20 text-center sm:px-12 lg:px-16"
    >
      <h1
        class="chains-enter mx-auto max-w-3xl text-4xl leading-[1.08] font-medium tracking-tight text-balance text-highlighted sm:text-5xl lg:text-[3.75rem]"
      >
        Name a chain. <span class="text-primary">Check an address.</span>
      </h1>
      <p class="chains-enter chains-enter-2 mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
        Thirty-two blockchains as classes, one file each: chain ID, CAIP-2, coin type, decimals,
        explorer, default RPC. The spellings people actually type resolve to the same class, and
        every chain checks its own address format by decoding it, not by counting characters.
        Library, CLI, MCP server, Pi and OMP extensions. Nothing here touches a network.
      </p>
      <div
        class="chains-enter chains-enter-3 mt-8 flex flex-wrap items-center justify-center gap-2"
      >
        <UButton to="/guide" color="primary" trailing-icon="i-lucide-arrow-right">
          Get started
        </UButton>
        <UButton
          to="https://github.com/agntn/chains"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
        >
          Star on GitHub
        </UButton>
      </div>
      <button
        type="button"
        class="chains-enter chains-enter-4 chains-install mt-5"
        :aria-label="copied ? 'Copied' : 'Copy install command'"
        @click="copyInstall"
      >
        <span class="text-dimmed">$</span>
        <span>pnpm add @agntn/chains</span>
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5 text-dimmed" />
      </button>

      <div
        class="chains-enter chains-enter-4 mx-auto mt-16 hidden max-w-6xl md:block"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <LandingFlow :sample="current" :tick="tick" />
      </div>
    </header>

    <dl class="chains-section grid grid-cols-2 sm:grid-cols-4">
      <div
        v-for="(stat, i) in stats"
        :key="stat.label"
        class="border-default px-6 py-7 text-center"
        :class="{ 'border-t sm:border-t-0': i >= 2, 'border-l': i % 2 === 1, 'sm:border-l': i > 0 }"
      >
        <dd class="font-mono text-2xl text-highlighted">{{ stat.value }}</dd>
        <dt class="mt-1 font-mono text-[11px] tracking-[0.12em] text-dimmed uppercase">
          {{ stat.label }}
        </dt>
      </div>
    </dl>

    <LandingFeature
      eyebrow="Registry"
      title="matic, btc, arb. Same class every time"
      to="/guide/registry"
      link="Registry and aliases"
      :checks="[
        'Keys name the chain, not the ticker: ethereum, bsc, octra. Tickers are aliases',
        'Display names round trip, so the name one tool prints resolves in the next call',
        'getChain(\'\') throws. A blank string is a mistake, not a request for Ethereum',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">getChain("matic")</code> hands you the
      Polygon class with everything on it, and
      <code class="font-mono text-[13px] text-highlighted">create("polygon")</code> does the same
      from the canonical key. Symbols stay out of the automatic index, six chains report ETH and
      the answer would depend on registration order. This panel walks through
      {{ samples.length }} chains, every value read off the class in your browser.
      <template #visual>
        <div @mouseenter="paused = true" @mouseleave="paused = false">
          <LandingRotatingCode :sample="current" />
          <div class="mt-3 flex items-center justify-between font-mono text-[11px] text-dimmed">
            <span>{{ current.chain.name }} · {{ current.chain.type }}</span>
            <span class="inline-flex gap-1">
              <button type="button" class="chains-copy" aria-label="Previous chain" @click="step(-1)">
                <UIcon name="i-lucide-chevron-left" class="size-3.5" />
              </button>
              <button type="button" class="chains-copy" aria-label="Next chain" @click="step(1)">
                <UIcon name="i-lucide-chevron-right" class="size-3.5" />
              </button>
            </span>
          </div>
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Address validation"
      title="Decode the bytes, not count the characters"
      to="/guide/validation"
      link="How each format is checked"
      :checks="[
        'Base58 addresses are decoded: Solana wants 32 bytes, TRON 25 under 0x41, XRP its own alphabet',
        'Base58Check, Bech32, Bech32m, CashAddr and EIP-55 checksums are all verified, so one character off fails',
        'Rejected is an answer. InvalidAddressError carries the chain key and the address',
      ]"
      reverse
    >
      A 34-character window takes a Bitcoin address, a TRON address and half the typos in
      between. So the validators decode. The panel checks the current sample against its own
      chain, against a chain with another format, and with one character changed. Where the format
      carries a checksum the last row fails on it, and each chain's page says which checks stay
      unverified.
      <template #visual>
        <div @mouseenter="paused = true" @mouseleave="paused = false">
          <LandingValidate :sample="current" />
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Identify"
      title="One address, every validator at once"
      to="/guide/identify"
      link="Identify an address"
      :checks="[
        'identify(address) partitions the registry: chains that accept the format, chains with no validator',
        'An EVM address matches all fourteen EVM chains. That\'s the honest answer, not a bug',
        'No validator means unchecked, never a silent no. Right now every built-in chain has one',
      ]"
    >
      An address of unknown origin gets run through the whole registry. The families light up as
      the walk goes on: one for most chains, EVM for the 0x address that fourteen chains share,
      Move for the short <code class="font-mono text-[13px] text-highlighted">0x1</code> that
      Aptos and Sui both write. A match narrows the family. It doesn't say the address is used
      there, and the tool text says that out loud.
      <template #visual>
        <div @mouseenter="paused = true" @mouseleave="paused = false">
          <LandingIdentify :sample="current" />
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Chains"
      title="Thirty-two chains, eleven families"
      to="/chains"
      link="All chains"
      :checks="[
        'Fourteen EVM chains that share one address format and one coin type, 60',
        'Eight UTXO chains, and a UTXO heritage doesn\'t mean Bitcoin\'s encoding: CashAddr, CIP-19, two version bytes on Decred',
        'Solana, Stellar, XRP Ledger, Aptos, Sui, TON, TRON, Octra, Arweave and Monero on their own terms',
      ]"
      reverse
    >
      Each chain is a class in its own file with its own metadata. The family classes hold only
      what their members share:
      <code class="font-mono text-[13px] text-highlighted">EVM</code> and
      <code class="font-mono text-[13px] text-highlighted">Move</code> own the address format,
      everything else is declared per chain, coin type included. The page for a chain says which
      bytes are checked and which checksum is left alone.
      <template #visual>
        <div class="chains-frame grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3">
          <NuxtLink
            v-for="(entry, i) in CHAINS"
            :key="entry.key"
            :to="entry.to"
            class="group flex flex-col gap-2 border-muted px-4 py-3 transition-colors duration-500 hover:bg-muted"
            :class="{
              'border-t': i >= 2,
              'sm:border-t-0': i < 3,
              'border-l': i % 2 === 1,
              'sm:border-l': i % 3 !== 0,
              'sm:border-l-0': i % 3 === 0,
              'chains-cell-active': entry.key === activeChain,
            }"
          >
            <UIcon
              :name="entry.icon"
              class="size-4 text-muted transition-colors duration-500 group-hover:text-primary"
              :class="{ 'text-primary': entry.key === activeChain }"
            />
            <span>
              <span class="block truncate text-sm font-medium text-highlighted">{{ entry.chain.name }}</span>
              <span class="mt-0.5 block font-mono text-[11px] text-dimmed">"{{ entry.key }}"</span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/guide/custom"
            class="group flex flex-col gap-2 border-t border-l border-muted px-4 py-3 transition-colors duration-500 hover:bg-muted sm:border-l-0"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4 text-muted transition-colors duration-500 group-hover:text-primary"
            />
            <span>
              <span class="block text-sm font-medium text-highlighted">Yours</span>
              <span class="mt-0.5 block font-mono text-[11px] text-dimmed">extends Chain</span>
            </span>
          </NuxtLink>
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Agents"
      title="Five tools, three hosts"
      to="/guide/agents"
      link="MCP, Pi and OMP"
      :checks="[
        'chains_lookup, chains_validate_address, chains_validate_txid, chains_identify_address, chains_list',
        'The text carries the whole answer, and a miss names the keys that exist, so the next call has somewhere to go',
        'A rejected address or txid is an answer, not a tool error. Only an unknown chain, or one with no txid check, sets isError',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">chains mcp</code> serves the tools over
      stdio, the Pi and OMP extensions render them in the terminal. All three call the same
      executors, so they answer identically and a fix lands once. Absent fields say so out loud,
      <code class="font-mono text-[13px] text-highlighted">bip44: none</code>, because a missing
      coin type reads as not shown and invites a model to supply one from memory.
      <template #visual>
        <div @mouseenter="paused = true" @mouseleave="paused = false">
          <LandingToolCall :sample="current" />
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Your chain"
      title="Extend Chain, call register"
      to="/guide/custom"
      link="Custom chains"
      :checks="[
        'A static key, the metadata fields, and assertAddress when the format is known',
        'register(MyChain) puts it behind create, getChain, identify and has',
        'Nothing registers itself on import. The registry is one list, so a bundler can drop what you never touch',
      ]"
      reverse
    >
      Every built-in is a concrete class extending the exported abstract
      <code class="font-mono text-[13px] text-highlighted">Chain</code>, or
      <code class="font-mono text-[13px] text-highlighted">EVM</code> when the format is
      Ethereum's. Yours is the same shape, one file. Throw
      <code class="font-mono text-[13px] text-highlighted">InvalidAddressError</code> with your key
      and the address, and <code class="font-mono text-[13px] text-highlighted">identify</code>
      treats your chain like any other. No plugin manifest.
      <template #visual>
        <div class="chains-frame overflow-hidden rounded-xl">
          <div class="flex items-center gap-2 border-b border-muted px-4 py-3">
            <span class="font-mono text-[10px] font-bold text-primary">TS</span>
            <span class="text-sm text-default">nano.ts</span>
          </div>
          <pre class="chains-rotating"><code><span class="tok-kw">import</span> { Chain, InvalidAddressError, register } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/chains"</span>;
<span class="tok-kw">import type</span> { ChainKey, ChainType } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/chains"</span>;

<span class="tok-cm">/** The shape of a Nano account. Its checksum stays unchecked here. */</span>
<span class="tok-kw">const</span> ADDRESS = <span class="tok-str">/^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/</span>;

<span class="tok-kw">class</span> <span class="tok-fn">Nano</span> <span class="tok-kw">extends</span> Chain {
  <span class="tok-kw">static readonly</span> key = <span class="tok-str">"nano"</span> <span class="tok-kw">as</span> ChainKey;
  <span class="tok-kw">readonly</span> type = <span class="tok-str">"nano"</span> <span class="tok-kw">as</span> ChainType;
  <span class="tok-kw">readonly</span> name = <span class="tok-str">"Nano"</span>;
  <span class="tok-kw">readonly</span> symbol = <span class="tok-str">"XNO"</span>;
  <span class="tok-kw">override readonly</span> decimals = 30;
  <span class="tok-kw">readonly</span> explorer = <span class="tok-str">"https://nanexplorer.com/nano"</span>;
  <span class="tok-kw">readonly</span> bip44 = 165;

  <span class="tok-kw">override</span> <span class="tok-fn">assertAddress</span>(address: <span class="tok-kw">string</span>): <span class="tok-kw">string</span> {
    <span class="tok-kw">if</span> (!ADDRESS.<span class="tok-fn">test</span>(address)) <span class="tok-kw">throw new</span> <span class="tok-fn">InvalidAddressError</span>(<span class="tok-kw">this</span>.key, address);
    <span class="tok-kw">return</span> address;
  }
}

<span class="tok-fn">register</span>(Nano);</code></pre>
        </div>
      </template>
    </LandingFeature>

    <section class="chains-section">
      <div
        class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 text-center sm:px-12 lg:px-16"
      >
        <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-3xl">
          Start with one command
        </h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          Pre-1.0, so pin exact versions. And a green check here means the string fits the format,
          nothing more. It isn't proof the address exists, and it isn't proof it belongs to who
          you think.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
          <UButton to="/guide" color="primary" trailing-icon="i-lucide-arrow-right">
            Read the guide
          </UButton>
          <UButton to="/playground" color="neutral" variant="outline"> Open the playground </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
