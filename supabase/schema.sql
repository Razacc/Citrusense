-- Jalankan di Supabase: SQL Editor > New query > Run
create table if not exists public.sensor_data (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  suhu real,
  kelembapan_udara real,
  rata_rata_tanah real,
  tds real,
  jarak_air real,
  ph real
);
create index if not exists sensor_data_created_idx on public.sensor_data (created_at desc);

alter table public.sensor_data enable row level security;
create policy "dashboard boleh membaca" on public.sensor_data for select to anon using (true);
create policy "perangkat boleh mengirim" on public.sensor_data for insert to anon with check (true);

-- Aktifkan Realtime agar dashboard update otomatis
alter publication supabase_realtime add table public.sensor_data;
