"use client";

import { useRef, useState } from "react";
import { preparerPhoto } from "@/lib/images";
import type { PhotoLocale } from "@/lib/types";

function useSelecteur(surPhotos: (photos: PhotoLocale[]) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [chargement, setChargement] = useState(false);

  const champ = (multiple: boolean) => (
    <input
      ref={input}
      type="file"
      accept="image/*"
      multiple={multiple}
      className="hidden"
      onChange={async (e) => {
        const fichiers = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (fichiers.length === 0) return;
        setChargement(true);
        try {
          surPhotos(await Promise.all(fichiers.map(preparerPhoto)));
        } catch {
          alert("Impossible de lire cette photo.");
        } finally {
          setChargement(false);
        }
      }}
    />
  );
  return { ouvrir: () => input.current?.click(), chargement, champ };
}

function Vignette({ photo, onRetirer, className = "" }: { photo: PhotoLocale; onRetirer: () => void; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.apercu} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRetirer}
        className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm text-white"
        aria-label="Retirer la photo"
      >
        ✕
      </button>
    </div>
  );
}

/** Une case pour une vue imposée (Avant, Arrière…). */
export function CasePhoto({
  legende,
  photo,
  onChange,
}: {
  legende: string;
  photo: PhotoLocale | null;
  onChange: (photo: PhotoLocale | null) => void;
}) {
  const { ouvrir, chargement, champ } = useSelecteur((p) => onChange(p[0]));
  return (
    <div>
      {champ(false)}
      {photo ? (
        <Vignette photo={photo} onRetirer={() => onChange(null)} className="aspect-[4/3]" />
      ) : (
        <button
          type="button"
          onClick={ouvrir}
          disabled={chargement}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 active:bg-slate-100"
        >
          <IconeAppareil />
          <span className="text-xs">{chargement ? "Traitement…" : "Prendre la photo"}</span>
        </button>
      )}
      <p className="mt-1 truncate text-xs font-medium text-slate-600">{legende}</p>
    </div>
  );
}

/** Liste libre de photos (photos supplémentaires, photos d'un élément). */
export function ListePhotos({
  photos,
  onChange,
  libelle = "Ajouter des photos",
  compact = false,
}: {
  photos: PhotoLocale[];
  onChange: (photos: PhotoLocale[]) => void;
  libelle?: string;
  compact?: boolean;
}) {
  const { ouvrir, chargement, champ } = useSelecteur((p) => onChange([...photos, ...p]));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {champ(true)}
      {photos.map((p) => (
        <Vignette
          key={p.id}
          photo={p}
          onRetirer={() => onChange(photos.filter((x) => x.id !== p.id))}
          className={compact ? "h-16 w-16" : "h-24 w-24"}
        />
      ))}
      <button
        type="button"
        onClick={ouvrir}
        disabled={chargement}
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 active:bg-slate-100"
            : "flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500"
        }
      >
        <IconeAppareil />
        <span className="text-xs">{chargement ? "Traitement…" : libelle}</span>
      </button>
    </div>
  );
}

function IconeAppareil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
