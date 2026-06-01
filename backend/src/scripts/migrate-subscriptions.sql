-- Run this in Supabase SQL Editor

create table if not exists subscriptions (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade,
  plan            text        not null default 'free',   -- 'free' | 'pro' | 'enterprise'
  billing         text,                                  -- 'monthly' | 'annual'
  status          text        not null default 'pending', -- 'pending' | 'active' | 'cancelled' | 'expired'
  payos_order_code bigint,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

-- RLS: users can only read their own subscription
alter table subscriptions enable row level security;

create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Service role can do everything (used by backend)
create policy "Service role full access"
  on subscriptions for all
  using (true)
  with check (true);
