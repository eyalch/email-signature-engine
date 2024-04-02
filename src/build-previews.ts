import fs from "node:fs/promises"

import puppeteer, { Browser } from "puppeteer"

import { getTemplatesMetadata, renderTemplate } from "./templates.js"

await fs.mkdir("previews", { recursive: true })

const browser = await puppeteer.launch({
  args: [process.env["PREVIEWS_PUPPETEER_NO_SANDBOX"] ? "--no-sandbox" : ""],
})

const metadata = await getTemplatesMetadata()

for (const { id } of Object.values(metadata)) {
  console.log(`Generating HTML preview for template ${id}`)

  const { html } = await renderTemplate(id, {})

  await saveHtmlPreview(browser, html, `previews/template_${id}.png`)
}

await browser.close()

async function saveHtmlPreview(browser: Browser, html: string, path: string) {
  const page = await browser.newPage()

  // For some reason, without `networkidle0`, the screenshot is taken with
  // invisible text.
  await page.setContent(html, { waitUntil: ["load", "networkidle0"] })

  const rootElement = await page.$("body > *")

  if (!rootElement) {
    throw new Error("No elements found in the body")
  }

  await rootElement.screenshot({ path })

  await page.close()
}
