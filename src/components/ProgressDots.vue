<script setup lang="ts">
defineProps<{
  total: number
  completed: number
}>()
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 pt-1"
    role="list"
    :aria-label="`Session progress: ${completed} of ${total} completed`"
  >
    <span
      v-for="i in total"
      :key="i"
      role="listitem"
      class="progress-dot inline-block h-3 w-3 rounded-full border border-white/30 sm:h-3.5 sm:w-3.5"
      :class="
        i <= completed
          ? 'filled bg-tomato-500 border-tomato-400'
          : 'bg-white/15'
      "
      :title="i <= completed ? `Session ${i} complete` : `Session ${i} pending`"
      :aria-label="
        i <= completed ? `Session ${i} complete` : `Session ${i} pending`
      "
    />
  </div>
</template>
