<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingChain";
import { FAMILIES } from "../../utils/chains";
import { clip, hostPath, shorten } from "../../utils/format";

const props = defineProps<{ sample: LandingSample; tick: number }>();

const W = 1200;
const H = 400;
const CALL = { x: 24, y: 120, w: 340, h: 160 };
const NODE = { x: 510, w: 200, h: 28, gap: 6 };
const RESULT = { x: 870, y: 20, w: 306, h: 360 };

const nodes = computed(() =>
  FAMILIES.map((family, index) => ({
    ...family,
    y: 13 + index * (NODE.h + NODE.gap),
    active: family.key === props.sample.chain.type,
  })),
);

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

const trunkPaths = computed(() =>
  nodes.value.map((node) => ({
    d: curvePath(CALL.x + CALL.w, CALL.y + CALL.h / 2, NODE.x, node.y + NODE.h / 2),
    active: node.active,
  })),
);

const branchPaths = computed(() =>
  nodes.value.map((node) => ({
    d: curvePath(NODE.x + NODE.w, node.y + NODE.h / 2, RESULT.x, RESULT.y + RESULT.h / 2),
    active: node.active,
  })),
);

/** Rows of the chain card: short values share a line, identifiers and the explorer get their own. */
const rows = computed(() => {
  const chain = props.sample.chain;
  const identifier = chain.chainId ? `${chain.caip2} · ${chain.chainId}` : (chain.caip2 ?? "none");
  return [
    [
      { label: "key", value: chain.key },
      { label: "type", value: chain.type },
    ],
    [
      { label: "symbol", value: `${chain.symbol} · ${chain.decimals ?? "?"} decimals` },
      { label: "bip44", value: chain.bip44 === undefined ? "none" : String(chain.bip44) },
    ],
    [{ label: chain.chainId ? "caip2 · chainId" : "caip2", value: clip(identifier, 36) }],
    [{ label: "explorer", value: clip(hostPath(chain.explorer), 36) }],
  ];
});

const shown = computed(() => shorten(props.sample.address, 14, 12));

/** Space Mono is about 0.62 em wide per glyph; shrink the text until it fits the box. */
function fit(text: string, width: number, max: number) {
  return Math.min(max, Math.floor(width / (Math.max(text.length, 1) * 0.62)));
}
const inputSize = computed(() => fit(shown.value, CALL.w - 36, 20));
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="chains-flow"
    role="img"
    aria-label="One address goes to the chain's family validator and comes back with the chain's metadata"
  >
    <g class="chains-flow-wires">
      <path
        v-for="(path, index) in trunkPaths"
        :key="`t${index}`"
        :d="path.d"
        :class="{ 'chains-flow-wire-dim': !path.active }"
      />
      <path
        v-for="(path, index) in branchPaths"
        :key="`b${index}`"
        :d="path.d"
        :class="{ 'chains-flow-wire-dim': !path.active }"
      />
    </g>
    <g :key="tick" class="chains-flow-pulses">
      <template v-for="(path, index) in trunkPaths" :key="`pt${index}`">
        <path v-if="path.active" :d="path.d" class="chains-flow-pulse" />
      </template>
      <template v-for="(path, index) in branchPaths" :key="`pb${index}`">
        <path v-if="path.active" :d="path.d" class="chains-flow-pulse chains-flow-pulse-late" />
      </template>
    </g>

    <g class="chains-flow-node">
      <rect :x="CALL.x" :y="CALL.y" :width="CALL.w" :height="CALL.h" rx="10" />
      <text :x="CALL.x + 18" :y="CALL.y + 30" class="chains-flow-label">
        assertAddress(address)
      </text>
      <text
        :x="CALL.x + 18"
        :y="CALL.y + 72"
        class="chains-flow-domain chains-flow-accent"
        :style="{ fontSize: `${inputSize}px` }"
      >
        <tspan :key="sample.address" class="chains-derive">{{ shown }}</tspan>
      </text>
      <text :x="CALL.x + 18" :y="CALL.y + 104" class="chains-flow-mono">
        getChain("{{ sample.entry.alias }}")
      </text>
      <text :x="CALL.x + 18" :y="CALL.y + 130" class="chains-flow-label">
        {{ sample.address.length }} characters · sample
      </text>
    </g>

    <g
      v-for="node in nodes"
      :key="node.key"
      class="chains-flow-node"
      :class="{ 'chains-flow-dim': !node.active }"
    >
      <rect :x="NODE.x" :y="node.y" :width="NODE.w" :height="NODE.h" rx="7" />
      <text :x="NODE.x + 14" :y="node.y + 19" class="chains-flow-small">{{ node.label }}</text>
    </g>

    <g class="chains-flow-node">
      <rect :x="RESULT.x" :y="RESULT.y" :width="RESULT.w" :height="RESULT.h" rx="10" />
      <text :x="RESULT.x + 18" :y="RESULT.y + 28" class="chains-flow-label">Chain</text>
      <text
        :x="RESULT.x + RESULT.w - 18"
        :y="RESULT.y + 28"
        text-anchor="end"
        class="chains-flow-mono"
      >
        {{ clip(sample.chain.name, 22) }}
      </text>
      <line
        :x1="RESULT.x + 1"
        :x2="RESULT.x + RESULT.w - 1"
        :y1="RESULT.y + 44"
        :y2="RESULT.y + 44"
        class="chains-flow-rule"
      />
      <text :x="RESULT.x + 18" :y="RESULT.y + 68" class="chains-flow-label">address</text>
      <text :x="RESULT.x + 18" :y="RESULT.y + 96" class="chains-flow-domain chains-flow-accent">
        <tspan :key="sample.chain.key" class="chains-derive">accepted</tspan>
      </text>
      <template v-for="(row, rowIndex) in rows" :key="`${sample.chain.key}-${rowIndex}`">
        <g v-for="(field, column) in row" :key="field.label" class="chains-derive">
          <text
            :x="RESULT.x + 18 + column * 140"
            :y="RESULT.y + 136 + rowIndex * 56"
            class="chains-flow-label"
          >
            {{ field.label }}
          </text>
          <text
            :x="RESULT.x + 18 + column * 140"
            :y="RESULT.y + 156 + rowIndex * 56"
            class="chains-flow-small"
          >
            {{ field.value }}
          </text>
        </g>
      </template>
    </g>
  </svg>
</template>
