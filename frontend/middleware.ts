import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv, isPublicPath } from '@/lib/supabase/env'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const env = getSupabasePublicEnv()

  if (!env) {
    if (isPublicPath(pathname)) return NextResponse.next()
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    return NextResponse.redirect(login)
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/brands'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.headers.getSetCookie().forEach((cookie) => {
        redirectResponse.headers.append('set-cookie', cookie)
      })
      return redirectResponse
    }

    if (!user && !isPublicPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.headers.getSetCookie().forEach((cookie) => {
        redirectResponse.headers.append('set-cookie', cookie)
      })
      return redirectResponse
    }

    return supabaseResponse
  } catch (error) {
    console.error('middleware supabase failed', error)
    if (isPublicPath(pathname)) return NextResponse.next()
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    return NextResponse.redirect(login)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
