import type { Travail } from "./types";

export const ENTREPRISE = {
  nom: "GK Service Auto",
  site: "gkgroupeinc.com",
  telephone: "581-447-0086",
  telephoneLien: "tel:+15814470086",
  /** Forfaits pour les clients (courriels, page de soumission) : page publique. */
  forfaits: "https://gkgroupeinc.com/#packs",
  /** Forfaits dans l'app des techniciens : catalogue de services Square (connexion Square requise). */
  forfaitsSquare: "https://app.squareup.com/dashboard/items/services",
  rendezVous: "https://gkgroupeinc.com/espace-client#reserver",
};

/**
 * Sur Android : tente d'ouvrir l'app « Tableau de bord Square » sur la page des services ;
 * si l'app est absente ou ne gère pas ce lien, Chrome ouvre la page web à la place.
 * Ailleurs (iPhone, ordinateur) : lien web normal.
 */
export function lienForfaitsSquare(userAgent: string): string {
  if (!/Android/i.test(userAgent)) return ENTREPRISE.forfaitsSquare;
  const web = new URL(ENTREPRISE.forfaitsSquare);
  return (
    `intent://${web.host}${web.pathname}#Intent;scheme=https;package=com.squareup.dashboard;` +
    `S.browser_fallback_url=${encodeURIComponent(web.href)};end`
  );
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
