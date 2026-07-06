#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local — add your API keys before using AI features."
fi

echo ""
echo "Setup complete. Start the app with:"
echo "  npm run dev"
echo "Then open http://localhost:3000"
