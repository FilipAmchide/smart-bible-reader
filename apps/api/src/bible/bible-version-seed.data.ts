import type { BibleVersion } from "@sbr/shared-types";

/**
 * Catalogue de démarrage — un fournisseur par langue couverte en phase 1.
 * Les identifiants de version YouVersion utilisés dans linkTemplate sont
 * illustratifs : à confirmer auprès du fournisseur (ou remplacés par un
 * partenaire différent) avant mise en production. La console admin (§2.7,
 * phase 3) sera le point d'entrée pour les corriger sans redéploiement —
 * en attendant, ce fichier fait office de source de vérité amorcée au démarrage.
 */
export const bibleVersionSeed: BibleVersion[] = [
  {
    code: "S21-FR",
    language: "fr",
    name: "Segond 21",
    provider: "YouVersion",
    linkTemplate: "https://www.bible.com/bible/93/{bookCode}.{chapter}.S21",
  },
  {
    code: "NIV-EN",
    language: "en",
    name: "New International Version",
    provider: "YouVersion",
    linkTemplate: "https://www.bible.com/bible/111/{bookCode}.{chapter}.NIV",
  },
  {
    code: "RVR1960-ES",
    language: "es",
    name: "Reina-Valera 1960",
    provider: "YouVersion",
    linkTemplate: "https://www.bible.com/bible/149/{bookCode}.{chapter}.RVR1960",
  },
  {
    code: "LUT17-DE",
    language: "de",
    name: "Lutherbibel 2017",
    provider: "YouVersion",
    linkTemplate: "https://www.bible.com/bible/64/{bookCode}.{chapter}.LUT17",
  },
];
