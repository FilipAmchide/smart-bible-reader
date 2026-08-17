import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "./config";

/** Link/useRouter conscients de la locale — préfixent automatiquement l'URL. */
export const { Link, useRouter, usePathname, redirect } = createSharedPathnamesNavigation({
  locales,
});
