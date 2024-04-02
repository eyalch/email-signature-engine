import { Redis } from "ioredis"

export const BULK_RENDER_QUEUE = "bulk_render"
export const BULK_RENDER_RESULTS_QUEUE = "bulk_render_results"

const redisUrl = process.env["REDIS_URL"]
if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is required")
}

export const redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
