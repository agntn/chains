<script setup lang="ts">
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
    <ToolHero
      eyebrow="playground"
      title="Any chain, any address."
      accent="Right here, in the page."
      description="The page imports @agntn/chains and runs it in your browser. Nothing you paste leaves the tab, and every state is a link you can send to someone."
    >
      <p
        class="chains-enter chains-enter-3 mx-auto mt-5 inline-flex max-w-xl items-start gap-2 text-left text-sm leading-6 text-dimmed"
      >
        <UIcon name="i-lucide-shield-alert" class="mt-1 size-4 shrink-0 text-primary" />
        <span
          >A green result means the address fits the chain's format. It doesn't mean the address
          exists, has a balance, or belongs to who you think.</span
        >
      </p>
    </ToolHero>

    <section class="chains-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-12 sm:px-12 lg:px-16">
        <ChainsPlayground />
      </div>
    </section>
  </div>
</template>
