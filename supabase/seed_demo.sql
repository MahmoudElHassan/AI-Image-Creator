-- ========================================
-- Basar — Manual demo seed
-- ========================================
--
-- Manual seed. Do not run in CI. Do not run via supabase db push.
--
-- Steps (run from the Supabase Dashboard, NOT the CLI):
--   1. Dashboard → Authentication → Users → Add user with email
--      demo@basar.example (set the password OUTSIDE this repo).
--   2. Copy that user's UUID from the URL / row.
--   3. In this file, find-replace ALL occurrences of the placeholder
--      00000000-0000-4000-8000-000000000001 with that UUID. Do not
--      touch any other UUID in this file.
--   4. Upload the assets in docs/demo-assets/ to the `brand-assets`
--      bucket at the storage paths documented under "Storage uploads"
--      below. The four succeeded-generation paths MUST contain the
--      corresponding generation id (the SQL CHECK regex requires it).
--      Reuse is allowed: upload the same bytes from gen-succeeded-1.png
--      or gen-succeeded-2.png under multiple storage keys.
--   5. Run this file in the Supabase SQL editor.
--
-- Fixed ids documented here (so the file is self-describing and
-- deterministic; only the owner_user_id is a placeholder):
--   - owner placeholder   00000000-0000-4000-8000-000000000001
--   - brand_id            11111111-1111-4111-8111-111111111111
--   - generation 1        22222222-2222-4222-8222-222222222221  (succeeded, openai)
--   - generation 2        22222222-2222-4222-8222-222222222222  (succeeded, gemini)
--   - generation 3        22222222-2222-4222-8222-222222222223  (succeeded, openai)
--   - generation 4        22222222-2222-4222-8222-222222222224  (succeeded, gemini)
--   - generation 5        22222222-2222-4222-8222-222222222225  (failed, TIMEOUT)
--   - generation 6        22222222-2222-4222-8222-222222222226  (failed, INVALID_KEY)
--
-- Storage uploads (paths MUST be created in `brand-assets` before
-- running this SQL — otherwise the succeeded rows still pass the
-- CHECK constraints but the image_url builder will 404 at view time):
--   brands/11111111-1111-4111-8111-111111111111/logo.png
--                              ← docs/demo-assets/northwind-logo.png
--   brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222221.png
--                              ← docs/demo-assets/gen-succeeded-1.png (or -2)
--   brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222222.png
--                              ← docs/demo-assets/gen-succeeded-2.png (or -1)
--   brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222223.png
--                              ← docs/demo-assets/gen-succeeded-1.png (reused)
--   brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222224.png
--                              ← docs/demo-assets/gen-succeeded-2.png (reused)
--
-- This script is idempotent: it deletes prior demo rows for this brand
-- first, then inserts. ZERO rows are written into provider_keys. The
-- script never touches auth.users — the demo user is created by hand
-- in step 1.

-- ========================================
-- 0. DELETE — only rows owned by the demo brand id.
-- ========================================

DELETE FROM generations WHERE brand_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM brand_kits WHERE brand_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM brands WHERE id = '11111111-1111-4111-8111-111111111111';

-- ========================================
-- 1. INSERT brands.
-- ========================================

INSERT INTO brands (
  id,
  owner_user_id,
  name,
  logo_path
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-4000-8000-000000000001',
  'Northwind Coffee',
  'brands/11111111-1111-4111-8111-111111111111/logo.png'
);

