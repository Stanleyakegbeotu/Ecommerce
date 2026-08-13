create table if not exists public.products (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  implementation_key text not null unique check (implementation_key ~ '^[a-z0-9-]{1,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products (id, name, slug, status, implementation_key)
values ('d7b64aa1-d8e7-4f3f-85ce-0618a777e4f1', 'DuraVolt 150W Solar Generator', 'duravolt-150w-solar-generator', 'active', 'solar-generator')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, status = excluded.status, implementation_key = excluded.implementation_key;

alter table public.app_settings add column if not exists platform_name text not null default 'Solar Generator' check (char_length(btrim(platform_name)) between 1 and 100);
alter table public.app_settings add column if not exists platform_logo_path text check (platform_logo_path is null or platform_logo_path ~ '^logo/[0-9a-f-]+\.(png|webp|jpe?g)$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('platform-branding', 'platform-branding', true, 524288, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.orders add column if not exists product_id uuid references public.products(id) on delete restrict;
update public.orders set product_id = 'd7b64aa1-d8e7-4f3f-85ce-0618a777e4f1' where product_id is null;
alter table public.orders alter column product_id set not null;
create index if not exists orders_product_created_at_idx on public.orders (product_id, created_at desc);

alter table public.customer_feedback add column if not exists product_id uuid references public.products(id) on delete restrict;
update public.customer_feedback set product_id = 'd7b64aa1-d8e7-4f3f-85ce-0618a777e4f1' where product_id is null;
alter table public.customer_feedback alter column product_id set not null;
create index if not exists customer_feedback_product_created_at_idx on public.customer_feedback (product_id, created_at desc);

alter table public.analytics_events add column if not exists product_id uuid references public.products(id) on delete restrict;
update public.analytics_events set product_id = 'd7b64aa1-d8e7-4f3f-85ce-0618a777e4f1' where product_id is null;
alter table public.analytics_events alter column product_id set not null;
create index if not exists analytics_events_product_created_at_idx on public.analytics_events (product_id, created_at desc);

create index if not exists products_status_updated_at_idx on public.products (status, updated_at desc);
create trigger products_set_updated_at before update on public.products for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;
revoke all on table public.products from anon, authenticated;
revoke all on storage.objects from anon, authenticated;
