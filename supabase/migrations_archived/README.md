# Archived migrations (pre-squash)

On 2026-07-27 the migration history was **squashed** into a single baseline:
`supabase/migrations/20260727000000_baseline_squash.sql` (a schema dump of the
live database, which already included everything up to the domains foundation).

## Why
The original chain used date-only version prefixes (e.g. several `20241220_*`
files). Multiple files shared one version, and they did not sort in dependency
order, so the chain could **not** be replayed from scratch (`supabase start` /
`db reset` failed) and `supabase db push` mis-tracked them. The baseline fixes
both: local dev now starts cleanly, and `db push` is safe again.

## These files are inert
They are kept here for historical reference only. Supabase only scans
`supabase/migrations/`, so nothing in this folder is ever applied. The remote
migration-history table was repaired to record only the baseline; prod schema
was never changed by the squash.

Do not move these back into `supabase/migrations/`.
