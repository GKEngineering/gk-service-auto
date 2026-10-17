import { preparerPhoto } from "./images";
import { genererPdf, genererPdfFin, type DonneesRapport } from "./pdf";
import { SERVICES, numeroRapport } from "./services";
import { BUCKET, supabase } from "./supabase";
import type { ElementChecklist, Inspection, PhotoLocale, PhotoStockee } from "./types";

export type DonneesInspection = Omit<DonneesRapport, "numero" | "date" | "logoDataUrl" | "lienSoumission">;

export type TypeRapport = "inspection" | "fin";

async function chargerLogo(): Promise<string | undefined> {
  try {
    const blob = await (await fetch("/logo-entete.png")).blob();
    return await new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(lecteur.result as string);
      lecteur.onerror = reject;
      lecteur.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

async function televerser(chemin: string, fichier: Blob, typeContenu: string): Promise<string> {
  const { error } = await supabase().storage.from(BUCKET).upload(chemin, fichier, { contentType: typeContenu, upsert: true });
  if (error) throw new Error(`Téléversement impossible (${chemin}) : ${error.message}`);
  return chemin;
}

export interface ResultatEnvoi {
  ok: boolean;
  erreur?: string;
}

/** Demande au serveur d'envoyer un rapport PDF par courriel au client. */
export async function envoyerRapport(id: string, rapport: TypeRapport = "inspection"): Promise<ResultatEnvoi> {
  const { data } = await supabase().auth.getSession();
  const reponse = await fetch("/api/envoyer-rapport", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ id, rapport }),
  });
  if (reponse.ok) return { ok: true };
  const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
  return { ok: false, erreur: corps.erreur ?? `Erreur ${reponse.status}` };
}

export function lienSoumission(token: string): string {
  return `${window.location.origin}/soumission/${token}`;
}

export async function enregistrerInspection(
  d: DonneesInspection,
  etape: (message: string) => void,
): Promise<{ id: string; envoi: ResultatEnvoi }> {
  const sb = supabase();
  const travaux = d.travaux.filter((t) => t.description.trim());

  etape("Création de la fiche…");
  const { data: ligne, error } = await sb
    .from("inspections")
    .insert({
      type: d.type,
      technicien: d.technicien,
      client_nom: d.client.nom,
      client_email: d.client.email,
      client_telephone: d.client.telephone,
      client_adresse: d.client.adresse,
      vehicule_marque: d.vehicule.marque,
      vehicule_modele: d.vehicule.modele,
      vehicule_annee: d.vehicule.annee,
      vehicule_couleur: d.vehicule.couleur,
      vehicule_plaque: d.vehicule.plaque,
      vehicule_vin: d.vehicule.vin,
      vehicule_kilometrage: d.vehicule.kilometrage,
      niveau_carburant: d.vehicule.carburant,
      notes: d.notes,
      travaux,
      soumission_statut: travaux.length > 0 ? "en_attente" : null,
    })
    .select("id, numero, created_at, soumission_token")
    .single();
  if (error || !ligne) throw new Error(`Enregistrement impossible : ${error?.message}`);
  const id = ligne.id as string;
  const numero = numeroRapport(d.type, ligne.numero as number);

  const total = d.vues.length + d.photosSupp.length + d.checklist.reduce((n, c) => n + c.photos.length, 0);
  let fait = 0;
  const televerserPhoto = async (photo: PhotoLocale) => {
    const chemin = await televerser(`${id}/photos/${photo.id}.jpg`, photo.blob, "image/jpeg");
    etape(`Envoi des photos… ${++fait}/${total}`);
    return chemin;
  };

  const photos: PhotoStockee[] = [];
  for (const v of d.vues) photos.push({ path: await televerserPhoto(v.photo), legende: v.legende });
  for (const [i, p] of d.photosSupp.entries()) {
    photos.push({ path: await televerserPhoto(p), legende: `Photo supplémentaire ${i + 1}` });
  }
  const checklist: ElementChecklist[] = [];
  for (const c of d.checklist) {
    const chemins: string[] = [];
    for (const p of c.photos) {
      const chemin = await televerserPhoto(p);
      chemins.push(chemin);
      photos.push({ path: chemin, legende: c.element, element: c.element });
    }
    checklist.push({ categorie: c.categorie, element: c.element, etat: c.etat, commentaire: c.commentaire, photos: chemins });
  }

  etape("Signature…");
  const signature = await (await fetch(d.signatureDataUrl)).blob();
  const signaturePath = await televerser(`${id}/signature.png`, signature, "image/png");

  etape("Génération du rapport PDF…");
  const pdf = genererPdf({
    ...d,
    travaux,
    numero,
    date: new Date(ligne.created_at as string),
    logoDataUrl: await chargerLogo(),
    lienSoumission: travaux.length > 0 ? lienSoumission(ligne.soumission_token as string) : undefined,
  });
  const pdfPath = await televerser(`${id}/${numero}.pdf`, pdf, "application/pdf");

  const { error: errMaj } = await sb
    .from("inspections")
    .update({ checklist, photos, signature_path: signaturePath, pdf_path: pdfPath })
    .eq("id", id);
  if (errMaj) throw new Error(`Mise à jour impossible : ${errMaj.message}`);

  etape("Envoi du courriel au client…");
  const envoi = await envoyerRapport(id);
  return { id, envoi };
}

