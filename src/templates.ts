import fs from "node:fs/promises"

import Handlebars from "handlebars"
import { LRUCache } from "lru-cache"
import { z } from "zod"

Handlebars.registerHelper("pretty_url", (value: string) => {
  const url = new URL(value)

  // Remove protocol and trailing slash
  return url.hostname + url.pathname.replace(/\/$/, "")
})

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
  const metadata = await templatesMetadata.fetch("metadata", {
    ...(signal && { signal }),
  })

  if (!metadata) {
    throw new Error("No templates found")
  }

  return metadata
}

export async function getTemplatesWithPreview(previewsBaseUrl: string) {
  const metadata = await getTemplatesMetadata()

  return Object.values(metadata).map((templateMetadata) =>
    getTemplateWithPreviewUrl(templateMetadata, previewsBaseUrl)
  )
}

export async function getTemplateMetadata(id: number, signal?: AbortSignal) {
  const metadata = await getTemplatesMetadata(signal)

  return metadata[id]
}

export function getTemplateWithPreviewUrl(
  templateMetadata: TemplateMetadata,
  previewsBaseUrl: string
) {
  return {
    id: templateMetadata.id,
    previewUrl: `${previewsBaseUrl}/template_${templateMetadata.id}.png`,
  }
}

function compileTemplate(rawHtmlTemplate: string, rawTextTemplate: string) {
  return {
    htmlTemplate: Handlebars.compile(rawHtmlTemplate),
    textTemplate: Handlebars.compile(rawTextTemplate),
  }
}

const compiledTemplates = new LRUCache<
  number,
  ReturnType<typeof compileTemplate>
>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: true,
  fetchMethod: async (id, _staleValue, { signal }) => {
    const templateMetadata = await getTemplateMetadata(id, signal)

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

const sampleData = {
  name: "John Doe",
  company: "ACME Inc.",
  company_logo:
    "https://plugin.markaimg.com/public/e755c7ae/PsiXa6VPzdPwCebvAVzyzGbvKefIjS.png",
  title: "CEO",
  email_address: "john.doe@example.com",
  phone: "123-456-7890",
  website: "https://example.com",
  address: "123 Main St, Springfield, IL 62701",
  avatar:
    "https://plugin.markaimg.com/public/e755c7ae/yNvnR5NVoTdgaEeGl3UTgn2NZ6LuiA.jpeg",
}

// TODO: Cache rendered templates
export async function renderTemplate(
  id: number,
  data: Record<string, unknown>
) {
  const compiled = await compiledTemplates.fetch(id)

  if (!compiled) {
    throw new Error(`Template with ID ${id} not found`)
  }

  const dataWithSample = { ...sampleData, ...data }

  return {
    html: compiled.htmlTemplate(dataWithSample),
    text: compiled.textTemplate(dataWithSample),
  }
}
