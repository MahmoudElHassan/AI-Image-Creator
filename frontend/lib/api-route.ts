import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getBackendOrigin, backendUrl } from '@/lib/server-api-url'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message, request_id: crypto.randomUUID() } },
    { status },
  )
}

function isLoopbackBackend(): boolean {
  try {
    const host = new URL(getBackendOrigin()).hostname
    return host === '127.0.0.1' || host === 'localhost' || host === '::1'
  } catch {
    return true
  }
}

/** Vercel has no FastAPI. Use Supabase RLS for brand/kit/me when the rewrite target is loopback. */
export function shouldUseNativeApi(): boolean {
  return Boolean(process.env.VERCEL) && isLoopbackBackend()
}

export async function getAuthedSupabase(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User } | { response: NextResponse }> {
  const env = getSupabasePublicEnv()
  if (!env) {
    return {
      response: jsonError(
        503,
        'CONFIG_ERROR',
        'Supabase public env is missing or invalid.',
      ),
    }
  }

  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return {
      response: jsonError(401, 'AUTHENTICATION_REQUIRED', 'Missing authentication credentials'),
    }
  }

  const supabase = createClient(env.url, env.key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { response: jsonError(401, 'INVALID_TOKEN', 'Invalid or expired token') }
  }
  return { supabase, user: data.user }
}

export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  timeoutMs = 30_000,
) {
  if (process.env.VERCEL && isLoopbackBackend()) {
    return jsonError(
      503,
      'BACKEND_REQUIRED',
      'This action needs the Python API (keys, generate, or admin). Deploy the Docker app on Render, or set NEXT_SERVER_API_URL to that service and redeploy.',
    )
  }

  const path = backendPath.startsWith('/') ? backendPath : `/${backendPath}`
  const url = `${backendUrl(path)}${request.nextUrl.search}`
  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('Authorization', auth)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const method = request.method
  const hasBody = method !== 'GET' && method !== 'HEAD'
  try {
    const upstream = await fetch(url, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    return jsonError(
      isTimeout ? 504 : 502,
      isTimeout ? 'GATEWAY_TIMEOUT' : 'BACKEND_UNREACHABLE',
      isTimeout
        ? 'The request took too long to complete. Please try again.'
        : 'Could not reach the API service.',
    )
  }
}
