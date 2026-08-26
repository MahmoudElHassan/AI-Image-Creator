# CV bullets

## Six bullets

- Architected a multi-brand social-image studio on Next.js 14, FastAPI, and Supabase, with Supabase Vault for BYOK provider keys, public storage under UUID paths, and row-ownership checks on every router.
- Replaced HS256 JWT verification with JWKS-based RS256/ES256 validation, fetching keys from the Supabase JWKS endpoint and tolerating JWKS / network failures as clean 401s.
- Built a synchronous image-generation pipeline that composes a brand-kit prompt, calls OpenAI or Gemini under a 120 s timeout, classifies provider errors into user-facing codes, resizes to the chosen preset, and applies a watermark before writing to storage.
- Hardened the FastAPI backend against burst abuse with a process-local sliding-window rate limiter (per-user + per-IP) wired into the generate, key-add, and key-validate routes.
- Shipped a single-container deployment (Next.js standalone + FastAPI + tini) on Bunny Magic with TLS at the edge, CORS pinned to the host, security headers (CSP, frame-deny, no-sniff), and `NEXT_PUBLIC_SIGNUPS_ENABLED=false` for closed demos.
- Drove the build from a sequence of spec-driven feature contracts (`specs/001`–`specs/009`), with each spec listing the routes, data model, and tests that its implementation had to satisfy.

## LinkedIn blurb

I built Basar, a multi-brand social-image studio that turns a one-line prompt into a platform-ready image while keeping each brand's kit, logo, and tone consistent.

The stack is Next.js 14, FastAPI, and Supabase (Postgres, Auth, Storage, Vault), with JWKS-based JWT verification, BYOK provider keys stored encrypted in Vault RPCs, and a synchronous generate pipeline that resizes to preset and watermarks before writing to storage.

Single-container deployment on Bunny Magic, spec-driven build (`specs/001`–`specs/009`), and a closed-source-feel security posture (CSP, per-user + per-IP rate limits, signup gate) — all open source under MIT.

## Links

- Live demo: _pending — set after Bunny Magic (or equivalent) deploy_
- Source: _pending — set after the public GitHub repo exists_