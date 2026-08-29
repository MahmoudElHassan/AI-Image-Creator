import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { Landing } from '@/components/marketing/landing'

export default async function Home() {
  try {
    if (getSupabasePublicEnv()) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        redirect('/brands')
      }
    }
  } catch (error) {
    // redirect() throws; do not swallow it.
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    // Missing or unreachable Supabase must not 500 the public landing (Vercel).
  }

  return <Landing />
}