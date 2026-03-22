const envBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const normalizedBaseUrl = (envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : 'http://localhost:3000').replace(/\/$/, '')
const desktopLocalCandidates = ['http://127.0.0.1:3000', 'http://localhost:3000']
const apiStorageKey = 'kios-annajah.api-base-url'

export const API_BASE_URL = normalizedBaseUrl
export const ENABLE_POS = (import.meta.env.VITE_ENABLE_POS as string | undefined) !== 'false'

let runtimeApiBaseUrl = normalizedBaseUrl
let runtimeApiSourceLabel = normalizedBaseUrl.includes('localhost') || normalizedBaseUrl.includes('127.0.0.1')
  ? 'Desktop Local'
  : 'Online API'

const isBrowser = typeof window !== 'undefined'

function dedupeUrls(urls: string[]) {
  return [...new Set(urls.map((url) => url.replace(/\/$/, '')).filter(Boolean))]
}

function detectApiSourceLabel(baseUrl: string) {
  return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'Desktop Local' : 'Online API'
}

async function canReachApi(baseUrl: string) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
    })

    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function initializeApiBaseUrl() {
  if (!isBrowser) {
    return runtimeApiBaseUrl
  }

  const storedBaseUrl = window.localStorage.getItem(apiStorageKey)?.trim()
  const candidates = dedupeUrls([
    ...(storedBaseUrl ? [storedBaseUrl] : []),
    ...(!ENABLE_POS ? desktopLocalCandidates : []),
    normalizedBaseUrl,
  ])

  for (const candidate of candidates) {
    if (await canReachApi(candidate)) {
      runtimeApiBaseUrl = candidate
      runtimeApiSourceLabel = detectApiSourceLabel(candidate)
      window.localStorage.setItem(apiStorageKey, candidate)
      return runtimeApiBaseUrl
    }
  }

  runtimeApiBaseUrl = normalizedBaseUrl
  runtimeApiSourceLabel = detectApiSourceLabel(normalizedBaseUrl)
  return runtimeApiBaseUrl
}

export function getApiBaseUrl() {
  return runtimeApiBaseUrl
}

export function getApiSourceLabel() {
  return runtimeApiSourceLabel
}

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${runtimeApiBaseUrl}${normalizedPath}`
}

export const buildAssetUrl = (path?: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return buildApiUrl(path)
}