-- ========================================
-- 2. INSERT brand_kits.
--    complete ⇒ tone + audience + ≥1 color + completed_at are required
--    by the chk_brand_kits_* constraints. Colors must satisfy
--    all_hex_colors() (^#[0-9A-Fa-f]{6}$).
-- ========================================

INSERT INTO brand_kits (
  brand_id,
  tagline,
  tone,
  audience,
  colors,
  avoid_words,
  summary,
  status,
  completed_at
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Warm coffee, slow mornings.',
  'friendly',
  'Remote workers and neighborhood regulars who want a quiet place to think.',
  ARRAY['#1E6E82','#F8FAFC']::text[],
  'corporate, discount, bargain',
  'Northwind Coffee is a small neighborhood roaster. Friendly, unhurried, photo-forward. Avoid mass-market language.',
  'complete',
  NOW()
);

-- ========================================
-- 3. INSERT generations.
--    4 succeeded (mixed openai/gemini, valid image_path, error null,
--    completed_at set) and 2 failed (image_path null, error_code set,
--    completed_at set). Prompts are short coffee-cup descriptions,
--    no PII, all within 3–4000 chars. Width/height within 256–4096.
-- ========================================

INSERT INTO generations (
  id, brand_id, prompt, provider, model,
  platform_preset, width, height, logo_mode,
  status, image_path, provider_request_id,
  error_code, error_message,
  created_at, completed_at
) VALUES
  -- succeeded #1 — openai square
  (
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111111',
    'Sunlit latte on a wooden table, steam rising, soft window light, no text.',
    'openai',
    'gpt-image-1',
    'instagram_post',
    1080, 1080, 'none',
    'succeeded',
    'brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222221.png',
    'demo-req-001',
    NULL, NULL,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 seconds'
  ),
  -- succeeded #2 — gemini square
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Overhead view of two ceramic mugs on a marble counter, soft shadow, cozy.',
    'gemini',
    'gemini-2.5-flash-image',
    'instagram_post',
    1080, 1080, 'none',
    'succeeded',
    'brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222222.png',
    'demo-req-002',
    NULL, NULL,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '38 seconds'
  ),
  -- succeeded #3 — openai portrait (reuses gen-succeeded-1.png bytes)
  (
    '22222222-2222-4222-8222-222222222223',
    '11111111-1111-4111-8111-111111111111',
    'Tall pour-over carafe with paper filter, morning light, kitchen background.',
    'openai',
    'gpt-image-1',
    'instagram_story',
    1080, 1920, 'none',
    'succeeded',
    'brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222223.png',
    'demo-req-003',
    NULL, NULL,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '52 seconds'
  ),
  -- succeeded #4 — gemini portrait (reuses gen-succeeded-2.png bytes)
  (
    '22222222-2222-4222-8222-222222222224',
    '11111111-1111-4111-8111-111111111111',
    'Close-up of a single espresso pull, crema forming, no people, no text.',
    'gemini',
    'gemini-2.5-flash-image',
    'instagram_story',
    1080, 1920, 'none',
    'succeeded',
    'brands/11111111-1111-4111-8111-111111111111/generations/22222222-2222-4222-8222-222222222224.png',
    'demo-req-004',
    NULL, NULL,
    NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours' + INTERVAL '41 seconds'
  ),
  -- failed #5 — TIMEOUT
  (
    '22222222-2222-4222-8222-222222222225',
    '11111111-1111-4111-8111-111111111111',
    'Wide shot of a cafe window at golden hour with a single customer silhouette.',
    'openai',
    'gpt-image-1',
    'facebook_post',
    1200, 630, 'none',
    'failed',
    NULL, NULL,
    'TIMEOUT',
    'The request took too long to complete. Please try again.',
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '120 seconds'
  ),
  -- failed #6 — INVALID_KEY
  (
    '22222222-2222-4222-8222-222222222226',
    '11111111-1111-4111-8111-111111111111',
    'Hand holding a paper coffee cup against a brick wall, soft daylight.',
    'gemini',
    'gemini-2.5-flash-image',
    'linkedin_post',
    1200, 627, 'none',
    'failed',
    NULL, NULL,
    'INVALID_KEY',
    'This key was rejected by the provider.',
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '8 seconds'
  );

-- ========================================
-- Sanity check — run after the inserts.
-- ========================================
-- SELECT COUNT(*) FROM brands         WHERE id = '11111111-1111-4111-8111-111111111111';  -- 1
-- SELECT COUNT(*) FROM brand_kits     WHERE brand_id = '11111111-1111-4111-8111-111111111111'; -- 1
-- SELECT COUNT(*) FROM generations    WHERE brand_id = '11111111-1111-4111-8111-111111111111'; -- 6
-- SELECT COUNT(*) FROM generations    WHERE brand_id = '11111111-1111-4111-8111-111111111111' AND status = 'succeeded'; -- 4
-- SELECT COUNT(*) FROM generations    WHERE brand_id = '11111111-1111-4111-8111-111111111111' AND status = 'failed';     -- 2
-- SELECT COUNT(*) FROM provider_keys;                                                            -- 0