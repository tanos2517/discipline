-- STAY HARD: схема облака (Supabase → SQL Editor → Run)
create table if not exists clans    (tag text primary key, created_at timestamptz default now());
create table if not exists members  (clan text not null, uid text not null, name text not null,
                                     streak int default 0, total int default 0, updated_at timestamptz default now(),
                                     primary key (clan, uid));
create table if not exists workouts (id text primary key, clan text not null, uid text not null, name text,
                                     ex text, amount int, unit text, form int, ts bigint);
create table if not exists messages (id text primary key, clan text not null, uid text not null, name text,
                                     text text, kind text default 'chat', ts bigint);
create index if not exists messages_clan_ts on messages (clan, ts desc);

alter table clans    enable row level security;
alter table members  enable row level security;
alter table workouts enable row level security;
alter table messages enable row level security;

-- ВНИМАНИЕ: политики ниже открывают чтение/запись любому владельцу anon-ключа (для старта и друзей).
-- Для публичного релиза добавь Supabase Auth и ограничь политики по auth.uid().
do $$ begin
  create policy "open clans"    on clans    for all to anon using (true) with check (true);
  create policy "open members"  on members  for all to anon using (true) with check (true);
  create policy "open workouts" on workouts for all to anon using (true) with check (true);
  create policy "open messages" on messages for all to anon using (true) with check (true);
exception when duplicate_object then null; end $$;
