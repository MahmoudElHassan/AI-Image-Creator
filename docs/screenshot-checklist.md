# Screenshot checklist

Capture these PNGs (or WebP) after the Phase 06 seed has populated a fictional brand. Do **not** use a real customer brand, real keys, or any user-uploaded logo that contains private information.

| # | File | Route | Viewport | Notes |
|---|------|-------|----------|-------|
| 1 | `docs/screenshots/01-landing-desktop.png` | `/` logged out | 1440×900 | hero + petrol panel visible |
| 2 | `docs/screenshots/01-landing-mobile.png` | `/` logged out | 390×844 | mobile hero, no overflow |
| 3 | `docs/screenshots/02-generate-desktop.png` | `/{brandId}` | 1440×900 | empty or done canvas; no real PII; key_hint visible only if a key exists |
| 4 | `docs/screenshots/03-kit-desktop.png` | `/{brandId}/kit` | 1440×900 | kit interview filled in |
| 5 | `docs/screenshots/04-history-desktop.png` | `/{brandId}/history` | 1440×900 | mix of `succeeded` and `failed` |
| 6 | `docs/screenshots/05-keys-desktop.png` | `/{brandId}/keys` | 1440×900 | `••••1234` key_hint only; never full keys |
| 7 | `docs/screenshots/06-admin-desktop.png` | `/admin` | 1440×900 | operator only; stats + brands table |
| 8 | `docs/screenshots/07-login-desktop.png` | `/login` | 1440×900 | petrol auth shell |

## Capture status

Public pages were captured locally (logged-out, dummy Supabase URL, no PII):

- `01-landing-desktop.png`
- `01-landing-mobile.png`
- `07-login-desktop.png`

Studio shots (`02`–`06`) require the seeded `demo@basar.example` session. Re-run after seed:

```bash
cd frontend
CAPTURE=1 DEMO_EMAIL=demo@basar.example DEMO_PASSWORD='…from password manager…' npm run screenshots
```

Do not commit the password. Compress PNGs before committing (`pngquant`, `cwebp`, or Pillow `optimize=True`).

- **Fictional brand only.** Northwind Coffee (or whatever Phase 06 seeds).
- **No API keys.** Cover or blur the key field; never paste a real secret.
- **Compress.** Run through `pngquant` / `cwebp` before committing — the README is read on slow connections.
- **Capture after Phase 06 seed.** The studio, kit, history, keys, and admin screenshots are meaningless without data.
- **Match viewport.** Desktop captures at 1440×900; mobile at 390×844 (iPhone 14 class). Don't mix.
- **No real customer art.** Generated images in `succeeded` cards must be from the seed.
- **No PII.** Redact email addresses if they appear in the operator UI.