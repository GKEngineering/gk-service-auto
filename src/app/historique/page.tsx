"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protege } from "@/components/Protege";
import { SERVICES, numeroRapport } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import type { Inspection, TypeService } from "@/lib/types";

type Ligne = Pick<
  Inspection,
  "id" | "numero" | "type" | "created_at" | "client_nom" | "vehicule_marque" | "vehicule_modele" | "vehicule_plaque" | "email_envoye_le"
>;

export default function Historique() {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<TypeService | "">("");
  const [lignes, setLignes] = useState<Ligne[] | null>(null);

  useEffect(() => {
    const minuterie = setTimeout(async () => {
      let requete = supabase()
        .from("inspections")
        .select("id, numero, type, created_at, client_nom, vehicule_marque, vehicule_modele, vehicule_plaque, email_envoye_le")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filtre) requete = requete.eq("type", filtre);
      const terme = recherche.trim().replace(/[%,()]/g, " ");
      if (terme) {
        requete = requete.or(
          ["client_nom", "client_email", "vehicule_plaque", "vehicule_marque", "vehicule_modele"]
            .map((c) => `${c}.ilike.%${terme}%`)
            .join(","),
        );
      }
      const { data } = await requete;
      setLignes((data as Ligne[]) ?? []);
    }, 250);
    return () => clearTimeout(minuterie);
  }, [recherche, filtre]);

  return (
    <Protege titre="Historique" retour="/">
      <h1 className="mb-4 text-2xl font-bold">Historique des inspections</h1>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="champ"
          placeholder="Rechercher : client, plaque, marque…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select className="champ sm:w-56" value={filtre} onChange={(e) => setFiltre(e.target.value as TypeService | "")}>
          <option value="">Toutes les sections</option>
          {(Object.keys(SERVICES) as TypeService[]).map((t) => (
            <option key={t} value={t}>
              {SERVICES[t].titre}
            </option>
          ))}
        </select>
      </div>

      {lignes === null ? (
        <p className="text-slate-500">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="text-slate-500">Aucune inspection.</p>
      ) : (
        <ul className="space-y-2">
          {lignes.map((l) => (
            <li key={l.id}>
              <Link href={`/inspection/${l.id}`} className="carte flex items-center justify-between gap-3 !p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.client_nom}</p>
                  <p className="truncate text-sm text-slate-600">
                    {[l.vehicule_marque, l.vehicule_modele].filter(Boolean).join(" ")}
                    {l.vehicule_plaque && ` · ${l.vehicule_plaque}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {numeroRapport(l.type, l.numero)} · {new Date(l.created_at).toLocaleDateString("fr-CA")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${l.type === "maintenance" ? "bg-marine text-white" : "bg-sky-100 text-sky-800"}`}>
                    {SERVICES[l.type].titre}
                  </span>
                  <span className={`text-xs ${l.email_envoye_le ? "text-emerald-700" : "text-red-600"}`}>
                    {l.email_envoye_le ? "Courriel envoyé" : "Non envoyé"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Protege>
  );
}
