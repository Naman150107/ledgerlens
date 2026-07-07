-- Create the ledger_entries table for shop transactions
create table if not exists public.ledger_entries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null default current_date,
  description text,
  amount numeric not null default 0,
  confidence numeric not null default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.ledger_entries enable row level security;

-- Create policy to allow anyone to insert (for hackathon demo)
create policy "Allow anonymous insert"
  on public.ledger_entries
  for insert
  with check (true);

-- Create policy to allow anyone to read (for hackathon demo)
create policy "Allow anonymous select"
  on public.ledger_entries
  for select
  using (true);

-- Create policy to allow anyone to update (to edit entries)
create policy "Allow anonymous update"
  on public.ledger_entries
  for update
  using (true);

-- Create policy to allow anyone to delete (for cleaning up transactions)
create policy "Allow anonymous delete"
  on public.ledger_entries
  for delete
  using (true);
