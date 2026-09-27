<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <ChainsCallout kind="caution" :title="title"><slot mdc-unwrap="p" /></ChainsCallout>
</template>
