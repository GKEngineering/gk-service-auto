import { NextResponse } from "next/server";
import { ADRESSE_INTERNE, EXPEDITEUR, echapper, tableauTravaux, transporteur, vehiculeTexte } from "@/lib/courriels";
import { prix, totaux } from "@/lib/entreprise";
import { SERVICES, numeroRapport } from "@/lib/services";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Inspection } from "@/lib/types";

// Page publique : le client n'a pas de compte, le jeton (UUID aléatoire) sert de clé d'accès.
export const runtime = "nodejs";

type Contexte = { params: Promise<{ token: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function trouver(token: string) {
  if (!UUID.test(token)) return null;
  const { data } = await supabaseAdmin()
    .from("inspections")
    .select("*")
    .eq("soumission_token", token)
    .maybeSingle<Inspection>();
  return data;
}

/** Seulement ce que le client a besoin de voir (pas de photos ni de coordonnées). */
function vuePublique(i: Inspection) {
  return {
    numero: numeroRapport(i.type, i.numero),
    service: SERVICES[i.type].titre,
    date: i.created_at,
    client: i.client_nom,
    vehicule: vehiculeTexte(i),
    plaque: i.vehicule_plaque,
    travaux: i.travaux,
    statut: i.soumission_statut,
    reponduLe: i.soumission_reponse_le,
  };
}

export async function GET(_req: Request, { params }: Contexte) {
  const i = await trouver((await params).token);
  if (!i || i.travaux.length === 0) return NextResponse.json({ erreur: "Soumission introuvable" }, { status: 404 });
  return NextResponse.json(vuePublique(i));
}

export async function POST(req: Request, { params }: Contexte) {
  const i = await trouver((await params).token);
  if (!i || i.travaux.length === 0) return NextResponse.json({ erreur: "Soumission introuvable" }, { status: 404 });
  if (i.soumission_statut === "repondue") {
    return NextResponse.json({ erreur: "Vous avez déjà répondu à cette soumission." }, { status: 409 });
  }

  const { approuves } = (await req.json()) as { approuves?: unknown };
  if (!Array.isArray(approuves)) return NextResponse.json({ erreur: "Réponse invalide" }, { status: 400 });
  const choisis = new Set(approuves.filter((a): a is string => typeof a === "string"));

  const travaux = i.travaux.map((t) => ({ ...t, approuve: choisis.has(t.id) }));
  const maintenant = new Date().toISOString();
  const { data: maj, error } = await supabaseAdmin()
    .from("inspections")
    .update({ travaux, soumission_statut: "repondue", soumission_reponse_le: maintenant })
    .eq("id", i.id)
    .eq("soumission_statut", "en_attente")
    .select("id");
  if (error) return NextResponse.json({ erreur: "Enregistrement impossible" }, { status: 500 });
  // Double clic : la première réponse a déjà été enregistrée.
  if (!maj?.length) return NextResponse.json({ erreur: "Vous avez déjà répondu à cette soumission." }, { status: 409 });

  // Avertir l'entreprise (un échec d'envoi ne doit pas bloquer la réponse du client).
  const numero = numeroRapport(i.type, i.numero);
  const acceptes = travaux.filter((t) => t.approuve);
  try {
    await transporteur().sendMail({
      from: EXPEDITEUR(),
      to: ADRESSE_INTERNE(),
      replyTo: i.client_email,
      subject: `Soumission ${numero} : ${acceptes.length}/${travaux.length} travaux approuvés (${prix(totaux(acceptes).total)})`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111214;max-width:560px">
        <p><b>${echapper(i.client_nom)}</b> a répondu à la soumission <b>${numero}</b>.</p>
        <p>${echapper(vehiculeTexte(i))}${i.vehicule_plaque ? ` · plaque ${echapper(i.vehicule_plaque)}` : ""}<br>
        ${echapper(i.client_email)}${i.client_telephone ? ` · ${echapper(i.client_telephone)}` : ""}</p>
        ${tableauTravaux(travaux, true)}
        <p><b>Total approuvé : ${prix(totaux(acceptes).total)}</b> (taxes incluses)</p>
      </div>`,
    });
  } catch {}

  return NextResponse.json(vuePublique({ ...i, travaux, soumission_statut: "repondue", soumission_reponse_le: maintenant }));
}
