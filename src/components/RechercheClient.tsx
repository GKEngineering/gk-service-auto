"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { prix, totaux } from "@/lib/entreprise";
import { SERVICES, libelleEtat, numeroRapport } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import type { Inspection } from "@/lib/types";

const COLONNES =
  "id, numero, type, created_at, client_nom, client_email, client_telephone, client_adresse, vehicule_marque, vehicule_modele, vehicule_annee, vehicule_couleur, vehicule_plaque, vehicule_vin, vehicule_kilometrage, checklist, travaux, soumission_statut";

/** Retire les caractères réservés des filtres PostgREST (virgules, parenthèses, %). */
const nettoyer = (s: string) => s.trim().replace(/[%,()*\\]/g, " ").trim();

const vehicule = (i: Pick<Inspection, "vehicule_marque" | "vehicule_modele" | "vehicule_annee">) =>
  [i.vehicule_marque, i.vehicule_modele, i.vehicule_annee].filter(Boolean).join(" ");

/** Recherche un client déjà venu (nom, courriel, téléphone ou plaque). Un résultat par client + véhicule. */
export function RechercheClient({ onChoisir }: { onChoisir: (i: Inspection) => void }) {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<Inspection[]>([]);
  const [recherche, setRecherche] = useState(false);

  useEffect(() => {
    const t = nettoyer(terme);
    if (t.length < 2) {
      setResultats([]);
      return;
    }
    const minuterie = setTimeout(async () => {
      setRecherche(true);
      const { data } = await supabase()
        .from("inspections")
        .select(COLONNES)
        .or(["client_nom", "client_email", "client_telephone", "vehicule_plaque"].map((c) => `${c}.ilike.%${t}%`).join(","))
        .order("created_at", { ascending: false })
        .limit(40);
      const vus = new Set<string>();
      const uniques = ((data ?? []) as unknown as Inspection[]).filter((i) => {
        const cle = `${i.client_email.toLowerCase()}|${(i.vehicule_plaque ?? "").toUpperCase()}`;
        if (vus.has(cle)) return false;
        vus.add(cle);
        return true;
      });
      setResultats(uniques.slice(0, 8));
      setRecherche(false);
    }, 300);
    return () => clearTimeout(minuterie);
  }, [terme]);

  return (
    <div>
      <input
        className="champ"
        type="search"
        placeholder="Nom, courriel, téléphone ou plaque…"
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
      />
      {recherche && <p className="mt-2 text-sm text-slate-500">Recherche…</p>}
      {!recherche && nettoyer(terme).length >= 2 && resultats.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">Aucun client trouvé : remplissez la fiche ci-dessous.</p>
      )}
      {resultats.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {resultats.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => {
                  onChoisir(i);
                  setTerme("");
                  setResultats([]);
                }}
              >
                <span className="block font-medium">{i.client_nom}</span>
                <span className="block text-sm text-slate-600">
                  {[vehicule(i), i.vehicule_plaque].filter(Boolean).join(" · ") || i.client_email}
                </span>
                <span className="block text-xs text-slate-500">
                  Dernière visite : {new Date(i.created_at).toLocaleDateString("fr-CA")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Historique du véhicule (même plaque ou NIV, sinon même client) et points laissés en suspens. */
export function HistoriqueVehicule({ reference }: { reference: Inspection }) {
  const [visites, setVisites] = useState<Inspection[] | null>(null);

  useEffect(() => {
    const plaque = nettoyer(reference.vehicule_plaque ?? "");
    const vin = nettoyer(reference.vehicule_vin ?? "");
    const filtres = [plaque && `vehicule_plaque.ilike.${plaque}`, vin && `vehicule_vin.ilike.${vin}`].filter(Boolean);
    let requete = supabase().from("inspections").select(COLONNES).order("created_at", { ascending: false }).limit(10);
    requete = filtres.length ? requete.or(filtres.join(",")) : requete.ilike("client_email", nettoyer(reference.client_email));
    requete.then(({ data }) => setVisites((data ?? []) as unknown as Inspection[]));
  }, [reference]);

  if (!visites) return <p className="text-sm text-slate-500">Chargement de l'historique…</p>;
  if (visites.length === 0) return null;

  const derniere = visites[0];
  const aSurveiller = derniere.checklist.filter((c) => c.etat === "defaut" || c.etat === "surveiller");
  const refuses = derniere.travaux.filter((t) => t.approuve === false);

  return (
    <div className="space-y-3 rounded-lg bg-sky-50 p-3 ring-1 ring-sky-200">
      <p className="text-sm font-semibold text-gk">
        Historique du véhicule · {visites.length} visite{visites.length > 1 ? "s" : ""}
        {derniere.vehicule_kilometrage && ` · dernier kilométrage : ${derniere.vehicule_kilometrage} km`}
      </p>

      {aSurveiller.length > 0 && (
        <div>
          <p className="text-sm font-medium">À vérifier (dernière visite du {new Date(derniere.created_at).toLocaleDateString("fr-CA")}) :</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {aSurveiller.map((c) => (
              <li key={c.categorie + c.element}>
                <span className={c.etat === "defaut" ? "font-semibold text-red-600" : "font-semibold text-amber-600"}>
                  {libelleEtat(c.etat)}
                </span>{" "}
                – {c.element}
                {c.commentaire && <span className="text-slate-600"> ({c.commentaire})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {refuses.length > 0 && (
        <div>
          <p className="text-sm font-medium">Travaux refusés la dernière fois ({prix(totaux(refuses).sousTotal)} avant taxes) :</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {refuses.map((t) => (
              <li key={t.id}>
                {t.description} – {prix(t.prix)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-1 text-sm">
        {visites.map((v) => (
          <li key={v.id}>
            <Link href={`/inspection/${v.id}`} target="_blank" className="text-gk underline">
              {numeroRapport(v.type, v.numero)}
            </Link>{" "}
            · {new Date(v.created_at).toLocaleDateString("fr-CA")} · {SERVICES[v.type].titre}
          </li>
        ))}
      </ul>
    </div>
  );
}
