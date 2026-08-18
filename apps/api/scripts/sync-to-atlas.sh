#!/usr/bin/env bash
#
# sync-to-atlas.sh — Synchronise une base MongoDB locale vers MongoDB Atlas.
#
# Prérequis : mongodump / mongorestore installés (paquet mongodb-database-tools)
#   macOS : brew install mongodb-database-tools
#
# Usage :
#   ./sync-to-atlas.sh
#
# Configuration : soit via variables d'environnement, soit via un fichier
# .env.sync (voir .env.sync.example) placé à côté de ce script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.sync"

# Charge les variables depuis .env.sync si présent (sans écraser celles déjà exportées)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# --- Configuration -----------------------------------------------------

# URI de la base locale (celle utilisée par l'API en dev, cf. .env.example)
LOCAL_URI="${LOCAL_MONGODB_URI:-mongodb://localhost:27017/smart_bible_reader}"

# URI Atlas — À DÉFINIR (jamais en dur dans ce script / le repo).
# Exemple : mongodb+srv://user:motdepasse@cluster0.xxxxx.mongodb.net/smart_bible_reader?retryWrites=true&w=majority
ATLAS_URI="${ATLAS_MONGODB_URI:-}"

# Dossier temporaire pour le dump
DUMP_DIR="${SCRIPT_DIR}/.dump-$(date +%Y%m%d-%H%M%S)"

# --- Vérifications -------------------------------------------------------

if [[ -z "$ATLAS_URI" ]]; then
  echo "Erreur : ATLAS_MONGODB_URI n'est pas défini." >&2
  echo "Exportez-le, ou renseignez-le dans ${ENV_FILE} (voir .env.sync.example)." >&2
  exit 1
fi

for bin in mongodump mongorestore; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Erreur : '$bin' est introuvable. Installez mongodb-database-tools." >&2
    echo "  macOS : brew install mongodb-database-tools" >&2
    exit 1
  fi
done

echo "Base locale : $LOCAL_URI"
echo "Base Atlas  : ${ATLAS_URI%%@*}@***"   # masque les identifiants dans les logs
echo

read -r -p "Ceci va ÉCRASER (--drop) les collections correspondantes sur Atlas. Continuer ? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Annulé."
  exit 0
fi

# --- 1. Dump de la base locale -------------------------------------------

echo "==> Export de la base locale vers ${DUMP_DIR}..."
mongodump --uri="$LOCAL_URI" --out="$DUMP_DIR"

# --- 2. Restauration sur Atlas --------------------------------------------

echo "==> Import vers Atlas..."
# --drop : supprime chaque collection cible avant de la recréer, pour un miroir fidèle du local.
# Retirez --drop si vous préférez fusionner sans supprimer les données existantes sur Atlas.
mongorestore --uri="$ATLAS_URI" --drop "$DUMP_DIR"/*

# --- 3. Nettoyage ---------------------------------------------------------

echo "==> Nettoyage du dump temporaire..."
rm -rf "$DUMP_DIR"

echo "Synchronisation terminée."
