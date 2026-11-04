-- M&M's · update 8: reply to a message, edit your own
-- Safe to run more than once. Nothing existing changes.

-- A reply points at the message it answers; if that one is deleted, the reply stays without a quote
alter table public.posts add column if not exists reply_to uuid references public.posts (id) on delete set null;
alter table public.posts add column if not exists edited_at timestamptz;
create index if not exists posts_reply_to on public.posts (reply_to);

-- Only the text of your own messages can change, and the database notes when
grant update (body) on public.posts to authenticated;
drop policy if exists "edit own notes" on public.posts;
create policy "edit own notes" on public.posts for update to authenticated
  using (author = public.my_name() and kind = 'note')
  with check (author = public.my_name() and kind = 'note' and char_length(btrim(body)) between 1 and 2000);

create or replace function public.mm_post_edited() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.body is distinct from old.body then new.edited_at := now(); end if;
  return new;
end $$;
drop trigger if exists mm_post_edited on public.posts;
create trigger mm_post_edited before update of body on public.posts
  for each row execute function public.mm_post_edited();

select 'replies and edits ready' as status;
