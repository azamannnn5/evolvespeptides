-- ============================================================
-- Admin panel database. Paste this whole file into the Supabase
-- SQL editor and press Run. It is safe to run again.
-- ============================================================

-- ---------- tables ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_overrides (
  key text primary key,
  value text,
  kind text,
  page text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.settings (
  group_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.product_overrides (
  product_id integer primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent','fixed','free_shipping')),
  amount numeric not null default 0,
  min_order numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact',
  name text,
  email text,
  subject text,
  body text,
  extra jsonb,
  status text not null default 'new' check (status in ('new','read','done','spam')),
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  url text not null,
  alt text,
  size integer,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.history (
  id bigserial primary key,
  at timestamptz not null default now(),
  by_user uuid,
  by_email text,
  table_name text not null,
  record_key text,
  action text not null,
  old_value jsonb,
  new_value jsonb
);

create table if not exists public.snapshot (
  id integer primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.snapshot (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ---------- role helpers ----------
create or replace function public.cms_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.admin_users where user_id = auth.uid()
$$;

create or replace function public.cms_rank(r text) returns integer
language sql immutable as $$
  select case r when 'owner' then 4 when 'admin' then 3 when 'editor' then 2 when 'viewer' then 1 else 0 end
$$;

create or replace function public.cms_can(min_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.cms_rank(public.cms_role()) >= public.cms_rank(min_role)
$$;

-- ---------- snapshot (the only thing visitors download) ----------
create or replace function public.cms_rebuild_snapshot() returns void
language plpgsql security definer set search_path = public as $$
declare snap jsonb;
begin
  snap := jsonb_build_object(
    'content',  coalesce((select jsonb_object_agg(key, value) from public.content_overrides), '{}'::jsonb),
    'settings', coalesce((select jsonb_object_agg(group_key, data) from public.settings), '{}'::jsonb),
    'products', coalesce((select jsonb_object_agg(product_id::text, data) from public.product_overrides), '{}'::jsonb),
    'has_coupons', exists (select 1 from public.coupons where active),
    'v', (extract(epoch from clock_timestamp()) * 1000)::bigint
  );
  insert into public.snapshot (id, data, updated_at) values (1, snap, now())
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
end $$;

create or replace function public.cms_snapshot_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.cms_rebuild_snapshot();
  return null;
end $$;

-- ---------- history ----------
create or replace function public.cms_history_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; o jsonb; n jsonb; claims jsonb; em text;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then claims := null;
  end;
  em := claims ->> 'email';
  if tg_op = 'DELETE' then o := to_jsonb(old); n := null; else n := to_jsonb(new); o := case when tg_op = 'UPDATE' then to_jsonb(old) else null end; end if;
  k := coalesce(n ->> tg_argv[0], o ->> tg_argv[0]);
  insert into public.history (by_user, by_email, table_name, record_key, action, old_value, new_value)
  values (auth.uid(), em, tg_table_name, k, lower(tg_op), o, n);
  return null;
end $$;

-- ---------- triggers ----------
drop trigger if exists trg_snap_content on public.content_overrides;
create trigger trg_snap_content after insert or update or delete on public.content_overrides
  for each statement execute function public.cms_snapshot_trigger();
drop trigger if exists trg_snap_settings on public.settings;
create trigger trg_snap_settings after insert or update or delete on public.settings
  for each statement execute function public.cms_snapshot_trigger();
drop trigger if exists trg_snap_products on public.product_overrides;
create trigger trg_snap_products after insert or update or delete on public.product_overrides
  for each statement execute function public.cms_snapshot_trigger();
drop trigger if exists trg_snap_coupons on public.coupons;
create trigger trg_snap_coupons after insert or update or delete on public.coupons
  for each statement execute function public.cms_snapshot_trigger();

drop trigger if exists trg_hist_content on public.content_overrides;
create trigger trg_hist_content after insert or update or delete on public.content_overrides
  for each row execute function public.cms_history_trigger('key');
drop trigger if exists trg_hist_settings on public.settings;
create trigger trg_hist_settings after insert or update or delete on public.settings
  for each row execute function public.cms_history_trigger('group_key');
drop trigger if exists trg_hist_products on public.product_overrides;
create trigger trg_hist_products after insert or update or delete on public.product_overrides
  for each row execute function public.cms_history_trigger('product_id');
drop trigger if exists trg_hist_coupons on public.coupons;
create trigger trg_hist_coupons after insert or update or delete on public.coupons
  for each row execute function public.cms_history_trigger('code');
drop trigger if exists trg_hist_messages on public.messages;
create trigger trg_hist_messages after update or delete on public.messages
  for each row execute function public.cms_history_trigger('id');
drop trigger if exists trg_hist_media on public.media;
create trigger trg_hist_media after insert or update or delete on public.media
  for each row execute function public.cms_history_trigger('path');
drop trigger if exists trg_hist_admin_users on public.admin_users;
create trigger trg_hist_admin_users after insert or update or delete on public.admin_users
  for each row execute function public.cms_history_trigger('email');

-- ---------- row level security ----------
alter table public.admin_users enable row level security;
alter table public.content_overrides enable row level security;
alter table public.settings enable row level security;
alter table public.product_overrides enable row level security;
alter table public.coupons enable row level security;
alter table public.messages enable row level security;
alter table public.media enable row level security;
alter table public.history enable row level security;
alter table public.snapshot enable row level security;

-- snapshot: visitors read it, nobody writes it directly (the trigger does)
drop policy if exists snapshot_read on public.snapshot;
create policy snapshot_read on public.snapshot for select to anon, authenticated using (true);

-- admin_users
drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.cms_can('owner'));
drop policy if exists admin_users_write on public.admin_users;
create policy admin_users_write on public.admin_users for all to authenticated
  using (public.cms_can('owner')) with check (public.cms_can('owner'));

-- content overrides: any team member reads, editor and above writes
drop policy if exists content_read on public.content_overrides;
create policy content_read on public.content_overrides for select to authenticated using (public.cms_can('viewer'));
drop policy if exists content_write on public.content_overrides;
create policy content_write on public.content_overrides for all to authenticated
  using (public.cms_can('editor')) with check (public.cms_can('editor'));

-- settings: admin and above writes
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated using (public.cms_can('viewer'));
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.cms_can('admin')) with check (public.cms_can('admin'));

-- products: editor and above writes
drop policy if exists products_read on public.product_overrides;
create policy products_read on public.product_overrides for select to authenticated using (public.cms_can('viewer'));
drop policy if exists products_write on public.product_overrides;
create policy products_write on public.product_overrides for all to authenticated
  using (public.cms_can('editor')) with check (public.cms_can('editor'));

-- coupons: visitors can never list them; admin and above manage them
drop policy if exists coupons_read on public.coupons;
create policy coupons_read on public.coupons for select to authenticated using (public.cms_can('viewer'));
drop policy if exists coupons_write on public.coupons;
create policy coupons_write on public.coupons for all to authenticated
  using (public.cms_can('admin')) with check (public.cms_can('admin'));

-- messages: visitors can never read them; they are created only by submit_message()
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated using (public.cms_can('viewer'));
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (public.cms_can('editor')) with check (public.cms_can('editor'));
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated using (public.cms_can('editor'));

-- media
drop policy if exists media_read on public.media;
create policy media_read on public.media for select to authenticated using (public.cms_can('viewer'));
drop policy if exists media_write on public.media;
create policy media_write on public.media for all to authenticated
  using (public.cms_can('editor')) with check (public.cms_can('editor'));

-- history: read only
drop policy if exists history_read on public.history;
create policy history_read on public.history for select to authenticated using (public.cms_can('viewer'));

-- table privileges (RLS still decides what each person can do)
revoke all on public.admin_users, public.content_overrides, public.settings, public.product_overrides,
  public.coupons, public.messages, public.media, public.history, public.snapshot from anon;
revoke all on public.history, public.snapshot from authenticated;
grant select on public.snapshot to anon, authenticated;
grant select on public.history to authenticated;
grant select, insert, update, delete on public.admin_users, public.content_overrides, public.settings,
  public.product_overrides, public.coupons, public.messages, public.media to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- functions visitors may call ----------
create or replace function public.validate_coupon(p_code text, p_subtotal numeric default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  select * into c from public.coupons where upper(code) = upper(trim(coalesce(p_code, ''))) limit 1;
  if not found or not c.active then return jsonb_build_object('valid', false, 'reason', 'invalid'); end if;
  if c.starts_at is not null and now() < c.starts_at then return jsonb_build_object('valid', false, 'reason', 'not_started'); end if;
  if c.ends_at is not null and now() > c.ends_at then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then return jsonb_build_object('valid', false, 'reason', 'used_up'); end if;
  if coalesce(p_subtotal, 0) < c.min_order then return jsonb_build_object('valid', false, 'reason', 'min_order', 'min_order', c.min_order); end if;
  return jsonb_build_object('valid', true, 'code', c.code, 'type', c.type, 'amount', c.amount);
end $$;

create or replace function public.submit_message(p_kind text, p_name text, p_email text, p_subject text, p_body text, p_extra jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_kind, 'contact') not in ('contact','newsletter','waitlist','other') then raise exception 'bad kind'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad email'; end if;
  if length(coalesce(p_body, '')) > 5000 or length(coalesce(p_name, '')) > 200 or length(coalesce(p_subject, '')) > 300 then raise exception 'too long'; end if;
  insert into public.messages (kind, name, email, subject, body, extra)
  values (coalesce(p_kind, 'contact'), left(p_name, 200), left(p_email, 320), left(p_subject, 300), left(p_body, 5000), p_extra);
end $$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;
grant execute on function public.submit_message(text, text, text, text, text, jsonb) to anon, authenticated;

-- ---------- team ----------
create or replace function public.add_team_member(p_email text, p_role text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.cms_can('owner') then raise exception 'Only the owner can manage the team'; end if;
  if p_role not in ('owner','admin','editor','viewer') then raise exception 'Unknown role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then raise exception 'No login found for that email. Create the login in Authentication first.'; end if;
  insert into public.admin_users (user_id, email, role) values (uid, lower(trim(p_email)), p_role)
  on conflict (user_id) do update set role = excluded.role, email = excluded.email;
end $$;
revoke all on function public.add_team_member(text, text) from public, anon;
grant execute on function public.add_team_member(text, text) to authenticated;

-- ---------- storage bucket for uploads ----------
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists site_media_read on storage.objects;
create policy site_media_read on storage.objects for select to anon, authenticated using (bucket_id = 'site-media');
drop policy if exists site_media_insert on storage.objects;
create policy site_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and public.cms_can('editor'));
drop policy if exists site_media_update on storage.objects;
create policy site_media_update on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and public.cms_can('editor'));
drop policy if exists site_media_delete on storage.objects;
create policy site_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and public.cms_can('editor'));

-- ---------- first owner ----------
-- 1) Create your login in Supabase: Authentication > Users > Add user (email and password).
-- 2) Replace the email below with yours, remove the two dashes at the start of the line, and run it:
-- insert into public.admin_users (user_id, email, role) select id, email, 'owner' from auth.users where lower(email) = lower('YOUR-EMAIL-HERE') on conflict (user_id) do update set role = 'owner';

select public.cms_rebuild_snapshot();
