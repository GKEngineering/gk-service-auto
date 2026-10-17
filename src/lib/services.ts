import type { Etat, TypeService } from "./types";

export interface Categorie {
  nom: string;
  elements: string[];
}

export interface Service {
  titre: string;
  code: string;
  description: string;
  vuesPhotos: string[];
  categories: Categorie[];
}

const VUES_EXTERIEURES = [
  "Avant",
  "Arrière",
  "Côté gauche",
  "Côté droit",
  "Tableau de bord (kilométrage)",
];

export const SERVICES: Record<TypeService, Service> = {
  maintenance: {
    titre: "Service Maintenance",
    code: "SM",
    description: "Mécanique : inspection et état du véhicule avant les travaux.",
    vuesPhotos: [...VUES_EXTERIEURES, "Compartiment moteur"],
    categories: [
      {
        nom: "Extérieur",
        elements: ["Carrosserie", "Pare-brise et vitres", "Phares et feux", "Rétroviseurs", "Essuie-glaces"],
      },
      {
        nom: "Pneus et roues",
        elements: ["Pneu avant gauche", "Pneu avant droit", "Pneu arrière gauche", "Pneu arrière droit", "Jantes", "Roue de secours"],
      },
      {
        nom: "Sous le capot",
        elements: [
          "Huile moteur (niveau et état)",
          "Liquide de refroidissement",
          "Liquide de frein",
          "Liquide lave-glace",
          "Liquide de direction assistée",
          "Batterie",
          "Courroies",
          "Durites",
          "Fuites visibles",
          "Filtre à air",
        ],
      },
      {
        nom: "Freins",
        elements: ["Plaquettes avant", "Plaquettes arrière", "Disques", "Frein de stationnement"],
      },
      {
        nom: "Suspension et direction",
        elements: ["Amortisseurs", "Direction", "Rotules et biellettes"],
      },
      {
        nom: "Intérieur et électrique",
        elements: ["Voyants au tableau de bord", "Climatisation et chauffage", "Klaxon", "Ceintures de sécurité"],
      },
      {
        nom: "Dessous du véhicule",
        elements: ["Échappement", "Corrosion / rouille"],
      },
    ],
  },
  detailing: {
    titre: "Détailing Auto",
    code: "DA",
    description: "Lavage : état extérieur et intérieur du véhicule avant le nettoyage.",
    vuesPhotos: [...VUES_EXTERIEURES, "Intérieur avant", "Intérieur arrière", "Coffre"],
    categories: [
      {
        nom: "Extérieur",
        elements: [
          "Peinture (rayures, éclats)",
          "Bosses",
          "Taches, goudron, sève",
          "Jantes et pneus",
          "Vitres",
          "Phares (opacité)",
          "Plastiques extérieurs",
          "Chromes",
        ],
      },
      {
        nom: "Intérieur",
        elements: [
          "Sièges avant",
          "Sièges arrière",
          "Tapis et moquette",
          "Ciel de toit",
          "Tableau de bord et console",
          "Panneaux de portières",
          "Coffre",
          "Odeurs",
          "Poils d'animaux",
          "Taches",
        ],
      },
    ],
  },
};

export const ETATS: { valeur: Etat; libelle: string; classes: string; rgb: [number, number, number] }[] = [
  { valeur: "bon", libelle: "Bon", classes: "bg-emerald-600 text-white border-emerald-600", rgb: [5, 150, 105] },
  { valeur: "surveiller", libelle: "À surveiller", classes: "bg-amber-500 text-white border-amber-500", rgb: [217, 119, 6] },
  { valeur: "defaut", libelle: "Défaut / dommage", classes: "bg-red-600 text-white border-red-600", rgb: [220, 38, 38] },
  { valeur: "na", libelle: "N/A", classes: "bg-slate-500 text-white border-slate-500", rgb: [100, 116, 139] },
];

export const NIVEAUX_CARBURANT = ["Vide", "1/4", "1/2", "3/4", "Plein"];

export function libelleEtat(etat: Etat | null): string {
  return ETATS.find((e) => e.valeur === etat)?.libelle ?? "Non vérifié";
}

export function numeroRapport(type: TypeService, numero: number): string {
  return `GK-${SERVICES[type].code}-${String(numero).padStart(5, "0")}`;
}

export function cleElement(categorie: string, element: string): string {
  return `${categorie}::${element}`;
}
