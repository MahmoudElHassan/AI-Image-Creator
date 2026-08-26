import Link from 'next/link'
import { Palette, ImagePlus, KeyRound, History } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BEATS = [
  {
    icon: Palette,
    title: 'Brand kit',
    body: 'A short interview captures your tagline, tone, palette, and words to avoid. Edit any time.',
  },
  {
    icon: ImagePlus,
    title: 'Generate',
    body: 'Pick a platform preset, write a prompt, choose OpenAI or Gemini. Sized correctly the first time.',
  },
  {
    icon: History,
    title: 'History',
    body: 'Every generation lives in a single scroll, with filters, downloads, and a per-asset delete.',
  },
]

const STACK = ['Next.js 14', 'FastAPI', 'Supabase']

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="Basar home">
          <span className="font-display text-[26px] leading-none">Basar</span>
          <span className="font-display text-[20px] leading-none text-brand" aria-hidden="true">
            بَصَر
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 pb-24">
        <section className="grid gap-12 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Brand studio · public demo
            </p>
            <h1 className="mt-4 font-display text-[56px] leading-[1.05] tracking-[-0.015em] text-foreground">
              Walk into{' '}
              <em className="not-italic text-brand">your own studio.</em>
            </h1>
            <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.55] text-muted-foreground">
              Basar remembers your brand — kit, colors, tone — and hands back
              platform-ready images. Bring your own OpenAI or Gemini key. Every
              asset is sized correctly the first time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          </div>
          <aside
            className="rounded-xl p-8 text-[#F8FAFC]"
            style={{
              background:
                'radial-gradient(130% 90% at 18% 8%, rgba(30,110,130,.42), transparent 55%), #0C1520',
            }}
          >
            <p className="font-display text-[34px] leading-[1.1]">
              A studio that{' '}
              <em className="not-italic text-[#6FB2C0]">holds your brand</em> between generations.
            </p>
            <ul className="mt-6 space-y-3 text-[14px] text-[#CBD5E1]">
              <li className="flex items-baseline gap-2">
                <Palette className="h-4 w-4 shrink-0 text-[#6FB2C0]" />
                <span>Brand kit, palette, tone — remembered.</span>
              </li>
              <li className="flex items-baseline gap-2">
                <ImagePlus className="h-4 w-4 shrink-0 text-[#6FB2C0]" />
                <span>Every preset, sized correctly.</span>
              </li>
              <li className="flex items-baseline gap-2">
                <KeyRound className="h-4 w-4 shrink-0 text-[#6FB2C0]" />
                <span>Bring your own OpenAI or Gemini key.</span>
              </li>
            </ul>
          </aside>
        </section>

        <section className="mt-24">
          <p className="text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            The three beats
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {BEATS.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-card p-5 shadow-xs"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-weak text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="mt-4 font-display text-[22px] leading-tight">
                  {title}
                </h2>
                <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-6 rounded-lg border border-border bg-card p-8 shadow-xs md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Bring your own keys
            </p>
            <h2 className="mt-2 font-display text-[28px] leading-tight">
              OpenAI and Gemini, server-side only.
            </h2>
            <p className="mt-3 text-[14px] leading-[1.55] text-muted-foreground">
              Paste your key once. It is stored encrypted in a server-side vault
              and never reaches the browser. Switch providers per brand.
            </p>
          </div>
          <ul className="space-y-2 text-[14px]">
            <li className="flex items-center justify-between rounded-md border border-border-subtle px-4 py-3">
              <span>OpenAI · image generation</span>
              <span className="font-mono text-[12px] text-muted-foreground">gpt-image-1</span>
            </li>
            <li className="flex items-center justify-between rounded-md border border-border-subtle px-4 py-3">
              <span>Gemini · image generation</span>
              <span className="font-mono text-[12px] text-muted-foreground">gemini-2.5-flash-image</span>
            </li>
          </ul>
        </section>

        <section className="mt-24 text-center">
          <p className="text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            Stack
          </p>
          <p className="mt-3 text-[15px] text-muted-foreground">
            {STACK.map((s, i) => (
              <span key={s}>
                <span className="font-medium text-foreground">{s}</span>
                {i < STACK.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Log in to the studio</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Create an account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-3 px-6 py-6 text-[13px] text-muted-foreground md:flex-row md:items-center">
          <p>
            <span className="font-medium text-foreground">Demo data is fictional.</span>{' '}
            Every brand, key, and image on this deployment is synthetic.
          </p>
          <a
            href="#"
            className="text-foreground underline-offset-2 hover:text-brand hover:underline"
            aria-label="GitHub (link placeholder, replaced in Phase 07)"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}