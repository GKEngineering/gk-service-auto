"use client";

import { prix, totaux } from "@/lib/entreprise";
import { uid } from "@/lib/images";
import type { Travail } from "@/lib/types";

export function nouveauTravail(element?: string): Travail {
  return { id: uid(), description: "", element, prix: 0, approuve: null };
}

/** Une ligne de travail : description + prix avant taxes. */
export function LigneTravail({
  travail,
  onChange,
  onRetirer,
  afficherElement = true,
}: {
  travail: Travail;
  onChange: (t: Travail) => void;
  onRetirer: () => void;
  afficherElement?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
      {afficherElement && travail.element && <p className="mb-1 px-1 text-xs font-medium text-slate-500">{travail.element}</p>}
      <div className="flex items-center gap-2">
        <input
          className="champ !py-2"
          placeholder="Travail recommandé (ex. : remplacer plaquettes avant)"
          value={travail.description}
          onChange={(e) => onChange({ ...travail, description: e.target.value })}
        />
        <div className="relative w-28 shrink-0">
          <input
            className="champ !py-2 pr-6 text-right"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0"
            aria-label="Prix avant taxes"
            value={travail.prix || ""}
            onChange={(e) => onChange({ ...travail, prix: Math.max(0, parseFloat(e.target.value) || 0) })}
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-500">$</span>
        </div>
        <button
          type="button"
          onClick={onRetirer}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-200"
          aria-label="Retirer ce travail"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Liste complète des travaux recommandés avec totaux (TPS / TVQ). */
export function EditeurTravaux({ travaux, onChange }: { travaux: Travail[]; onChange: (t: Travail[]) => void }) {
  const t = totaux(travaux);
  return (
    <div className="space-y-2">
      {travaux.length === 0 && (
        <p className="text-sm text-slate-500">
          Aucun travail recommandé. Ajoutez-en ici ou depuis un élément « Défaut » / « À surveiller » de la fiche.
        </p>
      )}
      {travaux.map((tr) => (
        <LigneTravail
          key={tr.id}
          travail={tr}
          onChange={(n) => onChange(travaux.map((x) => (x.id === tr.id ? n : x)))}
          onRetirer={() => onChange(travaux.filter((x) => x.id !== tr.id))}
        />
      ))}
      <button type="button" className="bouton-secondaire w-full text-sm" onClick={() => onChange([...travaux, nouveauTravail()])}>
        + Ajouter un travail
      </button>
      {travaux.length > 0 && (
        <dl className="space-y-1 pt-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Sous-total</dt>
            <dd>{prix(t.sousTotal)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>TPS (5 %) + TVQ (9,975 %)</dt>
            <dd>{prix(t.tps + t.tvq)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total estimé</dt>
            <dd>{prix(t.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
