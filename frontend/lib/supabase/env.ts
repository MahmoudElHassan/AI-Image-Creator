/** Shared checks so middleware and Server Components do not crash on Vercel. */

function isPlaceholderSupabaseUrl(url: string): boolean {
  return (
    /[<>]/.test(url) ||
    url.includes('project-ref') ||
    url.includes('your-project')
  )
}

export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
  if (!url || !key) return null
  if (isPlaceholderSupabaseUrl(url)) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (!parsed.hostname) return null
    return { url, key }
  } catch {
    return null
  }
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth/')
  )
}
