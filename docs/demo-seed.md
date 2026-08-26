# Demo seed

Manual seed for the `demo@basar.example` account. Run by hand after the migrations are applied (`supabase db push`). Do **not** run in CI; do **not** wire into any deploy automation.

The password for the demo account is **never stored in this repo**. Set it in the Supabase Dashboard when you create the user.

## 1. Create the demo auth user

In the Supabase Dashboard:

1. **Authentication → Users → Add user → Create new user**.
2. Email: `demo@basar.example`.
3. Password: pick one (or generate a random one) and **store it in your password manager**, not in the repo.
4. Confirm the email manually if your project requires it.
5. Click the user row, copy the **User UID** (a UUID). You will paste it into the seed SQL in the next step.

## 2. Replace the placeholder UUID in the seed

Open `supabase/seed_demo.sql` and find the placeholder:

```
00000000-0000-4000-8000-000000000001
```

Find-and-replace **all** occurrences with the UUID you copied in step 1. Do not touch any other UUID in the file (the brand id `11111111-…` and the six generation ids `22222222-…` are fixed).

## 3. Upload assets to the `brand-assets` bucket

The seed assumes the following objects already exist in the public `brand-assets` bucket. Upload them via **Storage → brand-assets → Upload file**:

| Storage path (in bucket) | Local file |
|---------------------------|------------|
| `brands/11111111-1111-4111-8111-111111111111/logo.png` | `docs/demo-assets/northwind-logo.png` |
| `brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222221.png` | `docs/demo-assets/gen-succeeded-1.png` |
| `brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222222.png` | `docs/demo-assets/gen-succeeded-2.png` |
| `brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222223.png` | `docs/demo-assets/gen-succeeded-1.png` (reuse allowed) |
| `brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222224.png` | `docs/demo-assets/gen-succeeded-2.png` (reuse allowed) |

Reusing the same bytes under multiple keys is fine — the SQL `CHECK` only requires the row's `image_path` to contain the row's own generation UUID, not a unique storage object.

The succeeded rows pass the database check whether or not the storage object exists, but the image_url builder will 404 at view time if the upload was skipped. The two failed rows have `image_path = NULL`, so they require no upload.

## 4. Run the seed SQL

In the Supabase Dashboard → **SQL Editor → New query**:

1. Paste the (now-edited) contents of `supabase/seed_demo.sql`.
2. Click **Run**.
3. Uncomment the sanity-check queries at the bottom of the file and run them separately. You should see:

| Query | Expected |
|-------|----------|
| `COUNT(*) FROM brands WHERE id = '11111111-…'` | 1 |
| `COUNT(*) FROM brand_kits WHERE brand_id = '11111111-…'` | 1 |
| `COUNT(*) FROM generations WHERE brand_id = '11111111-…'` | 6 |
| `COUNT(*) FROM generations WHERE brand_id = '11111111-…' AND status = 'succeeded'` | 4 |
| `COUNT(*) FROM generations WHERE brand_id = '11111111-…' AND status = 'failed'` | 2 |
| `COUNT(*) FROM provider_keys` | 0 |

The script is **idempotent**: if you run it a second time, it deletes the prior demo rows for the brand first and re-inserts them. No auth.users rows are created or deleted — those remain owned by the Dashboard.

## 5. Verify in the app

1. `make up` (or run locally).
2. Log in with `demo@basar.example` and the password you set in step 1.
3. `/brands` should list **Northwind Coffee**.
4. Click into it — the kit is filled in, history shows 4 succeeded and 2 failed cards, and the BYOK notice is shown because the seed inserts zero provider keys.
5. Add a real key to the Keys page to enable live generation; do not commit it anywhere.

## What the seed never does

- It never inserts into `auth.users`. Auth users belong to the Dashboard.
- It never inserts into `provider_keys`. BYOK is per-user; seeding a fake key would either be public (bad) or absent (pointless). The demo account starts with no keys.
- It never writes a password, a service-role key, a Supabase URL, or any other secret.
- It never runs `supabase db push` or anything else from CI. It is a manual SQL-editor paste.