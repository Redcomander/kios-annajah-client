import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.resolve(__dirname, '..')
const backendRoot = path.resolve(clientRoot, '..', 'kios-annajah-backend')
const outputDir = path.join(clientRoot, 'build', 'backend')

const goosMap = {
  win32: 'windows',
  darwin: 'darwin',
  linux: 'linux',
}

const goarchMap = {
  x64: 'amd64',
  arm64: 'arm64',
}

const goos = goosMap[process.platform]
const goarch = goarchMap[process.arch]

if (!goos || !goarch) {
  throw new Error(`Unsupported build platform: ${process.platform}/${process.arch}`)
}

fs.mkdirSync(outputDir, { recursive: true })

const outputFileName = process.platform === 'win32' ? 'kasir-backend.exe' : 'kasir-backend'
const outputPath = path.join(outputDir, outputFileName)

execFileSync('go', ['build', '-o', outputPath, '.'], {
  cwd: backendRoot,
  env: {
    ...process.env,
    CGO_ENABLED: '0',
    GOOS: goos,
    GOARCH: goarch,
  },
  stdio: 'inherit',
})

console.log(`Built backend binary at ${outputPath}`)