<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";

const props = defineProps<{ sample: LandingSample }>();

const fileName = computed(() => `${props.sample.chain.key}.ts`);

/** The comment line: what the alias resolves to, or that the key is its own spelling. */
const note = computed(() => {
  const { alias } = props.sample.entry;
  const { key, name } = props.sample.chain;
  return alias === key ? `"${key}" is the key itself, "${name}" resolves too` : `"${alias}" resolves to "${key}"`;
});

function literal(value: string | number | undefined): string {
  return value === undefined ? "undefined" : typeof value === "number" ? String(value) : `"${value}"`;
}

const lines = computed(() => {
  const chain = props.sample.chain;
  return [
    { field: "key", value: literal(chain.key) },
    { field: "name", value: literal(chain.name) },
    { field: "symbol", value: `${literal(chain.symbol)}, ${chain.decimals ?? "?"} decimals` },
    { field: "chainId", value: literal(chain.chainId) },
    { field: "caip2", value: literal(chain.caip2) },
    { field: "bip44", value: literal(chain.bip44) },
    { field: "explorer", value: literal(chain.explorer) },
  ];
});
</script>

<template>
  <div class="chains-frame overflow-hidden rounded-xl">
    <div class="flex items-center gap-2 border-b border-muted px-4 py-3">
      <span class="font-mono text-[10px] font-bold text-primary">TS</span>
      <span class="text-sm text-default">
        <Transition name="chains-roll" mode="out-in">
          <span :key="fileName">{{ fileName }}</span>
        </Transition>
      </span>
    </div>
    <pre
      class="chains-rotating"
    ><code><span class="tok-kw">import</span> { getChain } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/chains"</span>;

<span class="tok-cm">// <Transition name="chains-roll" mode="out-in"><span :key="note" class="chains-roll-slot">{{ note }}</span></Transition></span>
<span class="tok-kw">const</span> chain = <span class="tok-fn">getChain</span>(<span class="tok-str">"<Transition name="chains-roll" mode="out-in"><span :key="sample.entry.alias" class="chains-roll-slot">{{ sample.entry.alias }}</span></Transition>"</span>);
<template v-for="line in lines" :key="line.field">
chain.{{ line.field }};{{ " ".repeat(9 - line.field.length) }}<span class="tok-cm">// <Transition name="chains-roll" mode="out-in"><span :key="line.value" class="chains-roll-slot">{{ line.value }}</span></Transition></span></template></code></pre>
  </div>
</template>
