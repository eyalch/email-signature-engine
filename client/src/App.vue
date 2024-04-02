<script setup lang="ts"></script>

<template>
  <header>
    <nav>
      <ul>
        <li>
          <strong>Email Signature Engine</strong>
        </li>
        <li>
          <RouterLink :to="{ name: 'templates' }">Templates</RouterLink>
        </li>
      </ul>
    </nav>
  </header>

  <main>
    <RouterView></RouterView>
  </main>
</template>
