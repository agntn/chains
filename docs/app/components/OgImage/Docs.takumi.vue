<script lang="ts" setup>
import { CHAINS, familyLabel } from "../../utils/chains";
import { shorten } from "../../utils/format";

/** Overrides the Docus template of the same name. Takumi has no CSS variables, so literals. */
const { title, description, headline } = defineProps<{
  title?: string;
  description?: string;
  headline?: string;
}>();

const { name: siteName } = useSiteConfig();

const TOOLS = ["chains_lookup", "chains_validate_address", "chains_identify_address", "chains_list"];

/** A chain page shows the chain's facts. The description would arrive with its commas stripped. */
const entry = CHAINS.find((row) => row.chain.name === title);

const subtitle = entry
  ? [
      `${familyLabel(entry.chain.type)} family.`,
      `${entry.chain.symbol} with ${entry.chain.decimals ?? "unknown"} decimals.`,
      `Coin type ${entry.chain.bip44 ?? "none"}.`,
      entry.chain.chainId ? `Chain ID ${entry.chain.chainId}.` : "",
    ]
      .filter(Boolean)
      .join(" ")
  : (description ?? "").slice(0, 160);

const chips = entry
  ? [`create("${entry.key}")`, entry.chain.type, shorten(entry.sample, 12, 8)]
  : TOOLS;
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-between px-[72px] py-[56px]"
    style="background-color: #0b0d10; font-family: &quot;Space Grotesk&quot;; color: #d5e4ee"
  >
    <div
      class="absolute top-0 left-0 w-[900px] h-[520px]"
      style="
        background-image: radial-gradient(
          ellipse at top left,
          rgba(165, 180, 252, 0.16) 0%,
          rgba(165, 180, 252, 0.05) 45%,
          transparent 70%
        );
      "
    />
    <div
      class="absolute right-0 bottom-0 w-[700px] h-[420px]"
      style="
        background-image: radial-gradient(
          ellipse at bottom right,
          rgba(79, 70, 229, 0.14) 0%,
          transparent 65%
        );
      "
    />

    <div class="flex items-center justify-between w-full">
      <div class="flex items-center">
        <div class="w-[10px] h-[10px] rounded-full" style="background-color: #a5b4fc" />
        <p
          class="m-0 ml-[12px] uppercase text-[20px] tracking-[0.16em]"
          style="font-family: &quot;Space Mono&quot;; color: #a5b0bc"
        >
          {{ headline || "Guide" }}
        </p>
      </div>
      <div class="flex items-center">
        <p class="m-0 text-[22px]" style="font-family: &quot;Space Mono&quot;; color: #f0f4f8">
          {{ siteName }}
        </p>
      </div>
    </div>

    <div class="flex-1 flex flex-col justify-center w-full">
      <h1
        v-if="title"
        class="m-0 mb-[22px] text-[62px] font-medium leading-[1.06] tracking-[-0.03em] w-full max-w-[960px]"
        style="color: #f0f4f8"
      >
        {{ title.slice(0, 60) }}
      </h1>
      <p
        v-if="subtitle"
        class="m-0 text-[27px] leading-[1.4] w-full max-w-[900px]"
        style="color: #8a97a5"
      >
        {{ subtitle }}
      </p>
    </div>

    <div class="flex items-center justify-between w-full">
      <div class="flex items-center">
        <div
          v-for="chip in chips"
          :key="chip"
          class="flex items-center mr-[10px] px-[12px] h-[36px] rounded-[8px] text-[16px] leading-none"
          style="
            font-family: &quot;Space Mono&quot;;
            color: #a5b0bc;
            background-color: #11141a;
            border: 1px solid #262c35;
            line-height: 36px;
            white-space: nowrap;
          "
        >
          {{ chip }}
        </div>
      </div>
      <p
        class="m-0 ml-[24px] text-[16px]"
        style="font-family: &quot;Space Mono&quot;; color: #6d7884"
      >
        chains.agntn.dev
      </p>
    </div>
  </div>
</template>
