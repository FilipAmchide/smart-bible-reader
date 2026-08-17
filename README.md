# Smart Bible Reader

Application web mobile-first pour planifier, suivre et tenir un rythme de lecture de la Bible.
**Tracker uniquement** — aucun texte biblique n'est hébergé ni affiché ; chaque chapitre planifié
pointe vers un fournisseur externe (YouVersion pour l'instant) pour la lecture elle-même.

Le cahier des charges complet (faisabilité, diagrammes, architecture des données) vit en dehors de
ce dépôt ; ce README documente ce qui est réellement implémenté.

## État d'avancement

**Phase 1 — comptes & authentification :**

- [x] Comptes utilisateurs (email et/ou téléphone comme identifiant)
- [x] Connexion par OTP (code à usage unique, SMS ou email)
- [x] Connexion par mot de passe + double authentification (TOTP, type Google Authenticator/Authy),
      avec codes de secours
- [x] Gestion du profil (nom, langue, fuseau horaire, version de lecture préférée)
- [x] Référentiel biblique complet (66 livres, découpage par chapitre, ordre canonique)
- [x] Structure i18n, couverture française, anglaise, espagnole et allemande

**Phase 2 — cœur du produit :**

- [x] Création de plans de lecture (Bible entière, AT/NT, prophètes, Psaumes, Proverbes, sélection
      libre de livres dans l'ordre choisi)
- [x] Algorithme de répartition par chapitre (méthode du plus grand reste, étalée uniformément sur
      l'intervalle — jamais de chapitre scindé, jamais le reste empilé en fin de plan)
- [x] Liens de lecture externes par chapitre, calculés à partir de la version biblique préférée de
      l'utilisateur (catalogue `bible_versions`, un fournisseur par langue en amorçage)
- [x] Marquage de lecture (par chapitre, au sein de la tranche assignée du jour)
- [x] Recalcul du plan restant (l'historique passé — y compris les jours manqués — reste inchangé ;
      seuls les chapitres non lus sont redistribués à partir d'aujourd'hui)

**Phase 3 — engagement :**

- [x] Dashboard personnel (série de lecture courante/record, chapitres lus, jours respectés/manqués/
      partiels, répartition AT/NT, activité des 30 derniers jours, plans en cours et historique)
- [x] Notifications SMS (Twilio), email (SMTP, phase 1) et Web Push (VAPID + service worker),
      pilotées par un planificateur qui respecte l'heure de rappel, l'heure d'alerte de retard, les
      heures calmes et le fuseau horaire de chacun, sans jamais renvoyer deux fois le même rappel
- [x] Paramétrage des notifications (canaux, horaires, heures calmes, résumé hebdomadaire) et de la
      version de lecture préférée, depuis l'écran de profil
- [x] Interface arabe complète, RTL (`dir="rtl"` posé dynamiquement, mise en page en miroir)
- [x] Écrans de création et de suivi des plans de lecture (calendrier à cases à cocher, recalcul)

**Au-delà de la feuille de route initiale :**

- [x] Export d'un plan de lecture en PDF ou Excel (calendrier complet, statuts, temps de lecture)
- [x] Temps de lecture déclaré par l'utilisateur, en heures/minutes (voir la note ci-dessous sur ce
      qui est mesurable ou non)

**Pas encore implémenté** : console d'administration, bassa (traduction humaine non disponible).

## Structure du dépôt

```
smart-bible-reader/
├── apps/
│   ├── web/            # Frontend Next.js (App Router, next-intl)
│   └── api/             # Backend NestJS (auth, users, bible)
├── packages/
│   ├── shared-types/     # Types TypeScript partagés (DTO, enums) — sans étape de build
│   ├── bible-data/       # Référentiel des 66 livres, noms FR/EN/ES/DE — sans étape de build
│   └── locales/          # Fichiers de traduction (fr, en, es, de, ar) — bas à venir
├── docker-compose.yml    # MongoDB + Redis pour le développement local
└── README.md
```

`shared-types` et `bible-data` sont consommés comme source TypeScript directement (pas de `dist/`) :
en dev, `ts-node` et Next.js les transpilent à la volée. C'est volontairement simple pour l'instant —
avant un déploiement de production, leur donner une vraie étape de build (`tsc`) est la prochaine
amélioration naturelle (voir la note dans `apps/api/package.json`).

## Prérequis

- Node.js ≥ 20
- Docker (pour MongoDB/Redis en local) — ou une instance MongoDB accessible autrement

## Installation locale

```bash
git clone git@github.com:FilipAmchide/smart-bible-reader.git
cd smart-bible-reader
npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

docker-compose up -d          # MongoDB + Redis
npm run seed:bible            # amorce le référentiel des 66 livres (optionnel : se fait aussi au 1er démarrage)

npm run dev                   # lance apps/api (:3001) et apps/web (:3000) en parallèle
```

Le générateur de code OTP écrit les codes dans les **logs du serveur API** tant que
`SMS_TRANSPORT`/`EMAIL_TRANSPORT` valent `console` (valeur par défaut en développement) — pas besoin
de compte Twilio/SendGrid pour tester le parcours d'inscription/connexion en local.

- Frontend : http://localhost:3000 (redirige vers `/fr`, `/en`, `/es`, `/de` ou `/ar`)
- API : http://localhost:3001
- Documentation API (Swagger) : http://localhost:3001/docs

## Variables d'environnement principales

`apps/api/.env` (voir `apps/api/.env.example` pour la liste complète) :

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | Chaîne de connexion MongoDB |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signature des jetons de session |
| `JWT_PRE_2FA_SECRET` | Signature des jetons temporaires (étape intermédiaire avant 2FA) |
| `SECRETS_ENCRYPTION_KEY` | Clé AES-256 (hex, 32 octets) qui chiffre le secret TOTP au repos |
| `OTP_TTL_SECONDS` / `OTP_MAX_ATTEMPTS` | Durée de vie et nombre d'essais d'un code OTP |
| `TOTP_ISSUER` | Nom affiché dans l'application authenticator |
| `SMS_TRANSPORT` | `console` (dev) ou `twilio` (envoi réel) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Identifiants Twilio, requis si `SMS_TRANSPORT=twilio` |
| `EMAIL_TRANSPORT` | `console` (dev) ou `smtp` (envoi réel via `nodemailer`) |
| `EMAIL_FROM` | Adresse d'expédition des emails envoyés (OTP, rappels, etc.) |
| `SMTP_URL` | Chaîne de connexion complète (ex. `smtps://user:pass@host:465`) — si renseignée, prime sur les champs `SMTP_*` discrets |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_TLS` | Paramètres SMTP discrets, utilisés si `SMTP_URL` est vide |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Clés Web Push (générer avec `npx web-push generate-vapid-keys`) |
| `VAPID_CONTACT_EMAIL` | Contact `mailto:` requis par la spec Web Push |
| `SCHEDULER_WINDOW_MINUTES` | Tolérance (minutes) autour de l'heure programmée d'un rappel — le job tourne toutes les 5 min |

`apps/web/.env.local` :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL de base de l'API backend |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Doit être identique à `VAPID_PUBLIC_KEY` côté API (clé publique uniquement) |

## Scripts

```bash
npm run dev            # api + web en parallèle
npm run dev:api        # api seule
npm run dev:web        # web seule
npm run seed:bible     # (ré)amorce le référentiel biblique
npm test               # tests unitaires (apps/api : OTP, TOTP, chiffrement, plans, séries, planificateur…)
npm run build          # build de production (apps/web uniquement pour l'instant, voir note ci-dessus)
```

## Tour d'horizon technique

- **Backend** — NestJS + MongoDB (Mongoose). L'authentification suit trois briques distinctes :
  `OtpService` (génération/vérification des codes, hashés, TTL, limitation des tentatives),
  `TotpService` (RFC 6238 via `otplib`, QR code via `qrcode`) et `AuthService` (orchestration :
  inscription, connexion OTP, connexion mot de passe, activation/désactivation 2FA, jetons JWT).
  Le secret TOTP est chiffré au repos (AES-256-GCM, voir `common/utils/crypto.util.ts`) ; les codes
  de secours et le mot de passe sont hashés avec `argon2`.
- **Frontend** — Next.js (App Router) + `next-intl`. Chaque route est préfixée par la langue
  (`/fr/login`, `/en/profile`, `/ar/dashboard`…) ; le sélecteur de langue change le préfixe sans
  perdre l'écran courant. L'arabe bascule `dir="rtl"` dynamiquement (mise en page en miroir, pas
  seulement le texte) — les classes Tailwind physiques (`text-left`…) ont été remplacées par leurs
  équivalents logiques (`text-start`) partout où c'était pertinent.
- **Référentiel biblique** — `@sbr/bible-data` encode les 66 livres avec un garde-fou exécuté au
  chargement du module : le total doit faire exactement 1189 chapitres (929 AT + 260 NT), sans quoi
  le module lève une erreur plutôt que de laisser une donnée fausse circuler silencieusement.
- **Plans de lecture** — la répartition (`reading-plans/plan-generator.util.ts`) est un ensemble de
  fonctions pures, testées indépendamment de MongoDB : elle résout le périmètre choisi en liste de
  chapitres, puis les étale sur les jours disponibles par la méthode du plus grand reste avec un
  espacement à la Bresenham (aucun jour ne concentre tout le reste). Le marquage de lecture alimente
  une collection séparée (`reading_logs`, un chapitre lu = un document) plutôt que de modifier le
  planning en place ; le recalcul reconstruit la séquence d'origine et en retire ce qui est déjà lu,
  ce qui rend le "reste à lire" déterministe sans avoir à retoucher les jours passés.
- **Liens externes** — `BibleVersionService` construit l'URL de lecture à partir d'un gabarit
  (`bible_versions`, amorcé avec un fournisseur par langue) et de la version préférée de
  l'utilisateur, avec repli sur sa langue d'interface. Les identifiants de version du catalogue de
  départ sont illustratifs — à confirmer avant production (voir le commentaire dans
  `bible-version-seed.data.ts`).
- **Dashboard & séries** — `DashboardService` agrège plans et journal de lecture à la volée (pas de
  vue matérialisée). La série de lecture (`streak.util.ts`, fonctions pures) se calcule sur les
  *jours où un chapitre a réellement été marqué lu* (`readAt`), volontairement distincte des « jours
  respectés » du planning : rattraper trois jours de retard en une seule session compte comme un jour
  d'activité, pas trois — cohérent avec la sémantique habituelle d'un compteur de série.
- **Planificateur de notifications** — `NotificationsSchedulerService` tourne toutes les 5 minutes
  (`@nestjs/schedule`, pas de file BullMQ pour l'instant : complexité jugée disproportionnée par
  rapport au besoin actuel — Redis reste disponible si une vraie file devient nécessaire à l'échelle).
  Le calcul de ce qui est « dû » (`due-notifications.util.ts`) est entièrement pur — fuseau horaire,
  heures calmes, fenêtre de tolérance, déduplication quotidienne/hebdomadaire — et testé sans horloge
  réelle. Chaque envoi est journalisé (`notifications`) ; un canal en échec n'empêche jamais les
  autres d'être tentés.
- **Web Push** — abonnements par appareil (`devices`), service worker minimal (`apps/web/public/sw.js`)
  et clés VAPID. Un abonnement expiré (410/404) est retiré silencieusement au prochain envoi plutôt
  que de s'accumuler indéfiniment.
- **Export PDF/Excel** — `reading-plans/export/`. Le PDF (`pdfkit`) et le classeur (`exceljs`)
  partagent la même vue détaillée du plan. Différence assumée entre les deux formats : Excel affiche
  les libellés dans la langue de l'utilisateur, arabe RTL inclus (le rendu du texte est délégué à
  Excel/Sheets, aucun souci de police) ; le PDF, lui, dessine chaque glyphe via une police intégrée
  sans caractères arabes ni moteur de réordonnancement bidirectionnel — il replie donc sur l'anglais
  pour `ar` plutôt que d'afficher des carrés vides (voir `plan-export-labels.ts`).
- **Temps de lecture** — saisie manuelle, pas de chronomètre : SBR ne contrôle pas la page de lecture
  externe (§2.4), donc rien ne garantit qu'un chronométrage automatique (démarré à l'ouverture du
  lien, arrêté au cochage) corresponde au temps de lecture réel — l'utilisateur peut très bien lire un
  moment, s'interrompre, revenir plus tard. `ReadingDurationInput` (côté web) se contente donc de deux
  champs heures/minutes que l'utilisateur remplit après coup ; la valeur validée s'additionne à celle
  déjà enregistrée pour le jour (`readingDurationSeconds`) et remonte au dashboard
  (`totalReadingTimeSeconds`).

## Licence

À définir par le porteur du projet.
