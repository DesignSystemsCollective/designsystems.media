-- Accounts v1: profiles + watch later.
--
-- content_type/content_slug below deliberately mirror the shape already
-- used by the editorial `playlists` content collection's
-- `items: [{ type: "media" | "podcast", slug }]` (src/content.config.ts),
-- so a slug resolves the same way whether it came from editorial content
-- or a user's own list.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'user-' || substr(new.id::text, 1, 8));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.watch_later (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('media', 'podcast')),
  content_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, content_type, content_slug)
);

alter table public.watch_later enable row level security;

create policy "users manage their own watch later list"
  on public.watch_later for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
