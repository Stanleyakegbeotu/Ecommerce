-- One Meta dataset remains canonical. These private fields only retain the
-- acquisition context that led to the canonical order, Lead, and Purchase.
alter table public.meta_order_attribution
  add column if not exists fbclid text check (fbclid is null or char_length(fbclid) <= 512),
  add column if not exists traffic_source text check (traffic_source is null or char_length(traffic_source) <= 300),
  add column if not exists utm_source text check (utm_source is null or char_length(utm_source) <= 300),
  add column if not exists utm_medium text check (utm_medium is null or char_length(utm_medium) <= 300),
  add column if not exists utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 300),
  add column if not exists utm_content text check (utm_content is null or char_length(utm_content) <= 300),
  add column if not exists utm_term text check (utm_term is null or char_length(utm_term) <= 300),
  add column if not exists meta_ad_account_id text check (meta_ad_account_id is null or char_length(meta_ad_account_id) <= 160),
  add column if not exists meta_campaign_id text check (meta_campaign_id is null or char_length(meta_campaign_id) <= 160),
  add column if not exists meta_adset_id text check (meta_adset_id is null or char_length(meta_adset_id) <= 160),
  add column if not exists meta_ad_id text check (meta_ad_id is null or char_length(meta_ad_id) <= 160);

-- The owner-only attribution report is bounded by this acquisition timestamp.
create index if not exists meta_order_attribution_created_at_idx
  on public.meta_order_attribution (created_at desc);

create or replace function public.get_meta_attribution_summary(p_limit integer default 30)
returns table (
  traffic_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  meta_ad_account_id text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  order_requests bigint,
  paid_sales bigint,
  lead_events bigint,
  purchase_events bigint,
  purchase_value numeric
)
language sql security definer set search_path = public
as $$
  select
    coalesce(attribution.traffic_source, 'unattributed'),
    attribution.utm_source,
    attribution.utm_medium,
    attribution.utm_campaign,
    attribution.meta_ad_account_id,
    attribution.meta_campaign_id,
    attribution.meta_adset_id,
    attribution.meta_ad_id,
    count(*)::bigint,
    count(*) filter (where orders.status = 'Paid')::bigint,
    count(*) filter (where lead.id is not null)::bigint,
    count(*) filter (where purchase.id is not null)::bigint,
    coalesce(sum(purchase.value), 0)
  from public.meta_order_attribution attribution
  join public.orders orders on orders.id = attribution.order_id
  left join public.meta_event_deliveries lead on lead.order_id = orders.id and lead.event_name = 'Lead'
  left join public.meta_event_deliveries purchase on purchase.order_id = orders.id and purchase.event_name = 'Purchase'
  group by 1, 2, 3, 4, 5, 6, 7, 8
  order by max(attribution.created_at) desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;

revoke all on function public.get_meta_attribution_summary(integer) from public, anon, authenticated;
grant execute on function public.get_meta_attribution_summary(integer) to service_role;
