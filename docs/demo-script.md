# Demo script

A 90-second talk track for showing Basar to a stakeholder. Numbered, one sentence per beat. Replace the demo account password with whatever was set at publish — never commit it.

1. Open `/` — this is the public studio pitch: a single petrol hero, three beats (Brand kit → Generate → History), and a call to log in.
2. Log in with the demo account (`demo@basar.example`, password set at publish) — the `/login` page uses the same auth-shell tokens, so the visual transition into the dashboard is one page.
3. Land on `/brands` — the seeded brand is **Northwind Coffee** (or whichever brand Phase 06 seeded); the logo path is visible only if a logo was uploaded during seeding.
4. Open the brand kit — show how tagline, tone, audience, palette, and words-to-avoid are remembered; every later generation reuses this kit without re-entering it.
5. Move to the generate page — preset frames, prompt box, and the BYOK notice if no provider key is configured for this brand yet.
6. Switch to history — show the mix of `succeeded` and `failed` cards and the download action; the list is paged and filterable by provider / status / preset.
7. If the operator role is present, open `/admin` — read-only totals, status and provider breakdowns, and a paged brand list.
8. Stop here — do not click Generate live unless a real BYOK key is configured for this account.

## If asked

- **Where do the keys live?** In Supabase Vault, behind `service_role`-only RPC wrappers — they never reach the browser after they are saved.
- **What about cost?** OpenAI and Gemini bill the brand owner directly; Basar does not proxy billing and never sees a card.
- **What about scale?** The pipeline is synchronous today (request → provider → resize → watermark → store → row); moving it to a worker queue is on the backlog.
- **What's fake?** Every brand, key, and image on the demo deployment is synthetic. The footer on `/` says so.