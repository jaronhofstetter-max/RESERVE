-- RESERVE account snapshots. Separate from the legacy TenderHawk schema.
begin;
create table if not exists public.reserve_account_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check(revision>0),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 updated_at timestamptz not null default now()
);
create table if not exists public.reserve_account_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,revision)
);
alter table public.reserve_account_state enable row level security;
alter table public.reserve_account_history enable row level security;
revoke all on public.reserve_account_state,public.reserve_account_history from anon,authenticated;
grant select on public.reserve_account_state,public.reserve_account_history to authenticated;
drop policy if exists reserve_state_read_own on public.reserve_account_state;
create policy reserve_state_read_own on public.reserve_account_state for select to authenticated using((select auth.uid())=user_id);
drop policy if exists reserve_history_read_own on public.reserve_account_history;
create policy reserve_history_read_own on public.reserve_account_history for select to authenticated using((select auth.uid())=user_id);

create or replace function public.save_reserve_account(p_expected_revision bigint,p_payload jsonb,p_allow_empty boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); old public.reserve_account_state; next_revision bigint;
 v jsonb; k text; item record; photo record; previous_count int:=0; next_count int:=0;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid revision' using errcode='22023'; end if;
 if p_payload is null or pg_catalog.octet_length(p_payload::text)>2097152
    or p_payload->>'schema' is distinct from '1'
    or p_payload->'state'->>'app' is distinct from 'RESERVE'
    or p_payload->'state'->>'schema' is distinct from '2'
    or pg_catalog.jsonb_typeof(p_payload->'state'->'values') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_payload->'state'->'cookingProgress') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_payload->'drafts') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_payload->'photos') is distinct from 'object' then
   raise exception 'Invalid account payload' using errcode='22023';
 end if;
 v:=p_payload->'state'->'values';
 if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v))<>7 then raise exception 'Incomplete keys' using errcode='22023'; end if;
 for item in select * from pg_catalog.jsonb_each(v) loop
  if not (item.key=any(array['reserveStock','reserveShopping','reserveProfile','reserveProductKnowledgeV1','reserveBarcodeProductsV1','reservePersonalRecipesV1','reserveExcludedRecipesV1'])) then raise exception 'Unexpected key' using errcode='22023'; end if;
  if item.value<>'null'::jsonb and pg_catalog.jsonb_typeof(item.value) is distinct from (case when item.key in ('reserveProfile','reserveProductKnowledgeV1','reserveBarcodeProductsV1') then 'object' else 'array' end) then raise exception 'Invalid data type' using errcode='22023'; end if;
 end loop;
 if pg_catalog.jsonb_array_length(p_payload->'drafts')>50 or (select pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload->'photos'))>2000 then raise exception 'Too many items' using errcode='22023'; end if;
 for photo in select * from pg_catalog.jsonb_each_text(p_payload->'photos') loop
  if photo.key !~ '^personal-[a-z0-9-]+$' or photo.value !~ ('^'||uid::text||'/[0-9a-f]{64}\.(jpg|png|webp)$') then raise exception 'Invalid photo path' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects where bucket_id='reserve-private' and name=photo.value) then raise exception 'Photo missing' using errcode='22023'; end if;
 end loop;
 select * into old from public.reserve_account_state where user_id=uid for update;
 if found then
  if old.revision<>p_expected_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
  foreach k in array array['reserveStock','reserveShopping','reservePersonalRecipesV1'] loop
   previous_count:=previous_count+pg_catalog.jsonb_array_length(coalesce(nullif(old.payload->'state'->'values'->k,'null'::jsonb),'[]'::jsonb));
   next_count:=next_count+pg_catalog.jsonb_array_length(coalesce(nullif(v->k,'null'::jsonb),'[]'::jsonb));
  end loop;
  previous_count:=previous_count+pg_catalog.jsonb_array_length(old.payload->'drafts')+(select pg_catalog.count(*) from pg_catalog.jsonb_each(old.payload->'photos'))+(select pg_catalog.count(*) from pg_catalog.jsonb_each(coalesce(old.payload->'state'->'cookingProgress','{}'::jsonb)));
  next_count:=next_count+pg_catalog.jsonb_array_length(p_payload->'drafts')+(select pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload->'photos'))+(select pg_catalog.count(*) from pg_catalog.jsonb_each(coalesce(p_payload->'state'->'cookingProgress','{}'::jsonb)));
  if previous_count>0 and next_count=0 and not coalesce(p_allow_empty,false) then raise exception 'Empty replacement requires confirmation' using errcode='22023'; end if;
  next_revision:=old.revision+1;
  update public.reserve_account_state set revision=next_revision,payload=p_payload,updated_at=now() where user_id=uid;
 else
  if p_expected_revision<>0 then raise exception 'Revision conflict' using errcode='40001'; end if;
  next_revision:=1;
  insert into public.reserve_account_state(user_id,revision,payload) values(uid,next_revision,p_payload) on conflict do nothing;
  if not found then raise exception 'Revision conflict' using errcode='40001'; end if;
 end if;
 insert into public.reserve_account_history(user_id,revision,payload) values(uid,next_revision,p_payload);
 delete from public.reserve_account_history where user_id=uid and revision<=next_revision-10;
 return pg_catalog.jsonb_build_object('revision',next_revision);
end;
$$;
revoke all on function public.save_reserve_account(bigint,jsonb,boolean) from public,anon;
grant execute on function public.save_reserve_account(bigint,jsonb,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('reserve-private','reserve-private',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists reserve_photo_read_own on storage.objects;
create policy reserve_photo_read_own on storage.objects for select to authenticated using(bucket_id='reserve-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists reserve_photo_insert_own on storage.objects;
create policy reserve_photo_insert_own on storage.objects for insert to authenticated with check(bucket_id='reserve-private' and name~('^'||(select auth.uid())::text||'/[0-9a-f]{64}\.(jpg|png|webp)$'));
-- Immutable content-addressed objects: no UPDATE/DELETE policy is granted.
commit;
