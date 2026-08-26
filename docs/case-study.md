# Case study

## Problem

Small-team founders and indie designers keep their brand in their head, in a
Notion doc, or in a Pinterest board. When they need an Instagram post, they
open an image tool, paste a prompt, get something generic, and re-do it because
the colors or tone don't match the brand. The loop is slow, the output is
inconsistent, and the brand's kit lives nowhere the tool can see it.

## Constraints

- **Bring your own keys.** No provider relationship on our side — every brand
  brings its own OpenAI or Gemini key, and we never proxy billing.
- **Brand tenancy is hard.** Every row must be owned by a Supabase auth user;
  no leakage between brands, no shared keys.
- **No billing.** Open-source demo. No quotas, no per-call metering, no Stripe.
- **PNG only.** Resize to preset, watermark if requested, store under a UUID
  path; no animated output, no SVG.

## Five decisions

1. **JWKS, not HS256.** Tokens come from Supabase Auth; the backend fetches
   the signing key from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
   (RS256 / ES256). No shared secret on the server side; rotating keys
   doesn't redeploy the app.
2. **Service-role key is god-mode.** Only the backend process holds
   `SUPABASE_SECRET_KEY`. The frontend holds the publishable (anon) key and
   relies on row-level ownership checks enforced in every router before
   touching Supabase.
3. **Vault RPCs are `service_role` only.** Provider keys live in Supabase
   Vault; read / write happens through `insert_vault_secret` /
   `read_vault_secret` / `delete_vault_secret` RPC wrappers, which refuse to
   run for the anon role. A leaked publishable key still can't extract a
   provider key.
4. **Public storage + UUID paths.** Generated images and uploaded logos live
   under `brands/<uuid>/…`. The bucket is public; the UUID is the access
   control. There is no listing endpoint — guessability is the perimeter.
5. **Synchronous generate + post-process + watermark.** The route inserts a
   `pending` row, calls the provider, resizes the result, applies the brand
   watermark if requested, uploads the PNG, and flips the row to
   `succeeded` — all in a single request. We can revisit this in Phase 07+.

## Generation pipeline

1. **Compose prompt** — `compose_full_prompt(user_prompt, brand_context,
   platform, logo_mode, brand_has_logo)` injects the brand kit (tagline,
   tone, audience, palette, words to avoid) and the platform context
   (preset, aspect ratio) into the user prompt. The result is what hits the
   provider.
2. **Provider call** — `openai_generate` or `gemini_generate`, each wrapped
   in a 120 s `asyncio.wait_for`. Provider errors (4xx / 5xx / network /
   timeout) are classified into user-facing codes (`INVALID_KEY`,
   `RATE_LIMITED`, `CONTENT_POLICY`, `TIMEOUT`, `NETWORK`,
   `PROVIDER_CLIENT_ERROR`, `PROVIDER_SERVER_ERROR`).
3. **Resize to preset** — `resize_to_preset` re-encodes to the exact
   `width × height` for the platform. PIL downscaling + center-crop.
4. **Watermark** — if `logo_mode` is `watermark` or `both`, the brand logo
   is overlaid at the corner.
5. **Storage** — `image_path = brands/<brandId>/generations/<uuid>.png`,
   upsert to `brand-assets` (public bucket).
6. **DB row** — `generations.status` flips to `succeeded` with
   `provider_request_id` and `image_path`. A non-fatal best-effort updates
   `provider_keys.last_used_at`.

The row's `status` is the single source of truth: `pending` → `processing`
→ `succeeded` / `failed`. If the request handler returns or raises an error
before the row reaches a terminal state, an `except ProviderError` /
`except HTTPException` / `except Exception` block in the same try flips the
row to `failed` with the code that produced the response — vault failures
surface as `VAULT_ERROR`, provider failures as their classified code,
anything else as `INTERNAL_ERROR`.

## What is next

Backlog only — none of this is implemented in this repo:

- **Signed URLs.** Move from public storage to short-lived signed URLs and a
  private bucket. Requires migration `00011` successors and an update to
  every `image_url` builder.
- **Worker queue.** Move the provider call off the request thread. Add a
  `jobs` table, an outbox, and a worker process; the route inserts the job
  and returns `202 Accepted`.
- **Stuck-row sweeper.** A periodic job that flips `processing` rows older
  than the timeout to `failed` so the history list never shows zombies
  after a crash.
- **Email confirmation.** Reject tokens whose `email_confirmed_at` is null.

## Note on spec numbering

There is no `specs/007-*` directory. `006-generation` was followed directly
by `008-generation-history` because `007` was reserved and never written.
History is feature `008`.