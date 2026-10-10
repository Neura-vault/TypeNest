-- Rate limiting shared across every serverless instance (the old limiter
-- lived in each instance's memory). One atomic upsert per check.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;  -- no policies: only the function below touches it

create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_ms int)
returns table (ok boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_reset timestamptz;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case when r.reset_at < now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_ms / 1000.0) else r.reset_at end
  returning r.count, r.reset_at into v_count, v_reset;

  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 hour';
  end if;

  ok := v_count <= p_limit;
  retry_after := case when ok then 0 else greatest(1, ceil(extract(epoch from (v_reset - now())))::int) end;
  return next;
end;
$$;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
