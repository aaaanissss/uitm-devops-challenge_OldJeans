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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1)

    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL

// For rents: most APIs require auth, and we DON'T have a token at build time.
// So we keep this list empty by default to avoid build failures.
const outPath = path.join(process.cwd(), 'data', 'static-rent-ids.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify([], null, 2), 'utf8')

console.log('[generate-static-rent-ids] Wrote 0 ids ->', outPath)
console.log(
  '[generate-static-rent-ids] Note: rent IDs are user-specific; keep runtime fetching in the client.'
)
console.log('[generate-static-rent-ids] API_BASE_URL:', API_BASE_URL || '(missing)')
