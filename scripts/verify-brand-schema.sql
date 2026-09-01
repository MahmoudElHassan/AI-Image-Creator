-- Run in Supabase SQL Editor to verify Vercel brand API prerequisites.
-- All checks should return at least one row where noted.

-- 1. brands table exists with expected columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'brands'
ORDER BY ordinal_position;

-- 2. brand_kits table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'brand_kits'
ORDER BY ordinal_position;

-- 3. unique index for case-insensitive brand names per owner
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'brands' AND indexname = 'uq_brands_owner_name_ci';

-- 4. RLS enabled on brands
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'brands';

-- 5. brand policies present
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'brands'
ORDER BY policyname;

-- 6. brand_kits policies present
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'brand_kits'
ORDER BY policyname;
