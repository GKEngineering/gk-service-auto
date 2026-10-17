// Marques, modèles et décodage du NIV via l'API gratuite de la NHTSA (vpic.nhtsa.dot.gov).

const API = "https://vpic.nhtsa.dot.gov/api/vehicles";

/** Marques courantes au Québec et leur identifiant NHTSA (évite « Mini » = tout fabricant contenant « mini »). */
const ID_MARQUES: Record<string, number> = {
  Acura: 475, "Alfa Romeo": 493, Audi: 582, BMW: 452, Buick: 468, Cadillac: 469, Chevrolet: 467,
  Chrysler: 477, Dodge: 476, Fiat: 492, Ford: 460, Genesis: 5083, GMC: 472, Honda: 474, Hyundai: 498,
  Infiniti: 480, Jaguar: 442, Jeep: 483, Kia: 499, "Land Rover": 444, Lexus: 515, Lincoln: 464,
  Lucid: 10919, Maserati: 443, Mazda: 473, "Mercedes-Benz": 449, Mini: 456, Mitsubishi: 481, Nissan: 478,
  Polestar: 10224, Porsche: 584, Ram: 496, Rivian: 10887, Subaru: 523, Tesla: 441, Toyota: 448,
  Volkswagen: 482, Volvo: 485,
};

export const MARQUES = Object.keys(ID_MARQUES);

// Autos, camionnettes/pick-up et VUS/fourgonnettes (exclut motos, autobus, remorques…).
const TYPES = ["passenger car", "truck", "multipurpose passenger vehicle (mpv)"];

const anneeMax = new Date().getFullYear() + 1;
export const ANNEES = Array.from({ length: anneeMax - 1985 + 1 }, (_, i) => String(anneeMax - i));

const cache = new Map<string, Promise<string[]>>();

async function modelesParType(id: number, annee: string, type: string): Promise<string[]> {
  const parAnnee = /^\d{4}$/.test(annee) ? `/modelyear/${annee}` : "";
  const r = await fetch(`${API}/GetModelsForMakeIdYear/makeId/${id}${parAnnee}/vehicletype/${encodeURIComponent(type)}?format=json`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json()) as { Results: { Model_Name: string }[] };
  return d.Results.map((m) => m.Model_Name.trim());
}

/** Modèles d'une marque de la liste (pour une année si fournie), triés et sans doublons. */
export function chargerModeles(marque: string, annee: string): Promise<string[]> {
  const id = ID_MARQUES[marque];
  if (!id) return Promise.resolve([]);
  const cle = `${marque}|${annee}`;
  if (!cache.has(cle)) {
    const promesse = Promise.allSettled(TYPES.map((t) => modelesParType(id, annee, t))).then((res) => {
      const ok = res.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      if (ok.length === 0) throw new Error("Liste des modèles indisponible");
      return [...new Set(ok.flat())].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
    });
    promesse.catch(() => cache.delete(cle));
    cache.set(cle, promesse);
  }
  return cache.get(cle)!;
}

/** Remet une marque de l'API (« MERCEDES-BENZ ») dans la forme de la liste (« Mercedes-Benz »). */
function normaliserMarque(nom: string): string {
  const connue = MARQUES.find((m) => m.toLowerCase() === nom.toLowerCase());
  if (connue) return connue;
  return nom.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
}

export async function decoderNiv(niv: string): Promise<{ marque: string; modele: string; annee: string } | null> {
  const r = await fetch(`${API}/DecodeVinValues/${encodeURIComponent(niv)}?format=json`);
  if (!r.ok) return null;
  const d = (await r.json()) as { Results: { Make: string; Model: string; ModelYear: string }[] };
  const v = d.Results[0];
  if (!v?.Make) return null;
  return { marque: normaliserMarque(v.Make), modele: v.Model ?? "", annee: v.ModelYear ?? "" };
}
