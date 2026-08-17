import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
// Pour tester depuis un téléphone/autre appareil sur le réseau local en dev,
// renseigner DEV_ALLOWED_ORIGINS dans apps/web/.env.local (ex. "192.168.1.42"),
// jamais ici — ce fichier est versionné et l'IP change selon la machine du dev.
const devAllowedOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(devAllowedOrigins.length > 0 && { allowedDevOrigins: devAllowedOrigins }),
};

export default withNextIntl(nextConfig);
