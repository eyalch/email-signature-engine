<script setup lang="ts">
import { useFetch } from "@vueuse/core"

type Template = {
  id: number
  previewUrl: string
}

const { data, isFetching } = useFetch("/api/templates", {
  initialData: [],
}).json<Template[]>()
</script>

<template>
  <h1>Templates</h1>

  <span v-if="isFetching" aria-busy="true">Fetching templates…</span>

  <article v-for="template in data" :key="template.id">
    <img :src="template.previewUrl" alt="Template preview" />
  </article>
</template>
