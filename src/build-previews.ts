import fs from "node:fs/promises"

import puppeteer, { Browser } from "puppeteer"

import { getTemplatesMetadata, renderTemplate } from "./templates.js"

const sampleData = {
  name: "John Doe",
  company: "Example Corp",
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

await fs.mkdir("previews", { recursive: true })

const browser = await puppeteer.launch()

const metadata = await getTemplatesMetadata()

for (const id of Object.keys(metadata)) {
  console.log(`Generating HTML preview for template ${id}`)

  const { html } = await renderTemplate(id, sampleData)

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
