-- GK Service Auto : à exécuter une fois dans Supabase > SQL Editor.

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  type text not null check (type in ('maintenance', 'detailing')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid(),
  technicien text,

  client_nom text not null,
  client_email text not null,
  client_telephone text,
  client_adresse text,

  vehicule_marque text,
  vehicule_modele text,
  vehicule_annee text,
  vehicule_couleur text,
  vehicule_plaque text,
  vehicule_vin text,
  vehicule_kilometrage text,
  niveau_carburant text,

  -- [{ categorie, element, etat, commentaire, photos: [path] }]
  checklist jsonb not null default '[]'::jsonb,
  -- [{ path, legende, element? }]
  photos jsonb not null default '[]'::jsonb,
  notes text,

  signature_path text,
  pdf_path text,
  email_envoye_le timestamptz,
  email_erreur text
);

create index if not exists inspections_created_at_idx on public.inspections (created_at desc);

-- Seuls les techniciens connectés (comptes créés dans Authentication > Users) ont accès.
alter table public.inspections enable row level security;

drop policy if exists "techniciens lecture" on public.inspections;
create policy "techniciens lecture" on public.inspections
  for select to authenticated using (true);

drop policy if exists "techniciens ajout" on public.inspections;
create policy "techniciens ajout" on public.inspections
  for insert to authenticated with check (true);

drop policy if exists "techniciens modification" on public.inspections;
create policy "techniciens modification" on public.inspections
  for update to authenticated using (true) with check (true);

-- Stockage privé des photos, signatures et rapports PDF.
insert into storage.buckets (id, name, public)
values ('inspections', 'inspections', false)
on conflict (id) do nothing;

drop policy if exists "techniciens lecture fichiers" on storage.objects;
create policy "techniciens lecture fichiers" on storage.objects
  for select to authenticated using (bucket_id = 'inspections');

drop policy if exists "techniciens ajout fichiers" on storage.objects;
create policy "techniciens ajout fichiers" on storage.objects
  for insert to authenticated with check (bucket_id = 'inspections');

drop policy if exists "techniciens modification fichiers" on storage.objects;
create policy "techniciens modification fichiers" on storage.objects
  for update to authenticated using (bucket_id = 'inspections');

-- ============================================================
-- Migration 002 (déjà incluse ici pour une nouvelle installation)
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
