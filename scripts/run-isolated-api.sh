#!/bin/bash
# Starts the fixture API with the same isolated runtime as setup-backend-test.sh.
# Does not read .env.test and does not print the database URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-/tmp/mecanimovil-backend}"
DB_NAME="${DB_NAME:-mecanimovil_test}"
DB_USER="${DB_USER:-mecani_test}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
PORT="${PORT:-8010}"

# shellcheck disable=SC1091
source "$BACKEND_DIR/venv/bin/activate"
unset REDIS_URL CELERY_BROKER_URL CELERY_RESULT_BACKEND
export BACKEND_DIR
export DATABASE_URL="postgis://${DB_USER}:test123@${DB_HOST}:${DB_PORT}/${DB_NAME}"
export DEBUG=True
export SECURE_SSL_REDIRECT=False
export ASISTENTE_COTIZACION_IA_ENABLED=False
export BUSQUEDA_WEB_REPUESTOS_ENABLED=False
export OMNICHANNEL_ENABLED=False
export WHATSAPP_TEMPLATES_ENABLED=False
export GDAL_LIBRARY_PATH="${GDAL_LIBRARY_PATH:-/usr/lib/x86_64-linux-gnu/libgdal.so}"
export SECRET_KEY="${SECRET_KEY:-test-secret-key-for-ci-only-never-use-in-production}"
cd "$BACKEND_DIR"
exec python "$ROOT/scripts/isolated_backend.py" runserver "0.0.0.0:${PORT}"
