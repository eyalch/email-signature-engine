<script setup lang="ts">
import { useFetch } from "@vueuse/core"
import { ref } from "vue"

import { Template } from "./templates.ts"

const props = defineProps<{ id: number }>()

const { data: template, isFetching: loading } = useFetch(
  `/api/templates/${props.id}`,
  { initialData: [] }
).json<Template>()

const initialDataJson = localStorage.getItem("data")
const data = ref(initialDataJson ? JSON.parse(initialDataJson) : {})

const {
  execute: renderTemplate,
  data: renderedData,
  isFetching: rendering,
} = useFetch(`/api/templates/${props.id}/render`, {
  immediate: false,
  afterFetch(ctx) {
    localStorage.setItem("data", JSON.stringify(data.value))

    return ctx
  },
})
  .post(() => ({ data: data.value }))
  .json<{ html: string; text: string }>()

function resetData() {
  localStorage.removeItem("data")
  data.value = {}
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <nav aria-label="breadcrumb">
    <ul>
      <li><RouterLink :to="{ name: 'templates' }">Templates</RouterLink></li>
      <li>Template {{ id }}</li>
    </ul>
  </nav>

  <h1>Template {{ id }}</h1>

  <span v-if="loading" aria-busy="true">Fetching template…</span>

  <template v-else-if="template">
    <section>
      <h2>Preview</h2>
      <article>
        <img :src="template.previewUrl" alt="Template preview" />
      </article>
    </section>

    <section>
      <h2>Generate</h2>
      <form @submit.prevent="renderTemplate()">
        <fieldset>
          <label>
            Name
            <input
              v-model="data.name"
              placeholder="John Doe"
              autocomplete="name"
            />
          </label>

          <label>
            Company
            <input
              v-model="data.company"
              placeholder="ACME Inc."
              autocomplete="organization"
            />
          </label>

          <label>
            Job Title
            <input
              v-model="data.jobTitle"
              placeholder="CEO"
              autocomplete="organization-title"
            />
          </label>

          <label>
            Company Logo
            <input
              v-model="data.companyLogo"
              type="url"
              placeholder="https://example.com/logo.jpg"
              autocomplete="photo"
            />
          </label>

          <label>
            Website
            <input
              v-model="data.website"
              type="url"
              placeholder="https://example.com"
              autocomplete="url"
            />
          </label>

          <label>
            Email
            <input
              v-model="data.email"
              type="email"
              placeholder="john.doe@example.com"
              autocomplete="email"
            />
          </label>

          <label>
            Phone
            <input
              v-model="data.phone"
              type="tel"
              placeholder="123-456-7890"
              autocomplete="tel"
            />
          </label>

          <label>
            Address
            <input
              v-model="data.address"
              placeholder="123 Main St, Springfield, IL 62701"
              autocomplete="street-address"
            />
          </label>

          <label>
            Avatar
            <input
              v-model="data.avatar"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              autocomplete="photo"
            />
          </label>
        </fieldset>

        <div class="grid">
          <button type="submit" :aria-busy="rendering">Generate</button>
          <button type="reset" @click="resetData">Reset</button>
        </div>
      </form>
    </section>

    <section v-if="renderedData">
      <h2>Result</h2>

      <h3>HTML</h3>
      <pre>{{ renderedData.html }}</pre>
      <button @click="copyText(renderedData.html)">Copy</button>

      <h3>Text</h3>
      <pre>{{ renderedData.text }}</pre>
      <button @click="copyText(renderedData.text)">Copy</button>
    </section>
  </template>
</template>

<style scoped>
pre {
  max-height: 500px;
}
</style>
