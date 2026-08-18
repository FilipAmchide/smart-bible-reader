#!/usr/bin/env bash
#
# sync-to-atlas.sh — Synchronise la base MongoDB locale (conteneur Docker,
# cf. docker-compose.yml à la racine) vers MongoDB Atlas.
#
# Aucun outil à installer sur la machine hôte : mongodump/mongorestore sont
# exécutés à l'intérieur du conteneur "mongo" (image officielle mongo:7, qui
# les embarque), et le dump est directement chaîné vers la restauration
# (pas de fichier intermédiaire).
#
# Usage :
#   ./sync-to-atlas.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.sync"

# Charge les variables depuis .env.sync si présent (sans écraser celles déjà exportées)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# --- Configuration -----------------------------------------------------

# Nom du service docker-compose exécutant mongod (cf. docker-compose.yml)
COMPOSE_SERVICE="${MONGO_COMPOSE_SERVICE:-mongo}"

# Nom de la base à synchroniser
DB_NAME="${MONGODB_DB_NAME:-smart_bible_reader}"

# URI Atlas — À DÉFINIR (jamais en dur dans ce script / le repo).
# Exemple : mongodb+srv://user:motdepasse@cluster0.xxxxx.mongodb.net/smart_bible_reader?retryWrites=true&w=majority
ATLAS_URI="${ATLAS_MONGODB_URI:-}"

# --- Vérifications -------------------------------------------------------

if [[ -z "$ATLAS_URI" ]]; then
  echo "Erreur : ATLAS_MONGODB_URI n'est pas défini." >&2
  echo "Exportez-le, ou renseignez-le dans ${ENV_FILE} (voir .env.sync.example)." >&2
  exit 1
fi

if command -v docker compose >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Erreur : ni 'docker compose' ni 'docker-compose' n'est disponible." >&2
  exit 1
fi

if ! "${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" ps --status running "$COMPOSE_SERVICE" 2>/dev/null | grep -q "$COMPOSE_SERVICE"; then
  echo "Erreur : le service '$COMPOSE_SERVICE' n'est pas démarré (lancez 'docker compose up -d $COMPOSE_SERVICE')." >&2
  exit 1
fi

echo "Base locale (conteneur '$COMPOSE_SERVICE') : $DB_NAME"
echo "Base Atlas                                : ${ATLAS_URI%%@*}@***"   # masque les identifiants dans les logs
echo

read -r -p "Ceci va ÉCRASER (--drop) les collections correspondantes sur Atlas. Continuer ? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Annulé."
  exit 0
fi

# --- Dump local -> restore Atlas, chaînés dans le conteneur --------------
#
# --drop : supprime chaque collection cible avant de la recréer, pour un
# miroir fidèle du local. Retirez --drop pour fusionner sans rien supprimer.

echo "==> Export local + import Atlas..."
"${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" exec -T \
  -e ATLAS_URI="$ATLAS_URI" \
  -e DB_NAME="$DB_NAME" \
  "$COMPOSE_SERVICE" \
  sh -c 'mongodump --db="$DB_NAME" --archive | mongorestore --uri="$ATLAS_URI" --drop --archive'

echo "Synchronisation terminée."
