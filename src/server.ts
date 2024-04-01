import Fastify from "fastify"
import fastifyGracefulShutdown from "fastify-graceful-shutdown"

import { getTemplatesWithPreview } from "./templates.js"

const previewsBaseUrl = process.env["PREVIEWS_BASE_URL"]
if (!previewsBaseUrl) {
  throw new Error("PREVIEWS_BASE_URL environment variable is required")
}

const fastify = Fastify({ logger: true })

fastify.register(fastifyGracefulShutdown)

fastify.get("/templates", () => {
  return getTemplatesWithPreview(previewsBaseUrl)
})

try {
  await fastify.listen({
    port: Number(process.env["PORT"]) || 3000,
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
