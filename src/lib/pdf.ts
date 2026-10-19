import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { ENTREPRISE, TPS, TVQ, prix, totaux } from "./entreprise";
import { ETATS, SERVICES, libelleEtat } from "./services";
import type { Client, Etat, PhotoLocale, Travail, TypeService, Vehicule } from "./types";

export interface DonneesRapport {
  type: TypeService;
  numero: string;
  date: Date;
  technicien: string;
  client: Client;
  vehicule: Vehicule;
  checklist: { categorie: string; element: string; etat: Etat | null; commentaire: string; photos: PhotoLocale[] }[];
  vues: { legende: string; photo: PhotoLocale }[];
  photosSupp: PhotoLocale[];
  notes: string;
  travaux: Travail[];
  /** Lien de la page où le client approuve la soumission. */
  lienSoumission?: string;
  signatureDataUrl: string;
  /** Logo (data URL PNG, ratio 700 x 227). */
  logoDataUrl?: string;
}

export interface DonneesFin {
  type: TypeService;
  numero: string;
  date: Date;
  dateInspection: Date;
  technicien: string;
  client: Client;
  vehicule: Vehicule;
  paires: { legende: string; avant: PhotoLocale | null; apres: PhotoLocale | null }[];
  photosSupp: PhotoLocale[];
  notes: string;
  logoDataUrl?: string;
}

// Couleurs du logo
const MARINE: [number, number, number] = [17, 18, 20];
const BLEU: [number, number, number] = [1, 102, 192];
const GRIS: [number, number, number] = [100, 116, 139];
const MARGE = 14;

function dateFr(d: Date): string {
  return d.toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" });
}

/** Mise en page commune aux rapports : en-tête, sections, photos, pied de page. */
class Mise {
  doc = new jsPDF({ unit: "mm", format: "a4" });
  L = this.doc.internal.pageSize.getWidth();
  H = this.doc.internal.pageSize.getHeight();
  y = 0;

  finTableau(): number {
    return (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  assurerEspace(hauteur: number) {
    if (this.y + hauteur > this.H - 18) {
      this.doc.addPage();
      this.y = 18;
    }
  }

  enTete(titre: string, sousTitre: string, numero: string, date: Date, logo?: string) {
    const { doc, L } = this;
    if (logo) {
      doc.addImage(logo, "PNG", MARGE, 8, 58, 58 * (227 / 700));
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...BLEU);
      doc.text("GK", MARGE, 16);
      doc.setTextColor(...MARINE);
      doc.text("SERVICE AUTO", MARGE + 11, 16);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...MARINE);
    doc.text(titre, L - MARGE, 12, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(...BLEU);
    doc.text(sousTitre, L - MARGE, 17.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(`${numero} · ${dateFr(date)}`, L - MARGE, 22.5, { align: "right" });
    doc.setFillColor(...BLEU);
    doc.rect(0, 30, L, 1.5, "F");
    this.y = 40;
  }

  titreSection(texte: string) {
    const { doc } = this;
    this.assurerEspace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...MARINE);
    doc.text(texte.toUpperCase(), MARGE, this.y);
    doc.setDrawColor(...BLEU);
    doc.setLineWidth(0.6);
    doc.line(MARGE, this.y + 1.5, MARGE + 20, this.y + 1.5);
    this.y += 6;
  }

  paragraphe(texte: string, taille = 9.5) {
    const { doc } = this;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(taille);
    doc.setTextColor(30, 41, 59);
    for (const ligne of doc.splitTextToSize(texte.trim(), this.L - 2 * MARGE) as string[]) {
      this.assurerEspace(5);
      doc.text(ligne, MARGE, this.y);
      this.y += taille * 0.48;
    }
    this.y += 6;
  }

  clientVehicule(client: Client, v: Vehicule, technicien: string, date: Date) {
    this.titreSection("Client et véhicule");
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: MARGE, right: MARGE },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: [226, 232, 240] },
      columnStyles: {
        0: { fontStyle: "bold", textColor: GRIS, cellWidth: 24 },
        2: { fontStyle: "bold", textColor: GRIS, cellWidth: 26 },
      },
      body: [
        ["Client", client.nom, "Véhicule", [v.marque, v.modele].filter(Boolean).join(" ")],
        ["Courriel", client.email, "Année", v.annee],
        ["Téléphone", client.telephone, "Couleur", v.couleur],
        ["Adresse", client.adresse, "Plaque", v.plaque],
        ["Technicien", technicien, "NIV (VIN)", v.vin],
        ["Date", dateFr(date), "Kilométrage", v.kilometrage ? `${v.kilometrage} km` : ""],
        ["", "", "Carburant", v.carburant],
      ],
    });
    this.y = this.finTableau() + 10;
  }

  /** Image centrée dans une case grise, avec une étiquette en dessous. */
  photo(photo: PhotoLocale | null, x: number, largeur: number, hauteur: number, etiquette: string, badge?: string) {
    const { doc } = this;
    doc.setFillColor(241, 245, 249);
    doc.rect(x, this.y, largeur, hauteur, "F");
    if (photo) {
      const ratio = Math.min(largeur / photo.pdfLargeur, hauteur / photo.pdfHauteur);
      const w = photo.pdfLargeur * ratio;
      const h = photo.pdfHauteur * ratio;
      doc.addImage(photo.pdfDataUrl, "JPEG", x + (largeur - w) / 2, this.y + (hauteur - h) / 2, w, h);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...GRIS);
      doc.text("Pas de photo", x + largeur / 2, this.y + hauteur / 2, { align: "center" });
    }
    if (badge) {
      doc.setFillColor(...(badge === "APRÈS" ? BLEU : MARINE));
      doc.rect(x, this.y, 18, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(badge, x + 9, this.y + 4.2, { align: "center" });
    }
    if (etiquette) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...MARINE);
      doc.text(doc.splitTextToSize(etiquette, largeur)[0] as string, x, this.y + hauteur + 4.5);
    }
  }

  grillePhotos(titre: string, photos: { legende: string; photo: PhotoLocale }[]) {
    if (photos.length === 0) return;
    this.doc.addPage();
    this.y = 18;
    this.titreSection(titre);
    const largeur = (this.L - 2 * MARGE - 6) / 2;
    const hauteur = largeur * 0.75;
    photos.forEach(({ legende, photo }, i) => {
      const col = i % 2;
      if (col === 0) this.assurerEspace(hauteur + 10);
      this.photo(photo, MARGE + col * (largeur + 6), largeur, hauteur, legende);
      if (col === 1 || i === photos.length - 1) this.y += hauteur + 10;
    });
  }

  piedDePage(numero: string) {
    const { doc } = this;
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(`GK Service Auto · ${ENTREPRISE.site} · ${ENTREPRISE.telephone} – ${numero}`, MARGE, this.H - 8);
      doc.text(`Page ${p} / ${pages}`, this.L - MARGE, this.H - 8, { align: "right" });
    }
  }
}

