alter table public.admin_users
  alter constraint admin_users_user_id_fkey deferrable initially immediate;

alter table public.audit_log
  alter constraint audit_log_actor_id_fkey deferrable initially immediate;

alter table public.audit_log
  add column actor_email text;

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record_id uuid;
  actor_user_id uuid := auth.uid();
  actor_email_snapshot text := nullif(auth.jwt() ->> 'email', '');
begin
  record_id := case when tg_op = 'DELETE' then old.id else new.id end;

  if actor_email_snapshot is null and actor_user_id is not null then
    select users.email
    into actor_email_snapshot
    from auth.users as users
    where users.id = actor_user_id;
  end if;

  insert into public.audit_log (
    actor_id,
    actor_email,
    entity,
    entity_id,
    action,
    old_data,
    new_data
  ) values (
    actor_user_id,
    actor_email_snapshot,
    tg_table_name,
    record_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

alter table public.product_media
  alter column width set not null,
  alter column height set not null;

alter table public.product_media
  add constraint product_media_dimensions_bounded
  check (width between 1 and 4096 and height between 1 and 4096),
  add constraint product_media_product_position_key
  unique (product_id, position)
  deferrable initially immediate;

create function public.reorder_product_media(ordered_media_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_product_id uuid;
  matched_count integer;
  distinct_product_count integer;
  product_media_count integer;
begin
  if not private.is_active_admin(auth.uid()) then
    raise exception 'active administrator required' using errcode = '42501';
  end if;
  if ordered_media_ids is null or cardinality(ordered_media_ids) = 0 then
    raise exception 'ordered_media_ids must not be empty' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(ordered_media_ids) as media_id
    group by media_id
    having media_id is null or count(*) > 1
  ) then
    raise exception 'ordered_media_ids must contain unique non-null IDs' using errcode = '22023';
  end if;

  select min(media.product_id::text)::uuid, count(*), count(distinct media.product_id)
  into target_product_id, matched_count, distinct_product_count
  from public.product_media as media
  where media.id = any(ordered_media_ids);

  if matched_count <> cardinality(ordered_media_ids) or distinct_product_count <> 1 then
    raise exception 'all media IDs must exist and belong to one product' using errcode = '22023';
  end if;

  select count(*)
  into product_media_count
  from public.product_media as media
  where media.product_id = target_product_id;

  if product_media_count <> cardinality(ordered_media_ids) then
    raise exception 'ordered_media_ids must include every media row for the product' using errcode = '22023';
  end if;

  set constraints product_media_product_position_key deferred;

  with desired_order as (
    select media_id, ordinality - 1 as next_position
    from unnest(ordered_media_ids) with ordinality as ordered(media_id, ordinality)
  )
  update public.product_media as media
  set position = desired_order.next_position
  from desired_order
  where media.id = desired_order.media_id
    and media.product_id = target_product_id;
end;
$$;

revoke execute on function public.reorder_product_media(uuid[]) from public;
revoke execute on function public.reorder_product_media(uuid[]) from anon;
grant execute on function public.reorder_product_media(uuid[]) to authenticated;

comment on function public.reorder_product_media(uuid[]) is
  'Atomically assigns contiguous, unique media positions for one product. RLS and active-admin membership are enforced.';