/** Télécharge une photo déjà stockée et la prépare pour un PDF. */
export async function chargerPhotoStockee(chemin: string): Promise<PhotoLocale | null> {
  const { data } = await supabase().storage.from(BUCKET).download(chemin);
  return data ? preparerPhoto(data) : null;
}

export interface DonneesFinSaisie {
  /** Une photo « après » par vue de l'inspection (même légende). */
  apres: Record<string, PhotoLocale | null>;
  photosSupp: PhotoLocale[];
  notes: string;
  technicien: string;
}

export async function enregistrerFin(
  i: Inspection,
  d: DonneesFinSaisie,
  etape: (message: string) => void,
): Promise<ResultatEnvoi> {
  const numero = numeroRapport(i.type, i.numero);
  const vues = SERVICES[i.type].vuesPhotos;
  const avantParVue = new Map(i.photos.filter((p) => !p.element && vues.includes(p.legende)).map((p) => [p.legende, p.path]));

  const aTeleverser = [
    ...vues.flatMap((legende) => (d.apres[legende] ? [{ legende, photo: d.apres[legende]! }] : [])),
    ...d.photosSupp.map((photo, n) => ({ legende: `Photo après ${n + 1}`, photo })),
  ];
  const finPhotos: PhotoStockee[] = [];
  for (const [n, { legende, photo }] of aTeleverser.entries()) {
    etape(`Envoi des photos… ${n + 1}/${aTeleverser.length}`);
    finPhotos.push({ path: await televerser(`${i.id}/apres/${photo.id}.jpg`, photo.blob, "image/jpeg"), legende });
  }

  etape("Préparation des photos avant…");
  const paires = await Promise.all(
    vues.map(async (legende) => ({
      legende,
      avant: avantParVue.has(legende) ? await chargerPhotoStockee(avantParVue.get(legende)!) : null,
      apres: d.apres[legende] ?? null,
    })),
  );

  etape("Génération du rapport PDF…");
  const date = new Date();
  const pdf = genererPdfFin({
    type: i.type,
    numero,
    date,
    dateInspection: new Date(i.created_at),
    technicien: d.technicien || i.technicien || "",
    client: {
      nom: i.client_nom,
      email: i.client_email,
      telephone: i.client_telephone ?? "",
      adresse: i.client_adresse ?? "",
    },
    vehicule: {
      marque: i.vehicule_marque ?? "",
      modele: i.vehicule_modele ?? "",
      annee: i.vehicule_annee ?? "",
      couleur: i.vehicule_couleur ?? "",
      plaque: i.vehicule_plaque ?? "",
      vin: i.vehicule_vin ?? "",
      kilometrage: i.vehicule_kilometrage ?? "",
      carburant: i.niveau_carburant ?? "",
    },
    paires,
    photosSupp: d.photosSupp,
    notes: d.notes,
    logoDataUrl: await chargerLogo(),
  });
  const finPdfPath = await televerser(`${i.id}/${numero}-fin.pdf`, pdf, "application/pdf");

  const { error } = await supabase()
    .from("inspections")
    .update({ fin_photos: finPhotos, fin_notes: d.notes, fin_pdf_path: finPdfPath, fin_le: date.toISOString() })
    .eq("id", i.id);
  if (error) throw new Error(`Mise à jour impossible : ${error.message}`);

  etape("Envoi du courriel au client…");
  return envoyerRapport(i.id, "fin");
}
