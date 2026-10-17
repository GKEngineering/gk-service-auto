import { genererPdf, type DonneesRapport } from "./pdf";
import { numeroRapport } from "./services";
import { BUCKET, supabase } from "./supabase";
import type { ElementChecklist, PhotoLocale, PhotoStockee } from "./types";

export type DonneesInspection = Omit<DonneesRapport, "numero" | "date" | "logoDataUrl">;

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

export interface ResultatEnvoi {
  ok: boolean;
  erreur?: string;
}

/** Demande au serveur d'envoyer le rapport PDF par courriel au client. */
export async function envoyerRapport(id: string): Promise<ResultatEnvoi> {
  const { data } = await supabase().auth.getSession();
  const reponse = await fetch("/api/envoyer-rapport", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ id }),
  });
  if (reponse.ok) return { ok: true };
  const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
  return { ok: false, erreur: corps.erreur ?? `Erreur ${reponse.status}` };
}

export async function enregistrerInspection(
  d: DonneesInspection,
  etape: (message: string) => void,
): Promise<{ id: string; envoi: ResultatEnvoi }> {
  const sb = supabase();

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
    })
    .select("id, numero, created_at")
    .single();
  if (error || !ligne) throw new Error(`Enregistrement impossible : ${error?.message}`);
  const id = ligne.id as string;
  const numero = numeroRapport(d.type, ligne.numero as number);

  const televerser = async (chemin: string, fichier: Blob, typeContenu: string) => {
    const { error: e } = await sb.storage.from(BUCKET).upload(chemin, fichier, { contentType: typeContenu, upsert: true });
    if (e) throw new Error(`Téléversement impossible (${chemin}) : ${e.message}`);
    return chemin;
  };

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
  const pdf = genererPdf({ ...d, numero, date: new Date(ligne.created_at as string), logoDataUrl: await chargerLogo() });
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
