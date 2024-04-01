import fs from "node:fs/promises"

import Handlebars from "handlebars"
import { LRUCache } from "lru-cache"
import { z } from "zod"

const templateMetadataSchema = z.object({
  id: z.number(),
  htmlTemplatePath: z.string(),
  textTemplatePath: z.string(),
})

type TemplateMetadata = z.infer<typeof templateMetadataSchema>

const templatesMetadata = new LRUCache<
  "metadata",
  Record<string, TemplateMetadata>
>({
  max: 1,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: true,
  fetchMethod: async (_key, _staleValue, { signal }) => {
    const metadataJson = await fs.readFile("templates/metadata.json", {
      encoding: "utf8",
      signal,
    })

    return z
      .record(z.string(), templateMetadataSchema)
      .parse(JSON.parse(metadataJson))
  },
})

export async function getTemplatesMetadata(signal?: AbortSignal) {
  const metadata = await templatesMetadata.fetch("metadata", { signal })

  if (!metadata) {
    throw new Error("No templates found")
  }

  return metadata
}

export async function getTemplatesWithPreview(previewsBaseUrl: string) {
  const metadata = await getTemplatesMetadata()

  return Object.keys(metadata).map((id) => ({
    id: Number(id),
    previewUrl: `${previewsBaseUrl}/template_${id}.png`,
  }))
}

function compileTemplate(rawHtmlTemplate: string, rawTextTemplate: string) {
  return {
    htmlTemplate: Handlebars.compile(rawHtmlTemplate),
    textTemplate: Handlebars.compile(rawTextTemplate),
  }
}

const compiledTemplates = new LRUCache<
  string,
  ReturnType<typeof compileTemplate>
>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: true,
  fetchMethod: async (id, _staleValue, { signal }) => {
    const metadata = await getTemplatesMetadata(signal)

    const templateMetadata = metadata[id]

    if (!templateMetadata) {
      throw new Error(`Template with ID ${id} not found`)
    }

    const [rawHtmlTemplate, rawTextTemplate] = await Promise.all([
      fs.readFile(`templates/${templateMetadata.htmlTemplatePath}`, {
        encoding: "utf8",
        signal,
      }),
      fs.readFile(`templates/${templateMetadata.textTemplatePath}`, {
        encoding: "utf8",
        signal,
      }),
    ])

    return compileTemplate(rawHtmlTemplate, rawTextTemplate)
  },
})

// TODO: Cache rendered templates
export async function renderTemplate(
  id: string,
  data: Record<string, unknown>
) {
  const compiled = await compiledTemplates.fetch(id)

  if (!compiled) {
    throw new Error(`Template with ID ${id} not found`)
  }

  return {
    html: compiled.htmlTemplate(data),
    text: compiled.textTemplate(data),
  }
}
