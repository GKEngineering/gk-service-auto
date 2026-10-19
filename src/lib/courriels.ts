import "server-only";
import nodemailer from "nodemailer";
import { ENTREPRISE, prix, totaux } from "./entreprise";
import { SERVICES } from "./services";
import type { Inspection, Travail } from "./types";

export function transporteur() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export const EXPEDITEUR = () => process.env.SMTP_FROM ?? process.env.SMTP_USER;

/** Adresse interne qui reçoit les copies et les réponses aux soumissions. */
export const ADRESSE_INTERNE = () => process.env.EMAIL_COPIE || process.env.SMTP_USER;

export const echapper = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function vehiculeTexte(i: Inspection): string {
  return [i.vehicule_marque, i.vehicule_modele, i.vehicule_annee].filter(Boolean).join(" ");
}

function bouton(lien: string, texte: string, plein = true): string {
  const style = plein
    ? "background:#0166c0;color:#ffffff;border:2px solid #0166c0"
    : "background:#ffffff;color:#0166c0;border:2px solid #0166c0";
  return `<a href="${lien}" style="${style};display:inline-block;padding:11px 18px;border-radius:8px;font-weight:bold;text-decoration:none;margin:4px 6px 4px 0">${texte}</a>`;
}

/** Gabarit commun : logo, titre, contenu, liens vers le site, pied de page. */
export function gabarit(sousTitre: string, contenu: string, avecLogo: boolean): string {
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
        <div style="font-size:13px;color:#0166c0;font-weight:bold;margin-top:10px">${sousTitre}</div>
      </td></tr>
      <tr><td style="padding:24px;font-size:15px;line-height:1.55">
        ${contenu}
        <p style="margin-top:24px">Merci de votre confiance,<br><b>L'équipe GK Service Auto</b></p>
        <div style="margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0">
          ${bouton(ENTREPRISE.rendezVous, "Prendre rendez-vous", false)}
          ${bouton(ENTREPRISE.forfaits, "Voir nos forfaits", false)}
        </div>
      </td></tr>
      <tr><td style="background:#0166c0;color:#ffffff;padding:12px 24px;font-size:12px;text-align:center;letter-spacing:.5px">
        Pneus • Huile • Freins • Lavage<br>
        <a href="https://${ENTREPRISE.site}" style="color:#ffffff">${ENTREPRISE.site}</a> ·
        <a href="${ENTREPRISE.telephoneLien}" style="color:#ffffff">${ENTREPRISE.telephone}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function tableauTravaux(travaux: Travail[], avecReponse = false): string {
  const t = totaux(travaux);
  const lignes = travaux
    .map(
      (tr) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${echapper(tr.description)}${
          tr.element ? `<br><span style="font-size:12px;color:#64748b">${echapper(tr.element)}</span>` : ""
        }</td>
        ${
          avecReponse
            ? `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${tr.approuve ? "#059669" : "#dc2626"}">${tr.approuve ? "Approuvé" : "Refusé"}</td>`
            : ""
        }
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap">${prix(tr.prix)}</td>
      </tr>`,
    )
    .join("");
  const col = avecReponse ? 3 : 2;
  const total = (libelle: string, montant: number, gras = false) =>
    `<tr><td colspan="${col - 1}" style="padding:4px 8px;text-align:right;${gras ? "font-weight:bold" : "color:#64748b"}">${libelle}</td>
     <td style="padding:4px 8px;text-align:right;white-space:nowrap;${gras ? "font-weight:bold" : ""}">${prix(montant)}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0;border-collapse:collapse">
    ${lignes}
    ${total("Sous-total", t.sousTotal)}${total("TPS (5 %)", t.tps)}${total("TVQ (9,975 %)", t.tvq)}${total("Total estimé (taxes incluses)", t.total, true)}
  </table>`;
}

export function courrielInspection(i: Inspection, numero: string, lienSoumission: string, avecLogo: boolean): string {
  const vehicule = vehiculeTexte(i);
  const defauts = i.checklist.filter((c) => c.etat === "defaut").length;
  const surveiller = i.checklist.filter((c) => c.etat === "surveiller").length;
  const soumission =
    i.travaux.length > 0
      ? `<h3 style="margin:24px 0 4px;font-size:16px">Travaux recommandés</h3>
         <p style="margin:0;color:#64748b;font-size:13px">Prix estimés avant taxes. Aucun travail supplémentaire n'est effectué sans votre accord.</p>
         ${tableauTravaux(i.travaux)}
         <p style="text-align:center;margin:18px 0">${bouton(lienSoumission, "Voir et approuver la soumission")}</p>`
      : "";
  return gabarit(
    `${SERVICES[i.type].titre} – Rapport ${numero}`,
    `<p>Bonjour ${echapper(i.client_nom)},</p>
     <p>${SERVICES[i.type].introCourriel.replace(
       "{vehicule}",
       (vehicule ? ` <b>${echapper(vehicule)}</b>` : "") + (i.vehicule_plaque ? ` (plaque ${echapper(i.vehicule_plaque)})` : ""),
     )}</p>
     <table cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">
       <tr><td style="padding:4px 12px 4px 0;color:#64748b">Éléments à surveiller</td><td style="font-weight:bold;color:#d97706">${surveiller}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#64748b">Défauts / dommages constatés</td><td style="font-weight:bold;color:#dc2626">${defauts}</td></tr>
     </table>
     ${soumission}
     <p>Si vous avez des questions sur ce rapport, répondez simplement à ce courriel.</p>`,
    avecLogo,
  );
}

export function courrielFin(i: Inspection, numero: string, avecLogo: boolean): string {
  const vehicule = vehiculeTexte(i);
  return gabarit(
    `${SERVICES[i.type].titre} – Fin des travaux ${numero}`,
    `<p>Bonjour ${echapper(i.client_nom)},</p>
     <p>Bonne nouvelle : les travaux sur votre véhicule${vehicule ? ` <b>${echapper(vehicule)}</b>` : ""} sont terminés !</p>
     <p>Vous trouverez en pièce jointe le rapport de fin de travaux avec les photos <b>avant / après</b>.</p>
     ${i.fin_notes ? `<p style="background:#f1f5f9;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${echapper(i.fin_notes)}</p>` : ""}
     <p>Satisfait du résultat ? Pensez à réserver votre prochain entretien.</p>`,
    avecLogo,
  );
}

/** Logo à joindre (cid:logo-gk) : lu depuis le site lui-même. */
export async function chargerLogo(origine: string): Promise<Buffer | null> {
  const r = await fetch(new URL("/logo-entete.png", origine)).catch(() => null);
  return r?.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

export function pieceLogo(logo: Buffer | null) {
  return logo ? [{ filename: "logo.png", content: logo, contentType: "image/png", cid: "logo-gk" }] : [];
}
