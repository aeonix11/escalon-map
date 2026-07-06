#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .next/BUILD_ID ]]; then
  echo "Building Escalon Map for production (first time only)..."
  npm run build
fi
npm run start
