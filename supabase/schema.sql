create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  display_name text,
  avatar_url text,
  birth_date date,
  is_admin boolean not null default false
);

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  backdrop_path text,
  release_date date,
  vote_average numeric(3,1),
  watched boolean not null default false,
  liked boolean,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, tmdb_id, media_type)
);

alter table public.watchlist_items
  add column if not exists watched boolean not null default false;

alter table public.watchlist_items
  add column if not exists liked boolean;

alter table public.profiles
  add column if not exists birth_date date;

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_genres text[] default '{}',
  preferred_media_types text[] default '{}',
  preferred_region text,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

alter table public.user_preferences
  add column if not exists preferred_region text;

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  display_name text,
  category text not null,
  message text not null,
  page_path text,
  moderation_summary text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.user_preferences enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.feedback_entries enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "watchlist_select_own"
on public.watchlist_items
for select
using (auth.uid() = user_id);

create policy "watchlist_insert_own"
on public.watchlist_items
for insert
with check (auth.uid() = user_id);

create policy "watchlist_update_own"
on public.watchlist_items
for update
using (auth.uid() = user_id);

create policy "watchlist_delete_own"
on public.watchlist_items
for delete
using (auth.uid() = user_id);

create policy "user_preferences_select_own"
on public.user_preferences
for select
using (auth.uid() = user_id);

create policy "user_preferences_upsert_own"
on public.user_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_chat_sessions_own"
on public.ai_chat_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_chat_messages_own"
on public.ai_chat_messages
for all
using (
  exists (
    select 1
    from public.ai_chat_sessions sessions
    where sessions.id = ai_chat_messages.session_id
      and sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.ai_chat_sessions sessions
    where sessions.id = ai_chat_messages.session_id
      and sessions.user_id = auth.uid()
  )
);

create policy "feedback_entries_admin_select"
on public.feedback_entries
for select
using (public.is_admin_user());

drop policy if exists "feedback_entries_admin_delete" on public.feedback_entries;

create policy "feedback_entries_admin_delete"
on public.feedback_entries
for delete
using (public.is_admin_user());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
