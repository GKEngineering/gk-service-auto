import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { SERVICES, numeroRapport } from "@/lib/services";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Inspection } from "@/lib/types";

export const runtime = "nodejs";

const echapper = (s: string | null) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function courrielHtml(i: Inspection, numero: string, avecLogo: boolean): string {
  const service = SERVICES[i.type];
  const vehicule = [i.vehicule_marque, i.vehicule_modele, i.vehicule_annee].filter(Boolean).join(" ");
  const defauts = i.checklist.filter((c) => c.etat === "defaut").length;
  const surveiller = i.checklist.filter((c) => c.etat === "surveiller").length;
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#111214">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
      <tr><td style="background:#ffffff;padding:20px 24px 14px;border-bottom:4px solid #0166c0">
        ${
          avecLogo
            ? `<img src="cid:logo-gk" alt="GK Service Auto" width="220" style="display:block;width:220px;max-width:100%;height:auto">`
            : `<div style="font-size:22px;font-weight:bold"><span style="color:#0166c0">GK</span> SERVICE AUTO</div>`
        }
        <div style="font-size:13px;color:#0166c0;font-weight:bold;margin-top:10px">${service.titre} – Rapport ${numero}</div>
      </td></tr>
      <tr><td style="padding:24px;font-size:15px;line-height:1.55">
        <p>Bonjour ${echapper(i.client_nom)},</p>
        <p>Avant de commencer les travaux sur votre véhicule${vehicule ? ` <b>${echapper(vehicule)}</b>` : ""}${
          i.vehicule_plaque ? ` (plaque ${echapper(i.vehicule_plaque)})` : ""
        }, nous avons effectué une inspection de son état, photos à l'appui.</p>
        <p>Vous trouverez le rapport complet en pièce jointe (PDF).</p>
        <table cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#64748b">Éléments à surveiller</td><td style="font-weight:bold;color:#d97706">${surveiller}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#64748b">Défauts / dommages constatés</td><td style="font-weight:bold;color:#dc2626">${defauts}</td></tr>
        </table>
        <p>Si vous avez des questions sur ce rapport, répondez simplement à ce courriel.</p>
        <p style="margin-top:24px">Merci de votre confiance,<br><b>L'équipe GK Service Auto</b></p>
      </td></tr>
      <tr><td style="background:#0166c0;color:#ffffff;padding:12px 24px;font-size:12px;text-align:center;letter-spacing:.5px">
        Pneus • Huile • Freins • Lavage
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function POST(req: Request) {
  const jeton = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jeton) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: auth } = await admin.auth.getUser(jeton);
  if (!auth.user) return NextResponse.json({ erreur: "Session invalide" }, { status: 401 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ erreur: "Identifiant manquant" }, { status: 400 });

  const { data: inspection } = await admin.from("inspections").select("*").eq("id", id).single<Inspection>();
  if (!inspection) return NextResponse.json({ erreur: "Inspection introuvable" }, { status: 404 });
  if (!inspection.pdf_path) return NextResponse.json({ erreur: "Rapport PDF absent" }, { status: 400 });

  try {
    const { data: pdf, error } = await admin.storage.from("inspections").download(inspection.pdf_path);
    if (error || !pdf) throw new Error(`PDF introuvable : ${error?.message}`);

    const numero = numeroRapport(inspection.type, inspection.numero);
    const logo = await fetch(new URL("/logo-entete.png", req.url))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    const port = Number(process.env.SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: inspection.client_email,
      cc: process.env.EMAIL_COPIE || undefined,
      subject: `GK Service Auto – État de votre véhicule avant travaux (${numero})`,
      html: courrielHtml(inspection, numero, !!logo),
      text:
        `Bonjour ${inspection.client_nom},\n\nAvant de commencer les travaux, nous avons inspecté l'état de votre véhicule. ` +
        `Vous trouverez le rapport complet avec photos en pièce jointe.\n\nL'équipe GK Service Auto`,
      attachments: [
        { filename: `${numero}.pdf`, content: Buffer.from(await pdf.arrayBuffer()), contentType: "application/pdf" },
        ...(logo ? [{ filename: "logo.png", content: Buffer.from(logo), contentType: "image/png", cid: "logo-gk" }] : []),
      ],
    });

    await admin.from("inspections").update({ email_envoye_le: new Date().toISOString(), email_erreur: null }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("inspections").update({ email_erreur: message }).eq("id", id);
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}
