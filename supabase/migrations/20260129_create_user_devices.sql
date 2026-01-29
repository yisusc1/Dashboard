-- Create table for storing user devices (FCM tokens)
create table public.user_devices (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fcm_token text not null,
  device_name text,
  platform text,
  last_active timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  constraint user_devices_pkey primary key (id),
  constraint user_devices_token_unique unique (fcm_token)
);

-- Enable RLS
alter table public.user_devices enable row level security;

-- Policy: Users can see their own devices
create policy "Users can view their own devices"
on public.user_devices for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own devices
create policy "Users can insert their own devices"
on public.user_devices for insert
with check (auth.uid() = user_id);

-- Policy: Users can update their own devices
create policy "Users can update their own devices"
on public.user_devices for update
using (auth.uid() = user_id);

-- Policy: Users can delete their own devices
create policy "Users can delete their own devices"
on public.user_devices for delete
using (auth.uid() = user_id);
