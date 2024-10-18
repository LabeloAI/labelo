#!/usr/bin/env bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "SCRIPT_DIR: ${SCRIPT_DIR}"

echo "=> Create production bundle..."
cd ${SCRIPT_DIR}/../labelo/frontend
npm ci && npm run build:production
cd ${SCRIPT_DIR}

MANAGE=${SCRIPT_DIR}/../labelo/manage.py

echo "=> Collect static..."
python3 $MANAGE collectstatic --no-input

echo "=> Create version file..."
python3 ${SCRIPT_DIR}/../labelo/core/version.py
