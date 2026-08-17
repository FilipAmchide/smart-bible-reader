"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Toutes les pages sont des composants client (voir la note dans
 * `[locale]/layout.tsx`) — l'API `metadata`/`generateMetadata` de Next.js ne
 * s'applique qu'aux composants serveur, donc pas d'onglet de titre par page
 * sans ce contournement. `document.title` reste le seul levier disponible ici ;
 * `[locale]/layout.tsx` fournit un titre par défaut pour le tout premier rendu
 * serveur, avant que cet effet ne s'exécute.
 *
 * `title` peut être `null` le temps qu'une donnée asynchrone (nom de plan,
 * d'utilisateur…) se charge — l'onglet garde alors le titre par défaut de
 * l'app plutôt qu'un titre vide.
 */
export function usePageTitle(title: string | null): void {
  const t = useTranslations("common");

  useEffect(() => {
    document.title = title ? `${title} · ${t("appName")}` : t("appName");
  }, [title, t]);
}
