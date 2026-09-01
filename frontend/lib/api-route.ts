import { createClient as createSupabaseJsClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getBackendOrigin, backendUrl } from '@/lib/server-api-url'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export function jsonError(
  status: number,
  code: string,
  message: string,
  logContext?: Record<string, unknown>,
) {
  const request_id = crypto.randomUUID()
  if (logContext) {
    console.error('[api-route]', { request_id, code, status, ...logContext })
  }
  return NextResponse.json(
    { error: { code, message, request_id } },
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

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

function createBearerSupabase(token: string): SupabaseClient | null {
  const env = getSupabasePublicEnv()
  if (!env) return null
  return createSupabaseJsClient(env.url, env.key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Authenticated Supabase for App Router API routes.
 * Prefers the cookie-aware SSR client (same session as server components + RLS).
 * Falls back to Authorization bearer when cookies are absent.
 */
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

  const cookieClient = await createServerSupabaseClient()
  const cookieAuth = await cookieClient.auth.getUser()
  if (cookieAuth.data.user && !cookieAuth.error) {
    return { supabase: cookieClient, user: cookieAuth.data.user }
  }

  const token = bearerToken(request)
  if (token) {
    const bearerClient = createBearerSupabase(token)
    if (!bearerClient) {
      return {
        response: jsonError(
          503,
          'CONFIG_ERROR',
          'Supabase public env is missing or invalid.',
        ),
      }
    }
    const bearerAuth = await bearerClient.auth.getUser(token)
    if (bearerAuth.data.user && !bearerAuth.error) {
      return { supabase: bearerClient, user: bearerAuth.data.user }
    }
  }

  return {
    response: jsonError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Missing or invalid authentication credentials',
      {
        cookieAuthError: cookieAuth.error?.message,
        hadBearer: Boolean(token),
      },
    ),
  }
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
      { backendPath, err: err instanceof Error ? err.message : String(err) },
    )
  }
}