export function genererPdf(d: DonneesRapport): Blob {
  const m = new Mise();
  const { doc, L } = m;
  const service = SERVICES[d.type];

  m.enTete("RAPPORT D'INSPECTION", service.titre, d.numero, d.date, d.logoDataUrl);
  m.clientVehicule(d.client, d.vehicule, d.technicien, d.date);

  // Résumé
  const evalues = d.checklist.filter((c) => c.etat);
  const nb = (e: Etat) => evalues.filter((c) => c.etat === e).length;
  m.titreSection("Résumé");
  autoTable(doc, {
    startY: m.y,
    margin: { left: MARGE, right: MARGE },
    theme: "plain",
    styles: { fontSize: 10, halign: "center", fontStyle: "bold", textColor: [255, 255, 255], cellPadding: 3 },
    body: [
      ETATS.filter((e) => e.valeur !== "na").map((e) => ({
        content: `${e.libelle} : ${nb(e.valeur)}`,
        styles: { fillColor: e.rgb },
      })),
    ],
  });
  m.y = m.finTableau() + 10;

  // Checklist
  m.titreSection("Fiche d'inspection");
  if (evalues.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text("Aucun élément évalué.", MARGE, m.y + 2);
    m.y += 10;
  } else {
    const lignes: RowInput[] = [];
    for (const categorie of service.categories) {
      const items = evalues.filter((c) => c.categorie === categorie.nom);
      if (items.length === 0) continue;
      lignes.push([
        { content: categorie.nom, colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: "bold", textColor: MARINE } },
      ]);
      for (const c of items) {
        const etat = ETATS.find((e) => e.valeur === c.etat);
        lignes.push([
          c.element + (c.photos.length ? `  (${c.photos.length} photo${c.photos.length > 1 ? "s" : ""})` : ""),
          { content: libelleEtat(c.etat), styles: { textColor: etat?.rgb ?? GRIS, fontStyle: "bold" } },
          c.commentaire,
        ]);
      }
    }
    autoTable(doc, {
      startY: m.y,
      margin: { left: MARGE, right: MARGE },
      theme: "grid",
      head: [["Élément", "État", "Commentaire"]],
      headStyles: { fillColor: BLEU, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: [226, 232, 240] },
      columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 32 } },
      body: lignes,
    });
    m.y = m.finTableau() + 10;
  }

  if (d.notes.trim()) {
    m.titreSection("Remarques / dommages constatés");
    m.paragraphe(d.notes);
  }

  // Travaux recommandés (soumission)
  const travaux = d.travaux.filter((t) => t.description.trim());
  if (travaux.length > 0) {
    const t = totaux(travaux);
    m.titreSection("Travaux recommandés – soumission");
    const ligneTotal = (libelle: string, montant: number, gras = false) => [
      { content: libelle, colSpan: 2, styles: { halign: "right" as const, fontStyle: gras ? ("bold" as const) : ("normal" as const) } },
      { content: prix(montant), styles: { halign: "right" as const, fontStyle: gras ? ("bold" as const) : ("normal" as const) } },
    ];
    autoTable(doc, {
      startY: m.y,
      margin: { left: MARGE, right: MARGE },
      theme: "grid",
      head: [["Travail", "Élément concerné", { content: "Prix", styles: { halign: "right" } }]],
      headStyles: { fillColor: BLEU, textColor: [255, 255, 255] },
      footStyles: { fillColor: [248, 250, 252], textColor: MARINE },
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: [226, 232, 240] },
      columnStyles: { 1: { cellWidth: 52, textColor: GRIS }, 2: { cellWidth: 30, halign: "right" } },
      body: travaux.map((tr) => [tr.description, tr.element ?? "", prix(tr.prix)]),
      foot: [
        ligneTotal("Sous-total", t.sousTotal),
        ligneTotal(`TPS (${(TPS * 100).toLocaleString("fr-CA")} %)`, t.tps),
        ligneTotal(`TVQ (${(TVQ * 100).toLocaleString("fr-CA")} %)`, t.tvq),
        ligneTotal("Total estimé", t.total, true),
      ],
      showFoot: "lastPage",
    });
    m.y = m.finTableau() + 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text("Prix estimés, valides 30 jours. Aucun travail supplémentaire n'est effectué sans votre accord.", MARGE, m.y);
    m.y += 4.5;
    if (d.lienSoumission) {
      doc.setTextColor(...BLEU);
      doc.textWithLink("Approuver la soumission en ligne", MARGE, m.y, { url: d.lienSoumission });
      m.y += 4.5;
    }
    m.y += 6;
  }

  // Signature du client
  m.assurerEspace(58);
  m.titreSection("Confirmation du client");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const declaration = doc.splitTextToSize(
    `Je soussigné(e), ${d.client.nom}, confirme ${service.confirmation}.`,
    L - 2 * MARGE,
  ) as string[];
  doc.text(declaration, MARGE, m.y);
  m.y += declaration.length * 4.2 + 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(MARGE, m.y, 80, 32);
  doc.addImage(d.signatureDataUrl, "PNG", MARGE + 2, m.y + 2, 76, 28);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Signature – ${d.client.nom} – ${dateFr(d.date)}`, MARGE, m.y + 37);
  m.y += 46;

  m.grillePhotos("Photos du véhicule", [
    ...d.vues,
    ...d.photosSupp.map((photo, i) => ({ legende: `Photo supplémentaire ${i + 1}`, photo })),
  ]);
  m.grillePhotos(
    "Photos des éléments inspectés",
    d.checklist.flatMap((c) => c.photos.map((photo) => ({ legende: `${c.element} – ${libelleEtat(c.etat)}`, photo }))),
  );

  m.piedDePage(d.numero);
  return doc.output("blob");
}

/** Rapport de fin de travaux : photos avant / après côte à côte. */
export function genererPdfFin(d: DonneesFin): Blob {
  const m = new Mise();
  const { doc, L } = m;

  m.enTete("RAPPORT DE FIN DE TRAVAUX", SERVICES[d.type].titre, d.numero, d.date, d.logoDataUrl);
  m.clientVehicule(d.client, d.vehicule, d.technicien, d.date);

  m.titreSection("Travaux effectués");
  m.paragraphe(d.notes.trim() || "Travaux complétés.");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(`État du véhicule avant travaux : inspection du ${dateFr(d.dateInspection)} (${d.numero}).`, MARGE, m.y - 2);
  m.y += 6;

  const paires = d.paires.filter((p) => p.avant || p.apres);
  if (paires.length > 0) {
    m.titreSection("Avant / après");
    const largeur = (L - 2 * MARGE - 6) / 2;
    const hauteur = largeur * 0.62;
    for (const p of paires) {
      m.assurerEspace(hauteur + 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...MARINE);
      doc.text(p.legende, MARGE, m.y + 1);
      m.y += 3.5;
      m.photo(p.avant, MARGE, largeur, hauteur, "", "AVANT");
      m.photo(p.apres, MARGE + largeur + 6, largeur, hauteur, "", "APRÈS");
      m.y += hauteur + 9;
    }
  }

  m.grillePhotos(
    "Autres photos après travaux",
    d.photosSupp.map((photo, i) => ({ legende: `Photo ${i + 1}`, photo })),
  );

  m.piedDePage(d.numero);
  return doc.output("blob");
}
