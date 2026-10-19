import type { Travail } from "./types";

export const ENTREPRISE = {
  nom: "GK Service Auto",
  site: "gkgroupeinc.com",
  telephone: "581-447-0086",
  telephoneLien: "tel:+15814470086",
  /** Forfaits pour les clients (courriels, page de soumission) : page publique. */
  forfaits: "https://gkgroupeinc.com/#packs",
  /** Forfaits dans l'app des techniciens : application Square Point de vente. */
  forfaitsSquare: "https://apps.apple.com/ca/app/square-point-de-vente-pdv/id335393788?l=fr-CA",
  /** Même application sur Android (Google Play). */
  forfaitsSquareAndroid: "https://play.google.com/store/apps/details?id=com.squareup&hl=fr_CA",
  rendezVous: "https://gkgroupeinc.com/espace-client#reserver",
};

/** Square Point de vente : App Store (iPhone, iPad, ordinateur) ou Google Play sur Android. */
export function lienForfaitsSquare(userAgent: string): string {
  return /Android/i.test(userAgent) ? ENTREPRISE.forfaitsSquareAndroid : ENTREPRISE.forfaitsSquare;
}

// Taxes du Québec
export const TPS = 0.05;
export const TVQ = 0.09975;

export function totaux(travaux: Pick<Travail, "prix">[]) {
  const sousTotal = travaux.reduce((s, t) => s + (Number.isFinite(t.prix) ? t.prix : 0), 0);
  const tps = Math.round(sousTotal * TPS * 100) / 100;
  const tvq = Math.round(sousTotal * TVQ * 100) / 100;
  return { sousTotal, tps, tvq, total: Math.round((sousTotal + tps + tvq) * 100) / 100 };
}

export function prix(montant: number): string {
  return montant.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}
