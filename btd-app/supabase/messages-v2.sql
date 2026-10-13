-- Messages, part 2: read receipts, mark as unread, unsend, delete chats.
--
-- Run once in Supabase → SQL Editor, AFTER message-attachments.sql.
-- Safe to run again. Start from an empty query box.

-- ---------------------------------------------------------------------------
-- 0. Story review: approving and rejecting is for the same admins as
--    messages. (Replaces an older rule that allowed one fixed address only.
--    Harmless if it was already done.)
-- ---------------------------------------------------------------------------
drop policy if exists "Only owner manages stories" on public.stories;
drop policy if exists "Admins manage stories" on public.stories;
create policy "Admins manage stories"
  on public.stories
  for all
  to authenticated
  using (public.is_voiced_admin())
  with check (public.is_voiced_admin());

-- ---------------------------------------------------------------------------
-- 1. One row per conversation, for its read state.
--
-- "user_*" is the person the conversation is with; "admin_*" is the Voiced
-- team (shared by every admin). Nobody writes to this table directly — only
-- through the functions below, which check who is asking.
-- ---------------------------------------------------------------------------
create table if not exists public.message_threads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  user_marked_unread boolean not null default false,
  admin_marked_unread boolean not null default false,
  -- When the person cleared the chat on their side; earlier messages are
  -- hidden from them (the team still has them).
  user_cleared_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.message_threads enable row level security;

drop policy if exists "Read own thread, admins read all" on public.message_threads;
create policy "Read own thread, admins read all"
  on public.message_threads for select to authenticated
  using (user_id = auth.uid() or public.is_voiced_admin());

-- ---------------------------------------------------------------------------
-- 2. Unsent messages stay in place as "This message was unsent".
-- ---------------------------------------------------------------------------
alter table public.messages add column if not exists unsent_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. The actions. Each one works out from the signed-in account whether it's
--    the person or an admin, and refuses anyone else.
-- ---------------------------------------------------------------------------

-- Opened the conversation: everything in it is now read.
create or replace function public.mark_thread_read(p_thread uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = p_thread then
    insert into message_threads (user_id, user_last_read_at, user_marked_unread, updated_at)
    values (p_thread, now(), false, now())
    on conflict (user_id) do update
      set user_last_read_at = now(), user_marked_unread = false, updated_at = now();
  elsif public.is_voiced_admin() then
    insert into message_threads (user_id, admin_last_read_at, admin_marked_unread, updated_at)
    values (p_thread, now(), false, now())
    on conflict (user_id) do update
      set admin_last_read_at = now(), admin_marked_unread = false, updated_at = now();
  else
    raise exception 'Not allowed';
  end if;
end;
$$;

-- "Mark as unread": keeps the conversation flagged until it's opened again.
create or replace function public.mark_thread_unread(p_thread uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = p_thread then
    insert into message_threads (user_id, user_marked_unread, updated_at)
    values (p_thread, true, now())
    on conflict (user_id) do update set user_marked_unread = true, updated_at = now();
  elsif public.is_voiced_admin() then
    insert into message_threads (user_id, admin_marked_unread, updated_at)
    values (p_thread, true, now())
    on conflict (user_id) do update set admin_marked_unread = true, updated_at = now();
  else
    raise exception 'Not allowed';
  end if;
end;
$$;

-- Unsend: only the person who sent it. The text and file details are wiped;
-- the row stays so the conversation still reads in order. Returns the file's
-- storage path (if any) so the site can remove the file itself.
create or replace function public.unsend_message(p_message uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  select attachment_path into v_path
  from messages
  where id = p_message and sender_id = auth.uid() and unsent_at is null;

  if not found then
    raise exception 'You can only unsend your own messages';
  end if;

  update messages
  set unsent_at = now(),
      body = '',
      attachment_path = null,
      attachment_name = null,
      attachment_type = null,
      attachment_size = null
  where id = p_message;

  return v_path;
end;
$$;

-- An unsent message has no text and no file; let the existing check allow it.
alter table public.messages drop constraint if exists messages_body_or_file;
alter table public.messages add constraint messages_body_or_file check (
  char_length(body) <= 4000
  and (char_length(btrim(body)) >= 1 or attachment_path is not null or unsent_at is not null)
);

-- The person clears the chat on their side. The team keeps its copy.
create or replace function public.clear_my_thread()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into message_threads (user_id, user_cleared_at, user_last_read_at, user_marked_unread, updated_at)
  values (auth.uid(), now(), now(), false, now())
  on conflict (user_id) do update
    set user_cleared_at = now(), user_last_read_at = now(), user_marked_unread = false, updated_at = now();
end;
$$;

-- An admin deletes a whole conversation, for everyone, for good. Returns the
-- storage paths of its files so the site can remove those too.
create or replace function public.delete_thread(p_thread uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_voiced_admin() then
    raise exception 'Only admins can delete a conversation';
  end if;
  return query
    delete from messages
    where thread_user_id = p_thread
    returning attachment_path;
  delete from message_threads where user_id = p_thread;
end;
$$;

revoke all on function public.mark_thread_read(uuid) from public, anon;
revoke all on function public.mark_thread_unread(uuid) from public, anon;
revoke all on function public.unsend_message(uuid) from public, anon;
revoke all on function public.clear_my_thread() from public, anon;
revoke all on function public.delete_thread(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.mark_thread_unread(uuid) to authenticated;
grant execute on function public.unsend_message(uuid) to authenticated;
grant execute on function public.clear_my_thread() to authenticated;
grant execute on function public.delete_thread(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Files can be removed (when unsent, or with a deleted conversation) from
--    your own conversation's folder, or any folder by an admin.
-- ---------------------------------------------------------------------------
drop policy if exists "Message files: delete own or admin" on storage.objects;
create policy "Message files: delete own or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_voiced_admin())
  );

-- ---------------------------------------------------------------------------
-- 5. Live updates for read receipts, too.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_threads'
  ) then
    alter publication supabase_realtime add table public.message_threads;
  end if;
end $$;
