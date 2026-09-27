<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { CHAINS, familyLabel, type ChainEntry } from "../../utils/chains";
import { ROSTER_CLASS, ROSTER_TABLE_UI } from "../../utils/roster";

interface Row {
  readonly entry: ChainEntry;
  readonly key: string;
  readonly name: string;
  readonly family: string;
  readonly symbol: string;
  /** `-1` for a chain with no SLIP-0044 coin type, so it sorts after every real one. */
  readonly coin: number;
  readonly id: string;
}

/** Every value is read off the class; the registry order is the default. */
const rows: Row[] = CHAINS.map((entry) => ({
  entry,
  key: entry.key,
  name: entry.chain.name,
  family: entry.chain.type,
  symbol: entry.chain.symbol,
  coin: entry.chain.bip44 ?? -1,
  id: entry.chain.chainId ?? entry.chain.caip2 ?? "",
}));

const sorting = ref<{ id: string; desc: boolean }[]>([]);

const roster = useTemplateRef<HTMLElement>("roster");
useRosterFlip(
  () => roster.value,
  () => sorting.value,
);

const columns: TableColumn<Row>[] = [
  { accessorKey: "name", header: "Chain", sortingFn: "text", meta: { class: { th: "w-[15rem]" } } },
  {
    accessorKey: "symbol",
    header: "Symbol",
    sortingFn: "text",
    meta: { class: { th: "w-[6rem]", td: "@max-[52rem]/roster:justify-self-end" } },
  },
  {
    accessorKey: "family",
    header: "Family",
    sortingFn: "text",
    meta: { class: { th: "w-[7.5rem]" } },
  },
  {
    accessorKey: "id",
    header: "Chain ID or CAIP-2",
    enableSorting: false,
    meta: { class: { td: "min-w-0" } },
  },
  {
    accessorKey: "coin",
    header: "Coin type",
    meta: { class: { th: "w-[9rem]" } },
  },
];

const order = computed(() => {
  const [first] = sorting.value;
  if (first === undefined) return "registry order";
  const label = columns.find(
    (column) => "accessorKey" in column && column.accessorKey === first.id,
  )?.header;
  return `by ${String(label).toLowerCase()} ${first.desc ? "descending" : "ascending"}`;
});
</script>

<template>
  <section ref="roster" class="roster not-prose my-6" aria-label="Chains">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header :class="ROSTER_CLASS.bar">
      <span :class="ROSTER_CLASS.title">chains()</span>
      <span :class="ROSTER_CLASS.meta">{{ CHAINS.length }} chains · {{ order }}</span>
    </header>
    <div class="roster-ruler" aria-hidden="true" />
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :get-row-id="(row) => row.key"
      :ui="ROSTER_TABLE_UI"
    >
      <template #name-header="{ column }"><RosterSort :column="column" label="Chain" /></template>
      <template #symbol-header="{ column }"><RosterSort :column="column" label="Symbol" /></template>
      <template #family-header="{ column }"><RosterSort :column="column" label="Family" /></template>
      <template #coin-header="{ column }"><RosterSort :column="column" label="Coin type" /></template>
      <template #name-cell="{ row }">
        <NuxtLink :to="row.original.entry.to" :class="[ROSTER_CLASS.name, 'items-baseline']">
          <UIcon
            :name="row.original.entry.icon"
            class="relative top-0.5 size-3.5 flex-none"
            aria-hidden="true"
          />
          <span class="truncate">{{ row.original.name }}</span>
          <span :class="[ROSTER_CLASS.id, 'flex-none']">{{ row.original.key }}</span>
        </NuxtLink>
      </template>
      <template #symbol-cell="{ row }">
        <UTooltip :text="`${row.original.entry.chain.decimals ?? 'unknown'} decimals`">
          <span class="whitespace-nowrap text-highlighted" tabindex="0"
            >{{ row.original.symbol
            }}<span class="text-dimmed"> · {{ row.original.entry.chain.decimals ?? "?" }}</span></span
          >
        </UTooltip>
      </template>
      <template #family-cell="{ row }">
        <span class="text-muted">{{ familyLabel(row.original.family) }}</span>
      </template>
      <template #id-cell="{ row }">
        <UTooltip v-if="row.original.id" :text="row.original.entry.chain.caip2 ?? row.original.id">
          <span class="block truncate text-muted" tabindex="0">{{ row.original.id }}</span>
        </UTooltip>
        <span v-else class="text-dimmed">none registered</span>
      </template>
      <template #coin-cell="{ row }">
        <span :class="ROSTER_CLASS.count"
          ><span :class="ROSTER_CLASS.leader" aria-hidden="true" /><span class="whitespace-nowrap"
            ><template v-if="row.original.coin >= 0"
              >coin
              <span class="text-highlighted">{{ row.original.coin }}</span></template
            ><template v-else>no coin type</template></span
          ></span
        >
      </template>
    </UTable>
    <footer :class="ROSTER_CLASS.footer">
      <span>read from the registry in your browser / no network</span>
      <span :class="ROSTER_CLASS.meta">getChain("matic") → polygon</span>
    </footer>
  </section>
</template>
