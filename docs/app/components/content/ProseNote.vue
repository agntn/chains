<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <ChainsCallout kind="note" :title="title"><slot mdc-unwrap="p" /></ChainsCallout>
</template>
