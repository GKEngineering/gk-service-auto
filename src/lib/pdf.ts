import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { ETATS, SERVICES, libelleEtat } from "./services";
import type { Client, Etat, PhotoLocale, TypeService, Vehicule } from "./types";

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
  signatureDataUrl: string;
  /** Logo (data URL PNG, ratio 1050 x 341). */
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

export function genererPdf(d: DonneesRapport): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const service = SERVICES[d.type];
  const finTableau = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  let y = 0;
  const assurerEspace = (hauteur: number) => {
    if (y + hauteur > H - 18) {
      doc.addPage();
      y = 18;
    }
  };
  const titreSection = (texte: string) => {
    assurerEspace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...MARINE);
    doc.text(texte.toUpperCase(), MARGE, y);
    doc.setDrawColor(...BLEU);
    doc.setLineWidth(0.6);
    doc.line(MARGE, y + 1.5, MARGE + 20, y + 1.5);
    y += 6;
  };

  // En-tête : logo à gauche, rapport à droite
  if (d.logoDataUrl) {
    doc.addImage(d.logoDataUrl, "PNG", MARGE, 8, 58, 58 * (341 / 1050));
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...MARINE);
    doc.text("GK", MARGE, 16);
    doc.setTextColor(...BLEU);
    doc.text("SERVICE AUTO", MARGE + 11, 16);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...MARINE);
  doc.text("RAPPORT D'INSPECTION", L - MARGE, 12, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...BLEU);
  doc.text(service.titre, L - MARGE, 17.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(`${d.numero} · ${dateFr(d.date)}`, L - MARGE, 22.5, { align: "right" });
  doc.setFillColor(...BLEU);
  doc.rect(0, 30, L, 1.5, "F");
  y = 40;

  // Client et véhicule
  titreSection("Client et véhicule");
  const v = d.vehicule;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGE, right: MARGE },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.8, lineColor: [226, 232, 240] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: GRIS, cellWidth: 24 },
      2: { fontStyle: "bold", textColor: GRIS, cellWidth: 26 },
    },
    body: [
      ["Client", d.client.nom, "Véhicule", [v.marque, v.modele].filter(Boolean).join(" ")],
      ["Courriel", d.client.email, "Année", v.annee],
      ["Téléphone", d.client.telephone, "Couleur", v.couleur],
      ["Adresse", d.client.adresse, "Plaque", v.plaque],
      ["Technicien", d.technicien, "NIV (VIN)", v.vin],
      ["Date", dateFr(d.date), "Kilométrage", v.kilometrage ? `${v.kilometrage} km` : ""],
      ["", "", "Carburant", v.carburant],
    ],
  });
  y = finTableau() + 10;

  // Résumé
  const evalues = d.checklist.filter((c) => c.etat);
  const nb = (e: Etat) => evalues.filter((c) => c.etat === e).length;
  titreSection("Résumé");
  autoTable(doc, {
    startY: y,
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
  y = finTableau() + 10;

  // Checklist
  titreSection("Fiche d'inspection");
  if (evalues.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text("Aucun élément évalué.", MARGE, y + 2);
    y += 10;
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
      startY: y,
      margin: { left: MARGE, right: MARGE },
      theme: "grid",
      head: [["Élément", "État", "Commentaire"]],
      headStyles: { fillColor: BLEU, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: [226, 232, 240] },
      columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 32 } },
      body: lignes,
    });
    y = finTableau() + 10;
  }

  // Notes
  if (d.notes.trim()) {
    titreSection("Remarques / dommages constatés");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    for (const ligne of doc.splitTextToSize(d.notes.trim(), L - 2 * MARGE) as string[]) {
      assurerEspace(5);
      doc.text(ligne, MARGE, y);
      y += 4.6;
    }
    y += 6;
  }

  // Signature du client
  assurerEspace(58);
  titreSection("Confirmation du client");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const declaration = doc.splitTextToSize(
    `Je soussigné(e), ${d.client.nom}, confirme avoir pris connaissance de l'état du véhicule décrit dans ce rapport ` +
      `et dans les photos ci-jointes, constaté par GK Service Auto avant le début des travaux.`,
    L - 2 * MARGE,
  ) as string[];
  doc.text(declaration, MARGE, y);
  y += declaration.length * 4.2 + 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(MARGE, y, 80, 32);
  doc.addImage(d.signatureDataUrl, "PNG", MARGE + 2, y + 2, 76, 28);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Signature – ${d.client.nom} – ${dateFr(d.date)}`, MARGE, y + 37);
  y += 46;

  // Photos
  const grillePhotos = (titre: string, photos: { legende: string; photo: PhotoLocale }[]) => {
    if (photos.length === 0) return;
    doc.addPage();
    y = 18;
    titreSection(titre);
    const largeurCase = (L - 2 * MARGE - 6) / 2;
    const hauteurCase = largeurCase * 0.75;
    photos.forEach(({ legende, photo }, i) => {
      const col = i % 2;
      if (col === 0) assurerEspace(hauteurCase + 10);
      const x = MARGE + col * (largeurCase + 6);
      const ratio = Math.min(largeurCase / photo.pdfLargeur, hauteurCase / photo.pdfHauteur);
      const w = photo.pdfLargeur * ratio;
      const h = photo.pdfHauteur * ratio;
      doc.setFillColor(241, 245, 249);
      doc.rect(x, y, largeurCase, hauteurCase, "F");
      doc.addImage(photo.pdfDataUrl, "JPEG", x + (largeurCase - w) / 2, y + (hauteurCase - h) / 2, w, h);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...MARINE);
      doc.text(doc.splitTextToSize(legende, largeurCase)[0] as string, x, y + hauteurCase + 4.5);
      if (col === 1 || i === photos.length - 1) y += hauteurCase + 10;
    });
  };

  grillePhotos("Photos du véhicule", [
    ...d.vues,
    ...d.photosSupp.map((photo, i) => ({ legende: `Photo supplémentaire ${i + 1}`, photo })),
  ]);
  grillePhotos(
    "Photos des éléments inspectés",
    d.checklist.flatMap((c) =>
      c.photos.map((photo) => ({ legende: `${c.element} – ${libelleEtat(c.etat)}`, photo })),
    ),
  );

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(`GK Service Auto · Pneus · Huile · Freins · Lavage – ${d.numero}`, MARGE, H - 8);
    doc.text(`Page ${p} / ${pages}`, L - MARGE, H - 8, { align: "right" });
  }

  return doc.output("blob");
}
