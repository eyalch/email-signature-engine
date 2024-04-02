import Fastify, { FastifyRequest } from "fastify"
import fastifyGracefulShutdown from "fastify-graceful-shutdown"
import { z } from "zod"

import {
  getTemplateMetadata,
  getTemplateWithPreviewUrl,
  getTemplatesWithPreview,
  renderTemplate,
} from "./templates.js"

const previewsBaseUrl = process.env["PREVIEWS_BASE_URL"]
if (!previewsBaseUrl) {
  throw new Error("PREVIEWS_BASE_URL environment variable is required")
}

const fastify = Fastify({ logger: true })

fastify.register(fastifyGracefulShutdown)

fastify.get("/templates", () => {
  return getTemplatesWithPreview(previewsBaseUrl)
})

fastify.register(
  async (instance) => {
    type RequestWithTemplateMetadata = FastifyRequest & {
      templateMetadata?: Required<
        Awaited<ReturnType<typeof getTemplateMetadata>>
      >
    }

    instance.decorateRequest("templateMetadata")

    instance.addHook(
      "preHandler",
      async (request: RequestWithTemplateMetadata, reply) => {
        const params = z.object({ id: z.coerce.number() }).parse(request.params)

        const templateMetadata = await getTemplateMetadata(params.id)

        if (!templateMetadata) {
          reply.status(404)
          return { error: "Template not found" }
        }

        request.templateMetadata = templateMetadata
        return
      }
    )

    instance.get("", async (request: RequestWithTemplateMetadata) => {
      const templateMetadata = request.templateMetadata!

      return getTemplateWithPreviewUrl(templateMetadata, previewsBaseUrl)
    })

    instance.post("/render", async (request: RequestWithTemplateMetadata) => {
      const templateMetadata = request.templateMetadata!

      const body = z.object({ data: z.record(z.unknown()) }).parse(request.body)

      return renderTemplate(templateMetadata.id, body.data)
    })
  },
  { prefix: "/templates/:id" }
)

try {
  await fastify.listen({
    port: Number(process.env["PORT"]) || 3000,
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
