-- Work requests table — permanent storage for all submitted work requests
-- This is the most durable storage layer (PostgreSQL)

create table if not exists work_requests (
  id text primary key,
  client_name text,
  client_email text,
  client_phone text,
  user_id text,
  service_type text,
  title text,
  description text,
  status text default 'pending',
  data jsonb,  -- full work request payload
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups by email and user
create index if not exists idx_work_requests_client_email on work_requests(client_email);
create index if not exists idx_work_requests_user_id on work_requests(user_id);
create index if not exists idx_work_requests_status on work_requests(status);
create index if not exists idx_work_requests_created on work_requests(created_at desc);

-- Enable RLS but allow service role full access
alter table work_requests enable row level security;

create policy if not exists "Service role full access"
  on work_requests for all
  using (auth.role() = 'service_role');

-- Allow authenticated users to read their own requests
create policy if not exists "Users read own requests"
  on work_requests for select
  using (auth.uid()::text = user_id or auth.email() = client_email);
