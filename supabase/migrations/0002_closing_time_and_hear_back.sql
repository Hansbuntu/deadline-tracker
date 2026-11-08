-- Migration 0002: closing times, their time zones, and a "hear back by" date.
--
-- Open calls often close at a set hour in their own time zone ("17:00 CET"),
-- which can be hours away from midnight in Accra. All three columns are
-- optional, so existing rows stay valid. Run once in the Supabase SQL Editor,
-- BEFORE deploying the version of the app that uses these columns.

alter table public.opportunities
  -- Clock time on the deadline day, e.g. 17:00. Empty = "some time that day".
  add column closing_time time,
  -- IANA time zone name of that clock time, e.g. Europe/Paris. Empty = GMT.
  add column time_zone text check (time_zone is null or char_length(time_zone) between 1 and 64),
  -- For applied items: roughly when results are expected.
  add column hear_back_by date;

-- Row-level security from migration 0001 already covers these new columns:
-- policies apply to whole rows, so only the owner can read or change them.

-- Let the Data API (PostgREST) see the new columns straight away.
notify pgrst, 'reload schema';
