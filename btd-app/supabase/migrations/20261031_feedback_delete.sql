-- Let Voiced admins delete feedback answers (from /admin/feedback).
--
-- Run once in Supabase → SQL Editor, after 20261030_feedback.sql. Safe to run
-- again. Everyone else still can't change or delete an answer.

drop policy if exists "Admins delete feedback" on public.feedback;
create policy "Admins delete feedback"
  on public.feedback for delete to authenticated
  using (public.is_voiced_admin());
