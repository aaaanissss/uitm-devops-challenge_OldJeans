import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filename) {
  const p = path.join(process.cwd(), filename)
  if (!fs.existsSync(p)) return

  const content = fs.readFileSync(p, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    // remove surrounding quotes if any
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // don't override existing env vars
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

// Load Next.js-style env files for this Node script
loadEnvFile('.env.local')
loadEnvFile('.env')

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL

if (!API_BASE_URL) {
  console.error(
    '[generate-static-ids] Missing NEXT_PUBLIC_API_BASE_URL (or API_BASE_URL).'
  )
  process.exit(1)
}

async function main() {
  console.log('[generate-static-ids] Using API_BASE_URL:', API_BASE_URL)

  const url = `${API_BASE_URL}/properties?page=1&limit=10000`
  const res = await fetch(url, { headers: { accept: 'application/json' } })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[generate-static-ids] Request failed:', res.status, text)
    process.exit(1)
  }

  const json = await res.json()

  // Adjust this if your backend response shape differs
  const properties = json?.data?.properties ?? json?.data ?? []
  const ids = properties.map((p) => p?.id).filter(Boolean)

  const outPath = path.join(process.cwd(), 'data', 'static-property-ids.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(ids, null, 2), 'utf8')

  console.log(`[generate-static-ids] Wrote ${ids.length} ids -> ${outPath}`)
}

main().catch((err) => {
  console.error('[generate-static-ids] Error:', err)
  process.exit(1)
})
