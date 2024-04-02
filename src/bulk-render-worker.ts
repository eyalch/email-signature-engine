import { Queue, Worker } from "bullmq"
import { z } from "zod"

import {
  BULK_RENDER_QUEUE,
  BULK_RENDER_RESULTS_QUEUE,
  redis,
} from "./queues.js"
import { renderTemplate, templateDataSchema } from "./templates.js"

const resultsQueue = new Queue(BULK_RENDER_RESULTS_QUEUE, { connection: redis })

const bulkRenderWorker = new Worker(
  BULK_RENDER_QUEUE,
  async (job) => {
    const data = z
      .object({
        template_id: z.number(),
        people: templateDataSchema.array(),
        webhook_url: z.string().url().optional(),
      })
      .parse(job.data)

    const results = []

    for (const person of data.people) {
      const result = await renderTemplate(data.template_id, person)
      results.push(result)
    }

    const output = {
      template_id: data.template_id,
      results,
      completed_at: new Date(),
    }

    if (data.webhook_url) {
      const response = await fetch(data.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(output),
      })

      console.log(response.status, await response.text())
    } else {
      await resultsQueue.add(`template ${data.template_id} results`, output)
    }
  },
  { connection: redis }
)

const resultsWorker = new Worker(
  BULK_RENDER_RESULTS_QUEUE,
  async (job) => {
    console.log(job.data)
  },
  { connection: redis }
)

async function closeWorkers() {
  await Promise.all([bulkRenderWorker.close(), resultsWorker.close()])
}

process.on("SIGINT", closeWorkers)
process.on("SIGTERM", closeWorkers)
