# GK Service Auto

Application web installable (PWA) pour les techniciens de GK Service Auto.

Deux sections :

- **Service Maintenance** : mécanique. On prend l'état du véhicule en photo à l'arrivée et on remplit la fiche d'inspection (pneus, freins, liquides, etc.).
- **Détailing Auto** : lavage. On prend l'état extérieur et intérieur en photo avant le nettoyage.

À la fin, le client signe sur l'écran. Un rapport PDF avec les photos est généré, enregistré, puis **envoyé automatiquement par courriel au client** avant le début des travaux. Toutes les inspections restent consultables dans l'**Historique**.

Autres fonctions :

- **Client récurrent** : recherche par nom, courriel, téléphone ou plaque. Elle remplit la fiche et affiche l'historique du véhicule (points à surveiller, travaux refusés).
- **Travaux recommandés avec prix** : TPS et TVQ calculées. Le client reçoit une soumission et l'**approuve en ligne** (page `/soumission/…`), et l'entreprise est avertie par courriel.
- **Rapport de fin de travaux (Détailing)** : photos après prises à côté des photos avant, PDF avant / après envoyé au client.
- Liens vers les **forfaits** et la **prise de rendez-vous** sur gkgroupeinc.com.

## Technologies

- Next.js 16 (React 19) et Tailwind CSS 4
- Supabase : base de données, stockage des photos et PDF, comptes des techniciens
- jsPDF : génération du rapport PDF sur l'appareil
- Nodemailer (SMTP) : envoi du courriel avec le PDF en pièce jointe

## Mise en route

### 1. Supabase (gratuit)

1. Créez un projet sur <https://supabase.com>.
2. Dans **SQL Editor**, collez et exécutez le contenu de [`supabase/schema.sql`](supabase/schema.sql).
   Si la base existait déjà, exécutez seulement les nouveaux fichiers de [`supabase/migrations/`](supabase/migrations/).
3. Dans **Authentication > Users > Add user**, créez un compte (courriel et mot de passe) pour chaque technicien.
4. Dans **Authentication > Sign In / Providers**, désactivez « Allow new users to sign up » pour que personne ne puisse se créer un compte.
5. Dans **Project Settings > API**, copiez l'URL, la clé `anon` et la clé `service_role`.

### 2. Courriel (Gmail par exemple)

1. Sur le compte Gmail de l'entreprise, activez la **validation en 2 étapes**.
2. Créez un **mot de passe d'application** : <https://myaccount.google.com/apppasswords>.
3. Utilisez-le comme `SMTP_PASS`.

Avec un domaine (par exemple `info@gkserviceauto.ca`), utilisez les paramètres SMTP de votre hébergeur.

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local   # puis remplir les valeurs
```

### 4. Lancer

```bash
npm install
npm run dev        # http://localhost:3000
```

## Mise en ligne (Vercel, gratuit)

1. Poussez le projet sur GitHub, puis importez-le sur <https://vercel.com>.
2. Ajoutez les mêmes variables d'environnement que dans `.env.local`.
3. Une fois l'application en ligne, ouvrez l'adresse sur le téléphone :
   - **Android (Chrome)** : menu ⋮, puis « Installer l'application ».
   - **iPhone (Safari)** : bouton Partager, puis « Sur l'écran d'accueil ».

L'appareil photo et l'installation demandent HTTPS, ce que Vercel fournit automatiquement.

## Structure

```
src/
  app/
    page.tsx                         Accueil : choix de la section
    connexion/                       Connexion des techniciens
    inspection/nouvelle/[type]/      Formulaire (maintenance | detailing)
    inspection/[id]/                 Détail d'un rapport, renvoi du courriel
    historique/                      Liste et recherche des inspections
    api/envoyer-rapport/             Envoi du courriel (serveur)
  components/                        Formulaire, photos, signature…
  lib/
    services.ts                      Checklists des deux sections (modifiable)
    pdf.ts                           Mise en page du rapport PDF
    enregistrer.ts                   Téléversement, enregistrement et envoi
supabase/schema.sql                  Tables, stockage et sécurité
```

Pour ajouter ou retirer des points d'inspection, ou changer les photos obligatoires, modifiez `src/lib/services.ts`.
