-- One-time cutover recovery: records created earlier today, before the
-- immediate-trigger migration, deserve the same administrator notification.
-- The unique partial indexes make this safe to apply exactly once per record.
insert into public.notification_event_jobs (event_type, order_id)
select 'order', orders.id
from public.orders
where orders.created_at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
on conflict (order_id) where order_id is not null do nothing;

insert into public.notification_event_jobs (event_type, feedback_id)
select 'feedback', customer_feedback.id
from public.customer_feedback
where customer_feedback.created_at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
on conflict (feedback_id) where feedback_id is not null do nothing;
