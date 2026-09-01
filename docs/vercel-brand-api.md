# Vercel brand API — Supabase checklist

Use this when `GET /api/brands` returns `500` or `SCHEMA_ERROR` on Vercel.

## Required migrations

From the repo root, against your **remote** Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Minimum migrations for brands:

| File | Purpose |
|------|---------|
| `supabase/migrations/00003_create_brands.sql` | `brands` table + unique name index |
| `supabase/migrations/00004_create_brand_kits.sql` | `brand_kits` table |
| `supabase/migrations/00007_add_updated_at_triggers.sql` | `updated_at` on brands |
| `supabase/migrations/00008_add_rls_policies.sql` | RLS on brands and brand_kits |

## SQL verification

Run [`scripts/verify-brand-schema.sql`](../scripts/verify-brand-schema.sql) in the Supabase SQL Editor.

Expected:

- `brands` columns include `id`, `owner_user_id`, `name`, `logo_path`, `created_at`, `updated_at`
- `uq_brands_owner_name_ci` index exists
- `relrowsecurity` is `true` on `brands`
- Policies: `brands_select_own`, `brands_insert_own`, `brands_update_own`, `brands_delete_own`

## Vercel env (no service role)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes |
| `NEXT_PUBLIC_API_URL` | `/api` |

Do **not** add `SUPABASE_SECRET_KEY` to Vercel for brand CRUD. The publishable key + user session + RLS is intentional.

## After push

1. Redeploy Vercel (env changes to `NEXT_PUBLIC_*` need a rebuild).
2. Log in, open `/brands`.
3. Network: `GET /api/brands` → `200`.
4. Create a new unique name → `201`.
5. Repeat same name → `409` with message “A brand with this name already exists.”
