export type TypeService = "maintenance" | "detailing";

export type Etat = "bon" | "surveiller" | "defaut" | "na";

/** Photo prise sur l'appareil, pas encore téléversée. */
export interface PhotoLocale {
  id: string;
  /** Version stockée (max 1600 px). */
  blob: Blob;
  /** Version allégée pour le PDF (max 900 px). */
  pdfDataUrl: string;
  pdfLargeur: number;
  pdfHauteur: number;
  /** URL d'aperçu à l'écran. */
  apercu: string;
}

export interface PhotoStockee {
  path: string;
  legende: string;
  element?: string;
}

export interface ElementChecklist {
  categorie: string;
  element: string;
  etat: Etat | null;
  commentaire: string;
  photos: string[];
}

export interface Client {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export interface Vehicule {
  marque: string;
  modele: string;
  annee: string;
  couleur: string;
  plaque: string;
  vin: string;
  kilometrage: string;
  carburant: string;
}

export interface Inspection {
  id: string;
  numero: number;
  type: TypeService;
  created_at: string;
  technicien: string | null;
  client_nom: string;
  client_email: string;
  client_telephone: string | null;
  client_adresse: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_annee: string | null;
  vehicule_couleur: string | null;
  vehicule_plaque: string | null;
  vehicule_vin: string | null;
  vehicule_kilometrage: string | null;
  niveau_carburant: string | null;
  checklist: ElementChecklist[];
  photos: PhotoStockee[];
  notes: string | null;
  signature_path: string | null;
  pdf_path: string | null;
  email_envoye_le: string | null;
  email_erreur: string | null;
}
