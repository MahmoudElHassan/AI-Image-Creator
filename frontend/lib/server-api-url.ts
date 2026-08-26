export function getBackendOrigin(): string {
  const raw = (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_SERVER_API_URL ??
    'http://127.0.0.1:8000'
  ).replace(/\/+$/, '')
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return 'http://127.0.0.1:8000'
}

export function backendUrl(path: string): string {
  const origin = getBackendOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}