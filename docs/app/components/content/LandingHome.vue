<script setup lang="ts">
import { CHAINS, FAMILIES, TOOLS } from "../../utils/chains";

const { samples, paused, current, step } = useLandingChain();

const evm = CHAINS.filter((entry) => entry.chain.type === "evm").length;
const utxo = CHAINS.filter((entry) => entry.chain.type === "utxo").length;
</script>

<template>
  <div class="chains-landing not-prose">
    <LandingHero :sample="current" @step="step" @pause="paused = $event" />

    <LandingFeature
      title="matic, btc, arb. Same class every time"
      to="/guide/registry"
      link="Registry and aliases"
      :checks="[
        'Keys name the chain, not the ticker: ethereum, bsc, octra. Tickers are aliases',
        'Display names round trip, so the name one tool prints resolves in the next call',
        'getChain(\'\') throws. A blank string is a mistake, not a request for Ethereum',
      ]"
    >
      <code class="chains-code">getChain("matic")</code> hands you the Polygon class with
      everything on it, and <code class="chains-code">create("polygon")</code> does the same from
      the canonical key. Symbols stay out of the automatic index, six chains report ETH and the
      answer would depend on registration order. This file walks through
      {{ samples.length }} chains, every value read off the class in your browser.
      <template #visual>
        <LandingRotatingCode :sample="current" @step="step" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
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
      A 34-character window takes a Bitcoin address, a TRON address and half the typos in between.
      So the validators decode. The panel checks the current sample against its own chain, against
      a chain with another format, and with one character changed. Where the format carries a
      checksum the last row fails on it, and each chain's page says which checks stay unverified.
      <template #visual>
        <LandingValidate :sample="current" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="One address, every validator at once"
      to="/guide/identify"
      link="Identify an address"
      :checks="[
        'identify(address) partitions the registry: chains that accept the format, chains with no validator',
        `An EVM address matches all ${evm} EVM chains. That's the honest answer, not a bug`,
        'No validator means unchecked, never a silent no. Right now every built-in chain has one',
      ]"
    >
      An address of unknown origin gets run through the whole registry. One family lights up for
      most chains, EVM for the 0x address that {{ evm }} chains share, Move for the short
      <code class="chains-code">0x1</code> that Aptos and Sui both write. A match narrows the
      family. It doesn't say the address is used there, and the tool text says that out loud.
      <template #visual>
        <LandingIdentify :sample="current" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <section class="chains-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <div class="max-w-2xl">
          <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-[1.75rem]">
            {{ CHAINS.length }} chains, {{ FAMILIES.length }} families
          </h2>
          <p class="mt-4 text-sm leading-6 text-muted">
            Each chain is a class in its own file with its own metadata. The family classes hold
            only what their members share: <code class="chains-code">EVM</code> and
            <code class="chains-code">Move</code> own the address format, everything else is
            declared per chain, coin type included. {{ utxo }} UTXO chains, and a UTXO heritage
            doesn't mean Bitcoin's encoding: CashAddr, CIP-19, two version bytes on Decred,
            F4Jumble on Zcash. The page for a chain says which bytes are checked and which checksum
            is left alone.
          </p>
          <p class="landing-entry">
            <span class="console-tag">Import</span>
            <code>import { chains, create } from "@agntn/chains"</code>
          </p>
        </div>
        <ChainRoster class="mt-10" />
      </div>
    </section>

    <LandingFeature
      :title="`${TOOLS.length} tools, three hosts`"
      to="/guide/agents"
      link="MCP, Pi and OMP"
      :checks="[
        TOOLS.join(', '),
        'The text carries the whole answer, and a miss names the keys that exist, so the next call has somewhere to go',
        'A rejected address or txid is an answer, not a tool error. Only an unknown chain, or one with no txid check, sets isError',
      ]"
      reverse
    >
      <code class="chains-code">chains mcp</code> serves the tools over stdio, the Pi and OMP
      extensions render them in the terminal. All three call the same executors, so they answer
      identically and a fix lands once. Absent fields say so out loud,
      <code class="chains-code">bip44: none</code>, because a missing coin type reads as not shown
      and invites a model to supply one from memory.
      <template #visual>
        <LandingToolCall :sample="current" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="Extend Chain, call register"
      to="/guide/custom"
      link="Custom chains"
      :checks="[
        'A static key, the metadata fields, and assertAddress when the format is known',
        'register(MyChain) puts it behind create, getChain, identify and has',
        'Nothing registers itself on import. The registry is one list, so a bundler can drop what you never touch',
      ]"
    >
      Every built-in is a concrete class extending the exported abstract
      <code class="chains-code">Chain</code>, or <code class="chains-code">EVM</code> when the
      format is Ethereum's. Yours is the same shape, one file. Throw
      <code class="chains-code">InvalidAddressError</code> with your key and the address, and
      <code class="chains-code">identify</code> treats your chain like any other. No plugin
      manifest.
      <template #visual>
        <LandingCustom />
      </template>
    </LandingFeature>

    <section class="chains-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <LandingStart />
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-entry {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 20px 0 0;
  min-width: 0;
}
.landing-entry > .console-tag {
  flex: none;
  margin: 0;
}
.landing-entry > code {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
</style>
