-- M&M's · update 9: voice messages, send later, saved messages
-- Safe to run more than once. Run update 8 first.

-- ─── Voice messages ─────────────────────────────────────────────
alter table public.posts add column if not exists meta jsonb; -- e.g. {"duration": 12.4} for a voice message
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.posts'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    execute format('alter table public.posts drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.posts add constraint posts_kind_check
  check (kind in ('note', 'photo', 'heart', 'trip', 'voice')) not valid;

insert into storage.buckets (id, name, public, file_size_limit)
values ('voice', 'voice', false, 10485760)
on conflict (id) do nothing;
drop policy if exists "members read voice" on storage.objects;
create policy "members read voice" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.is_member());
drop policy if exists "members add voice" on storage.objects;
create policy "members add voice" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and public.is_member());
drop policy if exists "members delete voice" on storage.objects;
create policy "members delete voice" on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and public.is_member());

-- ─── Send later ─────────────────────────────────────────────────
-- A scheduled message stays yours alone until it's due, then arrives like any other
alter table public.posts add column if not exists send_at timestamptz;
create index if not exists posts_send_at on public.posts (send_at) where send_at is not null;
alter table public.posts drop constraint if exists posts_send_later_notes;
alter table public.posts add constraint posts_send_later_notes check (send_at is null or kind = 'note') not valid;

drop policy if exists "members read posts" on public.posts;
create policy "members read posts" on public.posts for select to authenticated
  using (public.is_member() and (send_at is null or send_at <= now() or author = public.my_name()));

-- You can change the text of your own notes and the time of your own scheduled ones
grant update (body, send_at) on public.posts to authenticated;

create or replace function public.mm_post_edited() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.send_at is null and new.send_at is not null then
    raise exception 'A message that was already sent can''t be scheduled';
  end if;
  if old.send_at is not null and new.send_at is null then
    new.created_at := least(now(), old.send_at); -- it arrives now, or at the time it was meant to
  end if;
  if new.body is distinct from old.body and old.send_at is null then
    new.edited_at := now(); -- changing a message before it's sent isn't an edit
  end if;
  return new;
end $$;
drop trigger if exists mm_post_edited on public.posts;
create trigger mm_post_edited before update of body, send_at on public.posts
  for each row execute function public.mm_post_edited();

-- Every minute, due messages are delivered (that's what makes them appear live and notify)
create extension if not exists pg_cron with schema pg_catalog;
create or replace function public.mm_release_due() returns void
language sql security definer set search_path = public as $$
  update public.posts set send_at = null where send_at is not null and send_at <= now();
$$;
revoke all on function public.mm_release_due() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'mm-release';
select cron.schedule('mm-release', '* * * * *', 'select public.mm_release_due()');

-- ─── Saved messages (shared: you both see what either of you kept) ─
create table if not exists public.saved (
  post_id uuid not null references public.posts (id) on delete cascade,
  saved_by text not null default public.my_name(),
  created_at timestamptz not null default now(),
  primary key (post_id, saved_by)
);
alter table public.saved enable row level security;
revoke all on public.saved from anon;
grant select, insert, delete on public.saved to authenticated;
drop policy if exists "members read saved" on public.saved;
create policy "members read saved" on public.saved for select to authenticated using (public.is_member());
drop policy if exists "save as yourself" on public.saved;
create policy "save as yourself" on public.saved for insert to authenticated
  with check (public.is_member() and saved_by = public.my_name());
drop policy if exists "unsave your own" on public.saved;
create policy "unsave your own" on public.saved for delete to authenticated using (saved_by = public.my_name());
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved') then
    alter publication supabase_realtime add table public.saved;
  end if;
end $$;

-- ─── Notifications: the function keeps its JWT check, so send the public key it accepts;
--     scheduled messages notify when they arrive, not when they're written
create or replace function public.mm_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare secret text;
begin
  select hook_secret into secret from public.push_config where id = 1;
  if secret is not null then
    perform net.http_post(
      url := 'https://vktxzparkerniiqlayio.supabase.co/functions/v1/push',
      body := jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'record', to_jsonb(new),
                                 'old', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-mm-hook', secret,
                                    'apikey', 'sb_publishable_fvtYnAYSFmUUGKikjsT4bw_qYZwuvsC',
                                    'Authorization', 'Bearer sb_publishable_fvtYnAYSFmUUGKikjsT4bw_qYZwuvsC'),
      timeout_milliseconds := 5000);
  end if;
  return new;
end $$;
drop trigger if exists mm_push on public.posts;
create trigger mm_push after insert or update of send_at on public.posts for each row execute function public.mm_push();

select 'voice, send later and saved messages ready' as status;
