<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <ChainsCallout kind="tip" :title="title"><slot mdc-unwrap="p" /></ChainsCallout>
</template>
