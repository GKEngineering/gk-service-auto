"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Protege } from "@/components/Protege";
import { envoyerRapport } from "@/lib/enregistrer";
import { ETATS, SERVICES, libelleEtat, numeroRapport } from "@/lib/services";
import { BUCKET, supabase } from "@/lib/supabase";
import type { Inspection } from "@/lib/types";

export default function PageInspection() {
  return (
    <Protege titre="Rapport" retour="/historique">
      <Suspense>
        <DetailInspection />
      </Suspense>
    </Protege>
  );
}

function DetailInspection() {
  const { id } = useParams<{ id: string }>();
  const envoiInitial = useSearchParams().get("envoi");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<"en-cours" | "ok" | "echec" | null>(
    envoiInitial === "ok" || envoiInitial === "echec" ? envoiInitial : null,
  );

  const charger = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb.from("inspections").select("*").eq("id", id).single<Inspection>();
    if (error || !data) {
      setErreur("Inspection introuvable.");
      return;
    }
    setInspection(data);
    const chemins = [...data.photos.map((p) => p.path), data.signature_path, data.pdf_path].filter(
      (c): c is string => !!c,
    );
    if (chemins.length) {
      const { data: signees } = await sb.storage.from(BUCKET).createSignedUrls(chemins, 3600);
      setUrls(Object.fromEntries((signees ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : []))));
    }
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (erreur) return <p className="text-red-600">{erreur}</p>;
  if (!inspection) return <p className="text-slate-500">Chargement…</p>;

  const i = inspection;
  const numero = numeroRapport(i.type, i.numero);
  const evalues = i.checklist.filter((c) => c.etat);

  const renvoyer = async () => {
    setEnvoi("en-cours");
    const r = await envoyerRapport(i.id);
    setEnvoi(r.ok ? "ok" : "echec");
    await charger();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-gk">{SERVICES[i.type].titre}</p>
        <h1 className="text-2xl font-bold">{numero}</h1>
        <p className="text-slate-600">
          {new Date(i.created_at).toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" })}
          {i.technicien && ` · ${i.technicien}`}
        </p>
      </div>

      {envoi === "ok" && (
        <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800 ring-1 ring-emerald-200">
          Rapport envoyé à <b>{i.client_email}</b>.
        </p>
      )}
      {envoi === "echec" && (
        <p className="rounded-lg bg-red-50 p-3 text-red-700 ring-1 ring-red-200">
          L'inspection est enregistrée mais le courriel n'a pas pu être envoyé
          {i.email_erreur ? ` : ${i.email_erreur}` : "."}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {i.pdf_path && urls[i.pdf_path] && (
          <a href={urls[i.pdf_path]} target="_blank" rel="noreferrer" className="bouton">
            Ouvrir le rapport PDF
          </a>
        )}
        <button type="button" onClick={renvoyer} disabled={envoi === "en-cours"} className="bouton-secondaire">
          {envoi === "en-cours" ? "Envoi…" : i.email_envoye_le ? "Renvoyer le courriel" : "Envoyer le courriel"}
        </button>
      </div>

      <section className="carte grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold">Client</h2>
          <p>{i.client_nom}</p>
          <p className="text-slate-600">{i.client_email}</p>
          {i.client_telephone && <p className="text-slate-600">{i.client_telephone}</p>}
          {i.client_adresse && <p className="text-slate-600">{i.client_adresse}</p>}
          <p className="mt-2 text-sm text-slate-500">
            {i.email_envoye_le
              ? `Courriel envoyé le ${new Date(i.email_envoye_le).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}`
              : "Courriel non envoyé"}
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold">Véhicule</h2>
          <p>{[i.vehicule_marque, i.vehicule_modele, i.vehicule_annee].filter(Boolean).join(" ") || "—"}</p>
          <p className="text-slate-600">
            {[i.vehicule_couleur, i.vehicule_plaque && `Plaque ${i.vehicule_plaque}`].filter(Boolean).join(" · ")}
          </p>
          {i.vehicule_vin && <p className="text-slate-600">NIV {i.vehicule_vin}</p>}
          <p className="text-slate-600">
            {[i.vehicule_kilometrage && `${i.vehicule_kilometrage} km`, i.niveau_carburant && `Carburant ${i.niveau_carburant}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </section>

      {i.photos.length > 0 && (
        <section className="carte">
          <h2 className="mb-3 font-semibold">Photos ({i.photos.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {i.photos.map((p) => (
              <a key={p.path} href={urls[p.path]} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[p.path]} alt={p.legende} className="aspect-[4/3] w-full rounded-lg bg-slate-200 object-cover" />
                <p className="mt-1 truncate text-xs font-medium text-slate-600">{p.legende}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="carte">
        <h2 className="mb-3 font-semibold">Fiche d'inspection</h2>
        {evalues.length === 0 ? (
          <p className="text-slate-500">Aucun élément évalué.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {evalues.map((c) => (
              <li key={c.categorie + c.element} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{c.element}</p>
                  {c.commentaire && <p className="text-sm text-slate-600">{c.commentaire}</p>}
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${ETATS.find((e) => e.valeur === c.etat)?.classes}`}>
                  {libelleEtat(c.etat)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {i.notes && (
        <section className="carte">
          <h2 className="mb-2 font-semibold">Remarques</h2>
          <p className="whitespace-pre-wrap text-slate-700">{i.notes}</p>
        </section>
      )}

      {i.signature_path && urls[i.signature_path] && (
        <section className="carte">
          <h2 className="mb-2 font-semibold">Signature du client</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[i.signature_path]} alt="Signature du client" className="h-28" />
        </section>
      )}
    </div>
  );
}
