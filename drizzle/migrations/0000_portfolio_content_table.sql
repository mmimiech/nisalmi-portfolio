create table public.portfolio_content (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.portfolio_content (id, data) values (1, '{}'::jsonb);

grant select on public.portfolio_content to anon, authenticated;
grant update on public.portfolio_content to authenticated;
grant all on public.portfolio_content to service_role;

alter table public.portfolio_content enable row level security;

create policy "Anyone can view portfolio"
  on public.portfolio_content for select
  using (true);

create policy "Only the owner can edit the portfolio"
  on public.portfolio_content for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'ccaptain.ain011060@gmail.com')
  with check (auth.jwt() ->> 'email' = 'ccaptain.ain011060@gmail.com');