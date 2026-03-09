alter table if exists public.shelters
  add column if not exists question_answers jsonb not null default '{}'::jsonb;

update public.shelters
set question_answers = '{}'::jsonb
where question_answers is null;

comment on column public.shelters.question_answers is
  'Canonical per-question answer map keyed by question_attributes.id';
