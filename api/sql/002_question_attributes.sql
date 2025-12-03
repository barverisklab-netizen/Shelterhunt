create table if not exists public.question_attributes (
  id text primary key,
  label text not null,
  kind text not null check (kind in ('number', 'select')),
  options jsonb not null default '[]',
  created_at timestamptz not null default now()
);

comment on table public.question_attributes is 'Precomputed question metadata derived from shelter GeoJSON';
comment on column public.question_attributes.id is 'Stable attribute identifier (e.g. floodDepth, facilityType)';
comment on column public.question_attributes.label is 'Human-readable label used in prompts';
comment on column public.question_attributes.kind is 'number or select, determines UI control';
comment on column public.question_attributes.options is 'Unique categorical values for select-kind attributes';
