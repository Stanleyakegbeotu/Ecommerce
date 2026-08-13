-- A permanent human-facing sequence helps operations count all order requests
-- without replacing the existing canonical/public-safe order ID.
create sequence if not exists public.order_display_number_seq as bigint minvalue 1 start with 1;

alter table public.orders add column if not exists display_number bigint;

with numbered_orders as (
  select id, row_number() over (order by created_at asc, id asc)::bigint as display_number
  from public.orders
  where display_number is null
)
update public.orders
set display_number = numbered_orders.display_number
from numbered_orders
where orders.id = numbered_orders.id;

alter table public.orders alter column display_number set default nextval('public.order_display_number_seq');

select setval(
  'public.order_display_number_seq',
  greatest(coalesce((select max(display_number) from public.orders), 1), 1),
  exists(select 1 from public.orders)
);

alter table public.orders alter column display_number set not null;
alter table public.orders add constraint orders_display_number_positive check (display_number > 0);
alter table public.orders add constraint orders_display_number_key unique (display_number);
