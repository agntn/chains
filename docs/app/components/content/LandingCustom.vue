<script setup lang="ts">
import { tokens } from "../../utils/tokens";

const { copied, copy } = useCopied();

/** A chain of your own, the way a built-in is written: a static key, the metadata, a validator. */
const LINES = [
  'import { Chain, InvalidAddressError, register } from "@agntn/chains";',
  'import type { ChainKey, ChainType } from "@agntn/chains";',
  "",
  "const ADDRESS = /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/;",
  "",
  "class Nano extends Chain {",
  '  static readonly key = "nano" as ChainKey;',
  '  readonly type = "nano" as ChainType;',
  '  readonly name = "Nano";',
  '  readonly symbol = "XNO";',
  '  readonly explorer = "https://nanexplorer.com/nano";',
  "",
  "  override assertAddress(address: string): string {",
  "    if (!ADDRESS.test(address)) throw new InvalidAddressError(this.key, address);",
  "    return address;",
  "  }",
  "}",
  "",
  "register(Nano);",
] as const;
</script>

<template>
  <section class="tool-console landing-custom" aria-label="A chain of your own">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"><span class="console-tag">File</span>nano.ts</span>
      <span class="console-meta">extends Chain</span>
      <span class="console-mark" aria-hidden="true" />
      <UButton
        color="neutral"
        variant="subtle"
        :icon="copied === 'nano' ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied === 'nano' ? 'copied' : 'copy'"
        :aria-label="copied === 'nano' ? 'Copied' : 'Copy nano.ts'"
        @click="copy('nano', LINES.join('\n'))"
      />
    </header>
    <div class="console-ruler" aria-hidden="true" />

    <div class="custom-body">
      <!-- prettier-ignore -->
      <pre class="console-snippet console-lines"><code><span v-for="(line, index) in LINES" :key="index"><span v-for="(token, part) in tokens(line)" :key="part" :class="token.cls">{{ token.text }}</span></span></code></pre>
    </div>
  </section>
</template>

<style scoped>
.custom-body {
  padding: 14px 20px 18px;
}
/* Breaks only between words: a regex or a URL split at any character is hard to read. */
.custom-body > .console-snippet {
  overflow-wrap: break-word;
}
@media (width < 400px) {
  .custom-body {
    padding-inline: 14px;
  }
}
</style>
