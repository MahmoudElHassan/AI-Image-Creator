# Security

This document records the security posture of the demo. Each section is intentionally short.

## Public `brand-assets` bucket (UUID paths, not private)

Generated images and uploaded brand logos are written to the Supabase `brand-assets` bucket under UUID-prefixed paths (`brands/<brand-uuid>/...`). The bucket is public — the URL itself is the capability — so anyone with the URL can read the object. Objects are not listed or guessable: the brand UUID is the access control, and storage permissions do not gate reads.

## Apply migration `00011` so SVG is not allowed

Storage upload validation in the API only accepts PNG, JPEG, and WEBP. The matching storage-side rule lives in migration `00011`. Apply that migration so the bucket refuses SVGs at the storage layer too, and the client validation is not the only line of defense.

## Service-role key is god-mode; never in the frontend

The backend talks to Supabase with `SUPABASE_SECRET_KEY`, which is the service-role key and bypasses all row-level security. That key must live only in the backend's environment. The frontend must only ever see `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the anon key) and rely on RLS for access control. If the service-role key ever appears in a frontend bundle or env file, rotate it immediately.

## In-memory rate limits are per container

The rate limiter in `app/core/rate_limit.py` is a process-local sliding window. Each container (or dev process) keeps its own counters, so the effective limit per identity is `limit × replicas`. The limiter is best-effort, not a strict global quota — use it for abuse mitigation, not for billing or quota enforcement.

## Signups: `NEXT_PUBLIC_SIGNUPS_ENABLED=false` in production

The `/signup` page is gated by `NEXT_PUBLIC_SIGNUPS_ENABLED`. Set it to `false` in production builds to render a closed-state card and prevent new account creation. The backend never relied on signup gating; this is purely a frontend affordance so the demo can be opened to the public without exposing self-service registration.

## Email confirmation is not enforced by the API (by design for this demo)

JWT verification accepts unconfirmed emails. This keeps the demo easy to drive without an SMTP provider. If the demo were promoted to a real product, add an `email_confirmed` claim check in `get_current_user` and surface a "please confirm your email" UX.