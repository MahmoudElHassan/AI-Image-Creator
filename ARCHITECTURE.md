# Architecture

The single FastAPI process exposes the API. The Next.js App Router renders the UI and proxies `/api/*` to the same FastAPI process via `next.config.mjs` rewrites.

## Route map

| FastAPI path | UI route | Notes |
|---|---|---|
| `GET /health` | — | Liveness probe; no auth. |
| `GET /me`, `PATCH /me` | `/account` | Current user + profile updates. |
| `GET /admin/stats` | `/admin` | Read-only totals, status and provider breakdowns. Requires `ADMIN_EMAILS`. |
| `GET /admin/brands` | `/admin` | Paged brand list for operators. Requires `ADMIN_EMAILS`. |
| `GET /brands`, `POST /brands` | `/brands` | Brand list + create. |
| `GET /brands/{id}` | `/{brandId}` | Brand detail (drives the generator page). |
| `PATCH /brands/{id}` | `/{brandId}/settings` | Rename. |
| `DELETE /brands/{id}` | `/{brandId}/settings` | Hard delete (cascades generations, logo, vault secrets). |
| `POST /brands/{id}/logo` | `/{brandId}/settings` | Logo upload (5 MB cap, PNG/JPEG/WEBP). |
| `DELETE /brands/{id}/logo` | `/{brandId}/settings` | Logo remove. |
| `GET /brands/{id}/keys`, `POST /brands/{id}/keys` | `/{brandId}/keys` | List / add a provider key. |
| `POST /brands/{id}/keys/{kid}/validate` | `/{brandId}/keys` | Validate a key against the provider. |
| `PATCH /brands/{id}/keys/{kid}/activate` | `/{brandId}/keys` | Mark a key active for its provider. |
| `DELETE /brands/{id}/keys/{kid}` | `/{brandId}/keys` | Delete (also removes the Vault secret). |
| `GET /brands/{id}/kit`, `PUT /brands/{id}/kit` | `/{brandId}/kit` | Read / write the brand kit. |
| `POST /brands/{id}/generate` | `/{brandId}` | Synchronous generate. |
| `GET /brands/{id}/generations` | `/{brandId}/history` | Paged history. |
| `GET /brands/{id}/generations/{gid}` | `/{brandId}/history/{gid}` | Single-asset detail. |
| `DELETE /brands/{id}/generations/{gid}` | `/{brandId}/history` | Hard delete (storage then DB row). |

## Cookie session, Bearer JWT, and JWKS

The frontend is a normal Next.js app. It uses `@supabase/ssr` to keep a
Supabase auth cookie session for the browser user — that cookie is what
powers the `/login` / `/signup` flow and the `(dashboard)/layout.tsx` /
`[brandId]/layout.tsx` server-side `getUser()` calls.

When the frontend needs to call the FastAPI backend, the browser sends
`Authorization: Bearer <access_token>` (the same Supabase JWT) in the
fetch headers. The backend does NOT trust that token directly; it pulls the
signing key from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (JWKS,
RS256 / ES256) and verifies `iss`, `aud`, and the expiry. The JWKS client is
cached with a 1-hour TTL. If JWKS or network fails, the token is rejected
with a 401 `INVALID_TOKEN` envelope — never a 500.

Three principals, three lifecycles:

- **Browser cookie session** — short-lived, owned by `@supabase/ssr`. Used
  for Server Components in the App Router.
- **Bearer JWT to the backend** — the same Supabase access token. The
  backend re-verifies it against JWKS on every request.
- **Service-role key** — `SUPABASE_SECRET_KEY`. Lives only in the backend
  environment. Used for every Supabase read/write. Never reaches the
  browser; never appears in a frontend env file.