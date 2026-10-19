"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ENTREPRISE, prix, totaux } from "@/lib/entreprise";
import type { Travail } from "@/lib/types";

interface Soumission {
  numero: string;
  service: string;
  date: string;
  client: string;
  vehicule: string;
  plaque: string | null;
  travaux: Travail[];
  statut: "en_attente" | "repondue" | null;
  reponduLe: string | null;
}

/** Page publique où le client approuve (en tout ou en partie) les travaux recommandés. */
export default function PageSoumission() {
  const { token } = useParams<{ token: string }>();
  const [s, setS] = useState<Soumission | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    fetch(`/api/soumission/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Cette soumission est introuvable ou le lien n'est plus valide.");
        const d = (await r.json()) as Soumission;
        setS(d);
        setChoisis(new Set(d.travaux.map((t) => t.id)));
      })
      .catch((e: Error) => setErreur(e.message));
  }, [token]);

  const repondre = async (approuves: string[]) => {
    setEnvoi(true);
    setErreur(null);
    const r = await fetch(`/api/soumission/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approuves }),
    });
    const d = await r.json();
    setEnvoi(false);
    if (r.ok) setS(d as Soumission);
    else setErreur((d as { erreur?: string }).erreur ?? "Une erreur est survenue.");
  };

  const repondu = s?.statut === "repondue";
  const selection = s ? s.travaux.filter((t) => (repondu ? t.approuve : choisis.has(t.id))) : [];
  const t = totaux(selection);

  return (
    <div className="min-h-dvh">
      <header className="border-b-4 border-gk bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2">
          <div />
          <a href={`https://${ENTREPRISE.site}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-entete.png" alt="GK Service Auto" className="h-10 w-auto" />
          </a>
          <a href={ENTREPRISE.telephoneLien} className="text-right text-xs font-semibold text-gk sm:text-sm">
            {ENTREPRISE.telephone}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {!s && !erreur && <p className="text-slate-500">Chargement…</p>}
        {erreur && <p className="rounded-lg bg-red-50 p-3 text-red-700 ring-1 ring-red-200">{erreur}</p>}

        {s && (
          <>
            <div>
              <p className="text-sm font-semibold text-gk">
                {s.service} · Soumission {s.numero}
              </p>
              <h1 className="text-2xl font-bold">Travaux recommandés</h1>
              <p className="text-slate-600">
                Bonjour {s.client}, voici les travaux que nous recommandons pour votre véhicule
                {s.vehicule && <b> {s.vehicule}</b>}
                {s.plaque && ` (plaque ${s.plaque})`}.
              </p>
            </div>

            {repondu && (
              <div className="rounded-lg bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
                <p className="font-semibold">Merci, votre réponse a bien été envoyée !</p>
                <p className="text-sm">
                  {selection.length > 0
                    ? "Notre équipe va procéder aux travaux approuvés et vous contactera au besoin."
                    : "Aucun travail supplémentaire ne sera effectué."}
                </p>
              </div>
            )}

            <section className="carte">
              {!repondu && <p className="mb-3 text-sm text-slate-500">Décochez les travaux que vous ne souhaitez pas faire.</p>}
              <ul className="divide-y divide-slate-100">
                {s.travaux.map((tr) => (
                  <li key={tr.id}>
                    <label className={`flex items-start gap-3 py-3 ${repondu ? "" : "cursor-pointer"}`}>
                      {repondu ? (
                        <span className={`mt-0.5 font-bold ${tr.approuve ? "text-emerald-600" : "text-slate-400"}`}>
                          {tr.approuve ? "✓" : "✕"}
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 accent-gk"
                          checked={choisis.has(tr.id)}
                          onChange={(e) => {
                            const n = new Set(choisis);
                            if (e.target.checked) n.add(tr.id);
                            else n.delete(tr.id);
                            setChoisis(n);
                          }}
                        />
                      )}
                      <span className={`flex-1 ${repondu && !tr.approuve ? "text-slate-400 line-through" : ""}`}>
                        <span className="font-medium">{tr.description}</span>
                        {tr.element && <span className="block text-sm text-slate-500">{tr.element}</span>}
                      </span>
                      <span className="font-semibold whitespace-nowrap">{prix(tr.prix)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Sous-total</dt>
                  <dd>{prix(t.sousTotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>TPS (5 %)</dt>
                  <dd>{prix(t.tps)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>TVQ (9,975 %)</dt>
                  <dd>{prix(t.tvq)}</dd>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <dt>{repondu ? "Total approuvé" : "Total"}</dt>
                  <dd>{prix(t.total)}</dd>
                </div>
              </dl>
            </section>

            {!repondu && (
              <div className="space-y-3">
                <button
                  type="button"
                  className="bouton w-full text-lg"
                  disabled={envoi || choisis.size === 0}
                  onClick={() => repondre([...choisis])}
                >
                  {envoi ? "Envoi…" : `Approuver ${choisis.size === s.travaux.length ? "les travaux" : `${choisis.size} travail(aux)`} – ${prix(t.total)}`}
                </button>
                <button type="button" className="bouton-secondaire w-full" disabled={envoi} onClick={() => repondre([])}>
                  Refuser tous les travaux
                </button>
                <p className="text-center text-xs text-slate-500">Prix estimés, valides 30 jours. Taxes incluses dans le total.</p>
              </div>
            )}

            <section className="carte flex flex-col gap-3 sm:flex-row">
              <a href={ENTREPRISE.rendezVous} className="bouton-secondaire flex-1">
                Prendre rendez-vous
              </a>
              <a href={ENTREPRISE.forfaits} className="bouton-secondaire flex-1">
                Voir nos forfaits
              </a>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
