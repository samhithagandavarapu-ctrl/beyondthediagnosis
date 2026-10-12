-- Photos and files in Messages.
--
-- Run once in Supabase → SQL Editor, AFTER rejections-and-messages.sql.
-- Safe to run again. Start from an empty query box.
--
-- Files go in a PRIVATE storage bucket, in a folder per conversation
-- ("<person's account id>/..."). Only that person and Voiced admins can open
-- them, and only through short-lived links the site makes on the spot.

-- 1. The bucket: private, 10 MB per file, photos and common documents only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-files',
  'message-files',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Who can open and upload: your own conversation's folder, or any folder
--    if you're an admin.
drop policy if exists "Message files: read own or admin" on storage.objects;
create policy "Message files: read own or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_voiced_admin())
  );

drop policy if exists "Message files: upload own or admin" on storage.objects;
create policy "Message files: upload own or admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_voiced_admin())
  );

-- 3. Messages can carry one file, and a message can be just the file.
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_size integer;

alter table public.messages alter column body set default '';
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_body_or_file;
alter table public.messages add constraint messages_body_or_file check (
  char_length(body) <= 4000
  and (char_length(btrim(body)) >= 1 or attachment_path is not null)
);

-- 4. Sending: as before, plus a file has to be in this conversation's folder.
drop policy if exists "Send as yourself" on public.messages;
create policy "Send as yourself"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and sender_email is not distinct from (auth.jwt() ->> 'email')
    and (
      (from_admin = false and thread_user_id = auth.uid())
      or (from_admin = true and public.is_voiced_admin())
    )
    and (attachment_path is null or split_part(attachment_path, '/', 1) = thread_user_id::text)
  );
