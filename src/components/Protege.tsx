"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Affiche la page seulement si un technicien est connecté, sinon redirige vers /connexion. */
export function Protege({ children, titre, retour }: { children: React.ReactNode; titre?: string; retour?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [configManquante, setConfigManquante] = useState(false);

  useEffect(() => {
    let sb;
    try {
      sb = supabase();
    } catch {
      setConfigManquante(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/connexion");
  }, [session, router]);

  if (configManquante) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center text-slate-700">
        Supabase n'est pas configuré : copiez .env.local.example en .env.local et remplissez les clés (voir README).
      </div>
    );
  }

  if (!session) {
    return <div className="grid min-h-dvh place-items-center text-slate-500">Chargement…</div>;
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b-4 border-gk bg-white pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2">
          <div>
            {retour && (
              <Link href={retour} className="-ml-1 rounded-md px-2 py-1 text-xl leading-none text-marine hover:bg-slate-100" aria-label="Retour">
                ←
              </Link>
            )}
          </div>
          <Link href="/" aria-label="Accueil GK Service Auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-entete.png" alt="GK Service Auto" className="h-10 w-auto" />
          </Link>
          {titre ? (
            <span className="truncate text-right text-xs font-medium text-gk sm:text-sm">{titre}</span>
          ) : (
            <div />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </>
  );
}
