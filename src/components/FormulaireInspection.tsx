"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { enregistrerInspection } from "@/lib/enregistrer";
import { ETATS, NIVEAUX_CARBURANT, SERVICES, cleElement } from "@/lib/services";
import type { Client, Etat, PhotoLocale, TypeService, Vehicule } from "@/lib/types";
import { ChoixVehicule } from "./ChoixVehicule";
import { CasePhoto, ListePhotos } from "./Photos";
import { Signature } from "./Signature";

interface EtatElement {
  etat: Etat | null;
  commentaire: string;
  photos: PhotoLocale[];
}

const CLE_TECHNICIEN = "gk-technicien";

export function FormulaireInspection({ type }: { type: TypeService }) {
  const service = SERVICES[type];
  const router = useRouter();

  const [technicien, setTechnicien] = useState("");
  const [client, setClient] = useState<Client>({ nom: "", email: "", telephone: "", adresse: "" });
  const [vehicule, setVehicule] = useState<Vehicule>({
    marque: "", modele: "", annee: "", couleur: "", plaque: "", vin: "", kilometrage: "", carburant: "",
  });
  const [vues, setVues] = useState<Record<string, PhotoLocale | null>>({});
  const [photosSupp, setPhotosSupp] = useState<PhotoLocale[]>([]);
  const [elements, setElements] = useState<Record<string, EtatElement>>({});
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [etape, setEtape] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTechnicien(localStorage.getItem(CLE_TECHNICIEN) ?? "");
    } catch {}
  }, []);

  const element = (cle: string): EtatElement => elements[cle] ?? { etat: null, commentaire: "", photos: [] };
  const majElement = (cle: string, maj: Partial<EtatElement>) =>
    setElements((prec) => ({ ...prec, [cle]: { ...element(cle), ...maj } }));

  const progression = useMemo(() => {
    const total = service.categories.reduce((n, c) => n + c.elements.length, 0);
    const faits = Object.values(elements).filter((e) => e.etat).length;
    return { total, faits };
  }, [elements, service]);

  const champClient = (cle: keyof Client) => ({
    value: client[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setClient({ ...client, [cle]: e.target.value }),
  });
  const champVehicule = (cle: keyof Vehicule) => ({
    value: vehicule[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setVehicule({ ...vehicule, [cle]: e.target.value }),
  });

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!signature) {
      setErreur("La signature du client est requise.");
      return;
    }
    const vuesManquantes = service.vuesPhotos.filter((v) => !vues[v]);
    if (
      vuesManquantes.length > 0 &&
      !confirm(`Photos manquantes : ${vuesManquantes.join(", ")}.\n\nEnvoyer le rapport quand même ?`)
    ) {
      return;
    }

    try {
      localStorage.setItem(CLE_TECHNICIEN, technicien);
    } catch {}

    setEtape("Préparation…");
    try {
      const { id, envoi } = await enregistrerInspection(
        {
          type,
          technicien,
          client,
          vehicule,
          notes,
          signatureDataUrl: signature,
          vues: service.vuesPhotos.flatMap((legende) => (vues[legende] ? [{ legende, photo: vues[legende]! }] : [])),
          photosSupp,
          checklist: service.categories.flatMap((cat) =>
            cat.elements.map((nom) => ({ categorie: cat.nom, element: nom, ...element(cleElement(cat.nom, nom)) })),
          ),
        },
        setEtape,
      );
      router.push(`/inspection/${id}?envoi=${envoi.ok ? "ok" : "echec"}`);
    } catch (err) {
      setEtape(null);
      setErreur(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{service.titre}</h1>
        <p className="text-slate-600">{service.description}</p>
      </div>

      <section className="carte space-y-3">
        <h2 className="text-lg font-semibold">Client</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="etiquette">Nom complet *</span>
            <input className="champ" required autoComplete="off" {...champClient("nom")} />
          </label>
          <label>
            <span className="etiquette">Courriel * (le rapport y sera envoyé)</span>
            <input className="champ" type="email" required inputMode="email" autoComplete="off" {...champClient("email")} />
          </label>
          <label>
            <span className="etiquette">Téléphone</span>
            <input className="champ" type="tel" inputMode="tel" {...champClient("telephone")} />
          </label>
          <label>
            <span className="etiquette">Adresse d'intervention</span>
            <input className="champ" {...champClient("adresse")} />
          </label>
        </div>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-lg font-semibold">Véhicule</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ChoixVehicule vehicule={vehicule} onChange={(maj) => setVehicule((v) => ({ ...v, ...maj }))} />
          <label>
            <span className="etiquette">Couleur</span>
            <input className="champ" {...champVehicule("couleur")} />
          </label>
          <label>
            <span className="etiquette">Plaque</span>
            <input className="champ uppercase" {...champVehicule("plaque")} />
          </label>
          <label>
            <span className="etiquette">Kilométrage</span>
            <input className="champ" inputMode="numeric" {...champVehicule("kilometrage")} />
          </label>
          <label>
            <span className="etiquette">Carburant</span>
            <select className="champ" {...champVehicule("carburant")}>
              <option value="">—</option>
              {NIVEAUX_CARBURANT.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="carte space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Photos de l'état du véhicule</h2>
          <p className="text-sm text-slate-500">À prendre à l'arrivée, avant de toucher au véhicule.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {service.vuesPhotos.map((legende) => (
            <CasePhoto
              key={legende}
              legende={legende}
              photo={vues[legende] ?? null}
              onChange={(p) => setVues((prec) => ({ ...prec, [legende]: p }))}
            />
          ))}
        </div>
        <div>
          <p className="etiquette">Photos supplémentaires (dommages, détails…)</p>
          <ListePhotos photos={photosSupp} onChange={setPhotosSupp} libelle="Ajouter" />
        </div>
      </section>

      <section className="carte space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Fiche d'inspection</h2>
          <span className="text-sm text-slate-500">
            {progression.faits}/{progression.total} évalués
          </span>
        </div>
        {service.categories.map((cat) => (
          <div key={cat.nom}>
            <h3 className="mt-2 mb-2 text-sm font-bold tracking-wide text-gk uppercase">{cat.nom}</h3>
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {cat.elements.map((nom) => {
                const cle = cleElement(cat.nom, nom);
                const el = element(cle);
                const deplie = ouvert === cle;
                return (
                  <li key={cle} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-left font-medium"
                        onClick={() => setOuvert(deplie ? null : cle)}
                      >
                        {nom}
                        {(el.commentaire || el.photos.length > 0) && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {el.photos.length > 0 && `${el.photos.length} photo(s)`} {el.commentaire && "• note"}
                          </span>
                        )}
                      </button>
                      <div className="flex gap-1">
                        {ETATS.map((e) => (
                          <button
                            key={e.valeur}
                            type="button"
                            onClick={() => {
                              majElement(cle, { etat: el.etat === e.valeur ? null : e.valeur });
                              if (e.valeur === "defaut" || e.valeur === "surveiller") setOuvert(cle);
                            }}
                            className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                              el.etat === e.valeur ? e.classes : "border-slate-300 bg-white text-slate-600"
                            }`}
                          >
                            {e.libelle === "Défaut / dommage" ? "Défaut" : e.libelle}
                          </button>
                        ))}
                      </div>
                    </div>
                    {deplie && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          className="champ min-h-16"
                          placeholder="Commentaire (ex. : usure 3 mm, rayure portière avant…)"
                          value={el.commentaire}
                          onChange={(e) => majElement(cle, { commentaire: e.target.value })}
                        />
                        <ListePhotos
                          compact
                          photos={el.photos}
                          onChange={(photos) => majElement(cle, { photos })}
                          libelle="Photo"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="carte space-y-3">
        <h2 className="text-lg font-semibold">Remarques / dommages constatés</h2>
        <textarea
          className="champ min-h-28"
          placeholder="Décrivez tout dommage existant, objet de valeur laissé dans le véhicule, recommandation…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <label className="block">
          <span className="etiquette">Technicien</span>
          <input className="champ" value={technicien} onChange={(e) => setTechnicien(e.target.value)} />
        </label>
      </section>

      <section className="carte space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Signature du client *</h2>
          <p className="text-sm text-slate-500">
            Le client confirme l'état du véhicule constaté avant le début des travaux.
          </p>
        </div>
        <Signature onChange={setSignature} />
      </section>

      {erreur && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erreur}</p>}

      <button type="submit" className="bouton w-full text-lg" disabled={!!etape}>
        Enregistrer et envoyer le rapport au client
      </button>

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
