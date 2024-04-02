import { createRouter, createWebHistory } from "vue-router"

import TemplateListView from "./TemplateListView.vue"
import TemplateView from "./TemplateView.vue"

export default createRouter({
  history: createWebHistory(),
  routes: [
    { name: "templates", path: "/templates", component: TemplateListView },
    {
      name: "template",
      path: "/templates/:id",
      component: TemplateView,
      props: (route) => ({ id: Number(route.params.id) }),
    },
  ],
})
