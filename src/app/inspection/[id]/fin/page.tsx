"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CasePhoto, ListePhotos } from "@/components/Photos";
import { Protege } from "@/components/Protege";
import { enregistrerFin } from "@/lib/enregistrer";
import { SERVICES, numeroRapport } from "@/lib/services";
import { BUCKET, supabase } from "@/lib/supabase";
import type { Inspection, PhotoLocale } from "@/lib/types";

export default function PageFinTravaux() {
  return (
    <Protege titre="Fin de travaux" retour="/historique">
      <FormulaireFin />
    </Protege>
  );
}

function FormulaireFin() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [urlsAvant, setUrlsAvant] = useState<Record<string, string>>({});
  const [apres, setApres] = useState<Record<string, PhotoLocale | null>>({});
  const [photosSupp, setPhotosSupp] = useState<PhotoLocale[]>([]);
  const [notes, setNotes] = useState("");
  const [technicien, setTechnicien] = useState("");
  const [etape, setEtape] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data } = await sb.from("inspections").select("*").eq("id", id).single<Inspection>();
      if (!data) {
        setErreur("Inspection introuvable.");
        return;
      }
      setInspection(data);
      try {
        setTechnicien(localStorage.getItem("gk-technicien") ?? data.technicien ?? "");
      } catch {
        setTechnicien(data.technicien ?? "");
      }
      const avant = data.photos.filter((p) => !p.element);
      if (avant.length) {
        const { data: signees } = await sb.storage.from(BUCKET).createSignedUrls(avant.map((p) => p.path), 3600);
        const parChemin = new Map((signees ?? []).map((s) => [s.path, s.signedUrl]));
        setUrlsAvant(Object.fromEntries(avant.map((p) => [p.legende, parChemin.get(p.path) ?? ""])));
      }
    })();
  }, [id]);

  if (erreur && !inspection) return <p className="text-red-600">{erreur}</p>;
  if (!inspection) return <p className="text-slate-500">Chargement…</p>;

  const i = inspection;
  const service = SERVICES[i.type];
  const vehicule = [i.vehicule_marque, i.vehicule_modele, i.vehicule_annee].filter(Boolean).join(" ");

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    const nbApres = Object.values(apres).filter(Boolean).length + photosSupp.length;
    if (nbApres === 0) {
      setErreur("Ajoutez au moins une photo après travaux.");
      return;
    }
    if (i.fin_le && !confirm("Un rapport de fin de travaux existe déjà. Le remplacer et le renvoyer au client ?")) return;
    setEtape("Préparation…");
    try {
      const envoi = await enregistrerFin(i, { apres, photosSupp, notes, technicien }, setEtape);
      router.push(`/inspection/${i.id}?fin=${envoi.ok ? "ok" : "echec"}`);
    } catch (err) {
      setEtape(null);
      setErreur(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-gk">
          {service.titre} · {numeroRapport(i.type, i.numero)}
        </p>
        <h1 className="text-2xl font-bold">Rapport de fin de travaux</h1>
        <p className="text-slate-600">
          {i.client_nom}
          {vehicule && ` · ${vehicule}`}
          {i.vehicule_plaque && ` · ${i.vehicule_plaque}`}
        </p>
      </div>

      <section className="carte space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Photos avant / après</h2>
          <p className="text-sm text-slate-500">Reprenez chaque photo sous le même angle que celle d'avant.</p>
        </div>
        <div className="space-y-4">
          {service.vuesPhotos.map((legende) => (
            <div key={legende}>
              <p className="mb-1 text-sm font-semibold">{legende}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {urlsAvant[legende] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlsAvant[legende]} alt={`${legende} avant`} className="aspect-[4/3] w-full rounded-lg bg-slate-200 object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-lg bg-slate-100 text-xs text-slate-400">
                      Pas de photo avant
                    </div>
                  )}
                  <p className="mt-1 text-xs font-medium text-slate-500">AVANT</p>
                </div>
                <CasePhoto
                  legende="APRÈS"
                  photo={apres[legende] ?? null}
                  onChange={(p) => setApres((prec) => ({ ...prec, [legende]: p }))}
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="etiquette">Autres photos après travaux</p>
          <ListePhotos photos={photosSupp} onChange={setPhotosSupp} libelle="Ajouter" />
        </div>
      </section>

      <section className="carte space-y-3">
        <label className="block">
          <span className="etiquette">Travaux effectués / message au client</span>
          <textarea
            className="champ min-h-28"
            placeholder="Ex. : lavage extérieur complet, décontamination, cire ; intérieur aspiré, sièges shampouinés…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="etiquette">Technicien</span>
          <input className="champ" value={technicien} onChange={(e) => setTechnicien(e.target.value)} />
        </label>
      </section>

      {erreur && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erreur}</p>}

      <button type="submit" className="bouton w-full text-lg" disabled={!!etape}>
        Envoyer le rapport de fin au client
      </button>
      <Link href={`/inspection/${i.id}`} className="block text-center text-sm text-slate-500">
        Annuler
      </Link>

      {etape && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-marine/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-gk" />
            <p className="font-medium">{etape}</p>
            <p className="mt-1 text-sm text-slate-500">Ne fermez pas l'application.</p>
          </div>
        </div>
      )}
    </form>
  );
}
