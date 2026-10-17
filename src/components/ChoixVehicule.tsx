"use client";

import { useEffect, useState } from "react";
import { ANNEES, MARQUES, chargerModeles, decoderNiv } from "@/lib/vehicules";
import type { Vehicule } from "@/lib/types";

const AUTRE = "__autre";

/** Liste déroulante avec « Autre… » qui bascule vers une saisie libre. */
function ChoixListe({
  libelle,
  valeur,
  options,
  onChange,
  desactive = false,
  vide = "Choisir…",
}: {
  libelle: string;
  valeur: string;
  options: string[];
  onChange: (v: string) => void;
  desactive?: boolean;
  vide?: string;
}) {
  const [modeAutre, setModeAutre] = useState(false);
  // Saisie libre : choisie par l'utilisateur, valeur hors liste (ex. NIV décodé) ou liste vide (hors ligne).
  const autre = modeAutre || (valeur !== "" && !options.includes(valeur)) || (!desactive && options.length === 0);

  return (
    <label className="block">
      <span className="etiquette">{libelle}</span>
      {autre ? (
        <div className="flex gap-2">
          <input className="champ" value={valeur} autoFocus={modeAutre} onChange={(e) => onChange(e.target.value)} />
          {options.length > 0 && (
            <button
              type="button"
              className="shrink-0 text-sm font-medium text-gk"
              onClick={() => {
                setModeAutre(false);
                onChange("");
              }}
            >
              Liste
            </button>
          )}
        </div>
      ) : (
        <select
          className="champ"
          value={valeur}
          disabled={desactive}
          onChange={(e) => {
            if (e.target.value === AUTRE) {
              setModeAutre(true);
              onChange("");
            } else onChange(e.target.value);
          }}
        >
          <option value="">{vide}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={AUTRE}>Autre…</option>
        </select>
      )}
    </label>
  );
}

export function ChoixVehicule({ vehicule, onChange }: { vehicule: Vehicule; onChange: (maj: Partial<Vehicule>) => void }) {
  const [modeles, setModeles] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  const [decodage, setDecodage] = useState<string | null>(null);
  const { marque, annee, modele, vin } = vehicule;

  useEffect(() => {
    setModeles([]);
    if (!marque) return;
    let actif = true;
    setChargement(true);
    chargerModeles(marque, annee)
      .then((liste) => actif && setModeles(liste))
      .catch(() => actif && setModeles([]))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [marque, annee]);

  const remplirAvecNiv = async () => {
    setDecodage("Recherche…");
    try {
      const r = await decoderNiv(vin.trim());
      if (!r) {
        setDecodage("NIV non reconnu.");
        return;
      }
      onChange({ marque: r.marque, modele: r.modele, annee: r.annee });
      setDecodage(`Trouvé : ${[r.marque, r.modele, r.annee].filter(Boolean).join(" ")}`);
    } catch {
      setDecodage("Pas de connexion : remplissez à la main.");
    }
  };

  return (
    <>
      <div className="col-span-2 sm:col-span-3">
        <label className="block">
          <span className="etiquette">NIV (VIN)</span>
          <div className="flex gap-2">
            <input
              className="champ uppercase"
              maxLength={17}
              value={vin}
              onChange={(e) => {
                onChange({ vin: e.target.value.toUpperCase() });
                setDecodage(null);
              }}
            />
            <button
              type="button"
              className="bouton-secondaire shrink-0 !py-2 text-sm"
              disabled={vin.trim().length !== 17 || decodage === "Recherche…"}
              onClick={remplirAvecNiv}
            >
              Remplir avec le NIV
            </button>
          </div>
        </label>
        {decodage && <p className="mt-1 text-sm text-slate-600">{decodage}</p>}
      </div>
      <ChoixListe
        libelle="Marque"
        valeur={marque}
        options={MARQUES}
        onChange={(v) => onChange({ marque: v, modele: "" })}
      />
      <ChoixListe libelle="Année" valeur={annee} options={ANNEES} onChange={(v) => onChange({ annee: v })} />
      <ChoixListe
        libelle="Modèle"
        valeur={modele}
        options={modeles}
        onChange={(v) => onChange({ modele: v })}
        desactive={!marque || chargement}
        vide={!marque ? "Choisir la marque d'abord" : chargement ? "Chargement…" : "Choisir…"}
      />
    </>
  );
}
