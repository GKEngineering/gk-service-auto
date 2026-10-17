import type { Travail } from "./types";

export const ENTREPRISE = {
  nom: "GK Service Auto",
  site: "gkgroupeinc.com",
  telephone: "581-447-0086",
  telephoneLien: "tel:+15814470086",
  forfaits: "https://gkgroupeinc.com/#packs",
  rendezVous: "https://gkgroupeinc.com/espace-client#reserver",
};

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
