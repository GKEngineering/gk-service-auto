import { NextResponse } from "next/server";
import {
  EXPEDITEUR,
  chargerLogo,
  courrielFin,
  courrielInspection,
  pieceLogo,
  transporteur,
} from "@/lib/courriels";
import { SERVICES, numeroRapport } from "@/lib/services";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Inspection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jeton = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jeton) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: auth } = await admin.auth.getUser(jeton);
  if (!auth.user) return NextResponse.json({ erreur: "Session invalide" }, { status: 401 });

  const { id, rapport = "inspection" } = (await req.json()) as { id?: string; rapport?: "inspection" | "fin" };
  if (!id) return NextResponse.json({ erreur: "Identifiant manquant" }, { status: 400 });
  const fin = rapport === "fin";

  const { data: inspection } = await admin.from("inspections").select("*").eq("id", id).single<Inspection>();
  if (!inspection) return NextResponse.json({ erreur: "Inspection introuvable" }, { status: 404 });
  const pdfPath = fin ? inspection.fin_pdf_path : inspection.pdf_path;
  if (!pdfPath) return NextResponse.json({ erreur: "Rapport PDF absent" }, { status: 400 });

  try {
    const { data: pdf, error } = await admin.storage.from("inspections").download(pdfPath);
    if (error || !pdf) throw new Error(`PDF introuvable : ${error?.message}`);

    const numero = numeroRapport(inspection.type, inspection.numero);
    const origine = process.env.APP_URL || new URL(req.url).origin;
    const logo = await chargerLogo(origine);
    const lienSoumission = `${origine}/soumission/${inspection.soumission_token}`;

    await transporteur().sendMail({
      from: EXPEDITEUR(),
      to: inspection.client_email,
      cc: process.env.EMAIL_COPIE || undefined,
      subject: fin
        ? `GK Service Auto – Votre véhicule est prêt (${numero})`
        : `GK Service Auto – ${SERVICES[inspection.type].sujetCourriel} (${numero})`,
      html: fin ? courrielFin(inspection, numero, !!logo) : courrielInspection(inspection, numero, lienSoumission, !!logo),
      text: fin
        ? `Bonjour ${inspection.client_nom},\n\nLes travaux sur votre véhicule sont terminés. Vous trouverez le rapport avant / après en pièce jointe.\n\nL'équipe GK Service Auto`
        : `Bonjour ${inspection.client_nom},\n\n${SERVICES[inspection.type].introCourriel.replace("{vehicule}", "")}` +
          (inspection.travaux.length ? `\n\nSoumission des travaux recommandés : ${lienSoumission}` : "") +
          `\n\nL'équipe GK Service Auto`,
      attachments: [
        {
          filename: fin ? `${numero}-fin-de-travaux.pdf` : `${numero}.pdf`,
          content: Buffer.from(await pdf.arrayBuffer()),
          contentType: "application/pdf",
        },
        ...pieceLogo(logo),
      ],
    });

    await admin
      .from("inspections")
      .update(fin ? { fin_email_envoye_le: new Date().toISOString() } : { email_envoye_le: new Date().toISOString(), email_erreur: null })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("inspections").update({ email_erreur: message }).eq("id", id);
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}
