import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/is-admin'

// Server-side operator gate. Admin API routes still enforce ADMIN_EMAILS.
// This only hides the UI. notFound() avoids leaking that /admin exists.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    notFound()
  }

  return <>{children}</>
}