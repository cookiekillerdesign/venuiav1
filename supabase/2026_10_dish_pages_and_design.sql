-- ============================================================================
-- LOOK Restobar — upgrade for v17 (dish pages, prep time, design editor)
-- Run once in Supabase → SQL Editor on the LIVE database. Safe to re-run.
-- (Re-running the full schema.sql does the same column work — this file is
--  the short version plus the one-off photo cleanup below.)
-- ============================================================================

-- 1. New dish fields
alter table public.menu_items add column if not exists ingredients  text;
alter table public.menu_items add column if not exists kcal         numeric;
alter table public.menu_items add column if not exists protein      numeric;
alter table public.menu_items add column if not exists fat          numeric;
alter table public.menu_items add column if not exists carbs        numeric;
alter table public.menu_items add column if not exists allergens    text[];
alter table public.menu_items add column if not exists prep_minutes integer;

-- 2. Unlink the photos that used to ship inside the site itself.
--    Those files (/dish-photos/...) are no longer part of the build, so any
--    dish still pointing at them would show a broken image. Photos uploaded
--    through the admin panel live in Supabase Storage and are NOT touched.
update public.menu_items
   set photo_url = null, storage_path = null
 where photo_url like '/dish-photos/%';

-- 3. Theme + logo live in the existing site_content table (rows 'theme' and
--    'brand'). If the admin "Conținut" page already works for you, that
--    table exists. If not, run the full supabase/schema.sql instead — it
--    creates the table together with its security rules. (Creating the
--    table here without them would leave it writable by anyone.)
