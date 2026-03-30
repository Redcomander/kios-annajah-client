import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const releasesDir = path.resolve(__dirname, '../../releases')
const dryRun = process.env.DRY_RUN === '1'

const releaseFilePattern = /^Kios An-Najah-Setup-.*\.(exe|blockmap)$/i
const releaseZipPattern = /^Kios-An-Najah-v.*-release\.zip$/i
const extraFiles = new Set(['latest.yml', 'builder-debug.yml', 'builder-effective-config.yaml'])
const removableDirs = new Set(['win-unpacked'])

async function removePath(targetPath) {
  if (dryRun) {
    console.log(`[dry-run] remove ${targetPath}`)
    return
  }

  await fs.rm(targetPath, { recursive: true, force: true })
  console.log(`[clean-releases] removed ${targetPath}`)
}

async function main() {
  try {
    const entries = await fs.readdir(releasesDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(releasesDir, entry.name)

      if (entry.isDirectory()) {
        if (removableDirs.has(entry.name)) {
          await removePath(fullPath)
        }
        continue
      }

      const shouldRemove =
        releaseFilePattern.test(entry.name) ||
        releaseZipPattern.test(entry.name) ||
        extraFiles.has(entry.name)

      if (shouldRemove) {
        await removePath(fullPath)
      }
    }

    console.log('[clean-releases] done')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.log('[clean-releases] releases directory does not exist yet, skipping')
      return
    }
    throw error
  }
}

main()
