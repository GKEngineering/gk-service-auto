-- GK Service Auto : travaux recommandés (soumission), rapport de fin de travaux, recherche client.
-- À exécuter une fois dans Supabase > SQL Editor (après schema.sql).

alter table public.inspections
  -- [{ id, description, element?, prix, approuve: true | false | null }]
  add column if not exists travaux jsonb not null default '[]'::jsonb,
  add column if not exists soumission_token uuid not null default gen_random_uuid(),
  add column if not exists soumission_statut text check (soumission_statut in ('en_attente', 'repondue')),
  add column if not exists soumission_reponse_le timestamptz,

  -- [{ path, legende }]
  add column if not exists fin_photos jsonb not null default '[]'::jsonb,
  add column if not exists fin_notes text,
  add column if not exists fin_pdf_path text,
  add column if not exists fin_le timestamptz,
  add column if not exists fin_email_envoye_le timestamptz;

create unique index if not exists inspections_soumission_token_idx on public.inspections (soumission_token);
create index if not exists inspections_plaque_idx on public.inspections (upper(vehicule_plaque));
create index if not exists inspections_email_idx on public.inspections (lower(client_email));
