# Narai Property Website — Developer Handoff

Current live site: https://brand-digital-lab.github.io/narai/
Repository: brand-digital-lab/narai
Supabase project ref: fdjfhgqhqivgjnvvxzgf
Supabase URL: https://fdjfhgqhqivgjnvvxzgf.supabase.co
Table: public.tracker_store
Main row: id = main
Backup entries: 67
Database row updated_at: 2026-09-21 06:58:06.921+00

## Website source
Root files:
- index.html
- script.js
- styles.css
- entries.json

## Database handoff
- database/tracker_store-data.json — full readable export
- database/tracker_store-backup.sql — restore schema + current data
- database/schema-current.sql — current anonymous RLS used by live site
- database/schema-auth-ready.sql — authenticated-only RLS, optional

## Move to a new Supabase project
1. Create a new Supabase project.
2. Run database/tracker_store-backup.sql in SQL Editor.
3. Run database/schema-current.sql if the site needs to work immediately without login.
4. Replace SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the website code.
5. Deploy the source to GitHub Pages / Netlify / Vercel / Cloudflare Pages.

## Important
The live site is currently restored to its original anon-access behavior so the existing data stays visible.
Do NOT run schema-auth-ready.sql until frontend login/Auth works and has been tested.

Never put a service_role key or database password in frontend code or GitHub.

## Data model
public.tracker_store:
- id text primary key
- entries jsonb
- updated_at timestamptz

The app reads/writes the single row with id = 'main'.
