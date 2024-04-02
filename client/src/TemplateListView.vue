<script setup lang="ts">
import { useFetch } from "@vueuse/core"

import { Template } from "./templates.ts"

const { data, isFetching } = useFetch("/api/templates", {
  initialData: [],
}).json<Template[]>()
</script>

<template>
  <h1>Templates</h1>

  <span v-if="isFetching" aria-busy="true">Fetching templates…</span>

  <article v-for="template in data" :key="template.id">
    <RouterLink :to="{ name: 'template', params: { id: template.id } }">
      <img :src="template.previewUrl" alt="Template preview" />
    </RouterLink>

    <footer>
      <RouterLink :to="{ name: 'template', params: { id: template.id } }">
        Use this template
      </RouterLink>
    </footer>
  </article>
</template>
