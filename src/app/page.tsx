"use client";

import Link from "next/link";
import { Protege } from "@/components/Protege";
import { ENTREPRISE } from "@/lib/entreprise";
import { SERVICES } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import type { TypeService } from "@/lib/types";

const ICONES: Record<TypeService, React.ReactNode> = {
  maintenance: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  detailing: (
    <>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </>
  ),
};

export default function Accueil() {
  return (
    <Protege>
      <h1 className="text-2xl font-bold">Nouvelle inspection</h1>
      <p className="mb-5 text-slate-600">Choisissez la section de travail.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(SERVICES) as TypeService[]).map((type) => (
          <Link
            key={type}
            href={`/inspection/nouvelle/${type}`}
            className="carte group flex flex-col gap-3 transition active:scale-[0.99] hover:ring-gk"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gk text-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {ICONES[type]}
              </svg>
            </span>
            <span className="text-xl font-bold">{SERVICES[type].titre}</span>
            <span className="text-slate-600">{SERVICES[type].description}</span>
            <span className="mt-auto font-semibold text-gk">Commencer →</span>
          </Link>
        ))}
      </div>

      <section className="carte mt-6">
        <h2 className="font-semibold">Pour le client</h2>
        <p className="mb-3 text-sm text-slate-500">Forfaits et réservations sur {ENTREPRISE.site}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href={ENTREPRISE.forfaits} target="_blank" rel="noreferrer" className="bouton-secondaire">
            Nos forfaits ↗
          </a>
          <a href={ENTREPRISE.rendezVous} target="_blank" rel="noreferrer" className="bouton-secondaire">
            Prendre rendez-vous ↗
          </a>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/historique" className="bouton-secondaire">
          Historique des inspections
        </Link>
        <button type="button" className="bouton-secondaire" onClick={() => supabase().auth.signOut()}>
          Se déconnecter
        </button>
      </div>
    </Protege>
  );
}
