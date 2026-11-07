-- Migration 0001: the opportunities table and its security rules.
--
-- A migration is a script that changes the database's structure. Keeping
-- them numbered in the repo means the database design is versioned in git
-- and can be rebuilt exactly. Run once, in order, in the Supabase SQL Editor.

-- 1. THE TABLE ---------------------------------------------------------------
-- One row per opportunity. Columns mirror the Opportunity type in src/types.ts,
-- written in snake_case (the database convention) instead of camelCase.

create table public.opportunities (
  -- Primary key: the unique id of each row. The app makes these ids itself
  -- (crypto.randomUUID), so rows keep the same id when moved from localStorage.
  id uuid primary key default gen_random_uuid(),

  -- Who owns this row. auth.uid() is the id of the logged-in user making the
  -- request, so the app never has to send it. "references auth.users" is a
  -- foreign key: the owner must be a real user, and deleting the user deletes
  -- their rows ("on delete cascade").
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- The same rules as the form, enforced by the database too, so bad data
  -- can't get in through any other door (like the import API in phase 4).
  name text not null check (char_length(btrim(name)) between 1 and 300),
  opens_on date,
  deadline date not null,
  link text not null default '' check (link = '' or link ~* '^https?://'),
  status text not null default 'todo' check (status in ('todo', 'applied', 'skipped')),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opens_on_or_before_deadline check (opens_on is null or opens_on <= deadline)
);

comment on table public.opportunities is 'Art open calls, residencies and grants being tracked, one row per opportunity.';

-- An index is like a book's index: it lets the database find "this user's
-- rows, by deadline" without reading the whole table. That's the exact
-- question the app and the daily email job ask.
create index opportunities_user_id_deadline_idx on public.opportunities (user_id, deadline);

-- 2. ROW-LEVEL SECURITY ------------------------------------------------------
-- The app's public key is visible to anyone who opens the website, so the
-- protection must live in the database itself. With RLS switched on, every
-- request is refused unless a policy below allows it.

alter table public.opportunities enable row level security;

-- Each policy says who ("to authenticated" = logged-in users) may do what,
-- and to which rows ("using" = which existing rows they can see or touch;
-- "with check" = what new or changed rows must look like).
-- (select auth.uid()) is wrapped in a select so Postgres works it out once
-- per request instead of once per row: Supabase's performance advice.

create policy "Owners can read their opportunities"
  on public.opportunities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can add opportunities for themselves"
  on public.opportunities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their opportunities"
  on public.opportunities for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id); -- and can't hand a row to someone else

create policy "Owners can delete their opportunities"
  on public.opportunities for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No policy mentions "anon" (visitors who aren't logged in), so they can
-- neither read nor write anything.

-- 3. REFRESH THE DATA API ------------------------------------------------------
-- The Data API (PostgREST) keeps its own list of tables. Without this line it
-- may say "Could not find the table" until that list happens to refresh.
notify pgrst, 'reload schema';
