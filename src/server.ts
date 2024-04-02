import { Queue } from "bullmq"
import Fastify, { FastifyRequest } from "fastify"
import fastifyGracefulShutdown from "fastify-graceful-shutdown"
import { z } from "zod"

import { BULK_RENDER_QUEUE, redis } from "./queues.js"
import {
  getTemplateMetadata,
  getTemplateWithPreviewUrl,
  getTemplatesWithPreview,
  renderTemplate,
  templateDataSchema,
} from "./templates.js"

const previewsBaseUrl = process.env["PREVIEWS_BASE_URL"]
if (!previewsBaseUrl) {
  throw new Error("PREVIEWS_BASE_URL environment variable is required")
}

export const bulkRenderingQueue = new Queue(BULK_RENDER_QUEUE, {
  connection: redis,
})

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

      const body = z.object({ data: templateDataSchema }).parse(request.body)

      return renderTemplate(templateMetadata.id, body.data)
    })

    instance.post(
      "/render/bulk",
      async (request: RequestWithTemplateMetadata, reply) => {
        const templateMetadata = request.templateMetadata!

        const body = z
          .object({
            people: z.array(templateDataSchema),
            webhook_url: z.string().url().optional(),
          })
          .parse(request.body)

        await bulkRenderingQueue.add(`template ${templateMetadata.id}`, {
          template_id: templateMetadata.id,
          people: body.people,
          webhook_url: body.webhook_url,
          requested_at: new Date(),
        })

        reply.status(202)
      }
    )
  },
  { prefix: "/templates/:id" }
)

try {
  await fastify.listen({
    host: process.env["HOST"] || "localhost",
    port: Number(process.env["PORT"]) || 3000,
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
