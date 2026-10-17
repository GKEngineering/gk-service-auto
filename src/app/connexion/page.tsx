"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const connecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password: motDePasse });
    setChargement(false);
    if (error) setErreur("Courriel ou mot de passe incorrect.");
    else router.replace("/");
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-gk to-gk-fonce px-4">
      <form onSubmit={connecter} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="GK Service Auto – Pneus, Huile, Freins, Lavage" className="mx-auto mb-2 w-full max-w-72" />
          <h1 className="sr-only">GK Service Auto</h1>
          <p className="text-sm font-medium text-slate-500">Espace techniciens</p>
        </div>
        <label className="block">
          <span className="etiquette">Courriel</span>
          <input className="champ" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="etiquette">Mot de passe</span>
          <input
            className="champ"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button className="bouton w-full" disabled={chargement}>
          {chargement ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
