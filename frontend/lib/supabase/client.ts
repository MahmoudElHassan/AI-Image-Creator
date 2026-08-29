import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export function createClient() {
  const env = getSupabasePublicEnv()
  if (!env) {
    throw new Error(
      'Supabase public env is missing or invalid. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return createBrowserClient(env.url, env.key)
}
