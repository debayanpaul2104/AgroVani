create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  village text default '',
  district text not null,
  state text default '',
  crop_type text not null default 'Rice',
  area_in_acres numeric not null default 1,
  latitude double precision not null,
  longitude double precision not null,
  soil_ph numeric,
  nitrogen_kg_per_ha numeric,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.machinery (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  provider text not null,
  district text not null,
  price_per_acre numeric not null default 0,
  available boolean not null default true,
  lat double precision,
  lon double precision
);

create table if not exists public.district_metrics (
  id uuid primary key default gen_random_uuid(),
  district text not null unique,
  rate numeric not null default 0,
  buyer_demand text not null default 'Medium',
  machinery_readiness numeric not null default 0,
  hotspots numeric not null default 0,
  state text not null default 'India'
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms(id) on delete set null,
  farmer_name text not null,
  machinery_type text not null,
  provider text default '',
  district text default '',
  booking_date date not null default current_date,
  acres numeric not null default 1,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table if not exists public.stress_diagnostic_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms(id) on delete set null,
  tmax numeric,
  tmin numeric,
  diurnal_score numeric,
  night_score numeric,
  frost_score numeric,
  drought_index numeric,
  recommended_product text,
  spray_window_start timestamptz,
  created_at timestamptz not null default now()
);

alter table public.farms enable row level security;
alter table public.machinery enable row level security;
alter table public.district_metrics enable row level security;
alter table public.bookings enable row level security;
alter table public.stress_diagnostic_logs enable row level security;