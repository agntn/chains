<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { tokens } from "../../utils/tokens";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const { copied, copy } = useCopied();

function literal(value: string | number | undefined): string {
  return value === undefined ? "undefined" : typeof value === "number" ? String(value) : `"${value}"`;
}

/** Every chain gets the same eleven lines, so the file keeps one height while the sample walks. */
const lines = computed(() => {
  const { alias } = props.sample.entry;
  const chain = props.sample.chain;
  const note =
    alias === chain.key
      ? `"${alias}" is the key itself, "${chain.name}" resolves too`
      : `"${alias}" resolves to "${chain.key}"`;
  const fields: [string, string][] = [
    ["key", literal(chain.key)],
    ["name", literal(chain.name)],
    ["symbol", `${literal(chain.symbol)}, ${chain.decimals ?? "unknown"} decimals`],
    ["chainId", literal(chain.chainId)],
    ["caip2", literal(chain.caip2)],
    ["bip44", literal(chain.bip44)],
    ["explorer", literal(chain.explorer)],
  ];
  return [
    'import { getChain } from "@agntn/chains";',
    "",
    `// ${note}`,
    `const chain = getChain("${alias}");`,
    ...fields.map(([field, value]) => `chain.${field};${" ".repeat(9 - field.length)}// ${value}`),
  ];
});
</script>

<template>
  <section
    class="tool-console landing-file"
    aria-label="One chain resolved from the spelling people type"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title file-name"
        ><span class="console-tag">File</span
        ><Transition name="chains-roll" mode="out-in"
          ><span :key="sample.chain.key" class="chains-roll-slot"
            >{{ sample.chain.key }}.ts</span
          ></Transition
        ></span
      >
      <span class="console-meta">{{ sample.chain.type }} · read off the class</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.chain.key" class="console-cursor" />
    </div>

    <div class="file-body">
      <p class="console-label console-rule-title">
        <span>Resolve <span aria-hidden="true">[ any spelling, one class ]</span></span>
        <span class="console-mark" aria-hidden="true" />
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'file' ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied === 'file' ? 'copied' : 'copy'"
          :aria-label="copied === 'file' ? 'Copied' : 'Copy the file'"
          @click="copy('file', lines.join('\n'))"
        />
      </p>
      <!-- prettier-ignore -->
      <pre class="console-snippet console-lines file-lines"><code><span v-for="(line, index) in lines" :key="index"><span v-for="(token, part) in tokens(line)" :key="part" :class="token.cls">{{ token.text }}</span></span></code></pre>
    </div>

    <footer class="console-footer console-footer-plain">
      <NuxtLink :to="sample.entry.to" class="file-link"
        ><span aria-hidden="true">→ </span>{{ sample.chain.name
        }}<span> · {{ sample.entry.to }}</span></NuxtLink
      >
      <div class="console-controls" aria-label="Sample chains">
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-left"
          aria-label="Previous chain"
          @click="emit('step', -1)"
        />
        <span>Chain</span>
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-right"
          aria-label="Next chain"
          @click="emit('step', 1)"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-name :deep(.chains-roll-slot) {
  display: inline;
}
.file-body {
  padding: 14px 20px 16px;
}
.file-body > .console-rule-title {
  margin-bottom: 10px;
}
/* One line per code line whatever the chain: long values end in an ellipsis, copy hands out the whole line. */
.file-lines > code > span {
  overflow: hidden;
  padding-left: calc(2.25em + 1em);
  text-indent: 0;
  text-overflow: ellipsis;
  white-space: pre;
}
.file-lines > code > span::before {
  margin-left: calc(-2.25em - 1em);
}
.file-lines > code > span :deep(*) {
  white-space: pre;
  overflow-wrap: normal;
}
.file-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.file-link > span:last-child {
  color: var(--ui-text-dimmed);
}
.file-link:hover {
  color: var(--console-accent);
}
.file-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 640px) {
  .file-body > .console-rule-title > .console-mark {
    display: none;
  }
}
@media (width < 400px) {
  .file-body {
    padding-inline: 14px;
  }
  .file-body > .console-rule-title > span:first-child > span {
    display: none;
  }
}
</style>
