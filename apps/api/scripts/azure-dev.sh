#!/usr/bin/env bash
# Run the API with Azure Blob as its storage, against Azurite -- Microsoft's
# own Azure Storage emulator, running locally in Docker. Same SDK, same
# wire protocol, same SAS URL shape as the real thing; no account needed.
#
#   scripts/azure-dev.sh          start Azurite and print the settings
#   scripts/azure-dev.sh --run    ...and start the API on top of it
#
# Stop the emulator with: docker rm -f pdfslot-azurite
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CONTAINER=pdfslot

if ! docker ps --filter name=pdfslot-azurite --format '{{.Names}}' | grep -q pdfslot-azurite; then
  echo "starting Azurite..."
  # --skipApiVersionCheck: the SDK moves faster than the emulator, and
  # without it every call is refused for naming a version Azurite has not
  # heard of yet. The protocol itself is unchanged.
  docker run --rm -d --name pdfslot-azurite -p 10000:10000 \
    mcr.microsoft.com/azure-storage/azurite \
    azurite-blob --blobHost 0.0.0.0 --skipApiVersionCheck > /dev/null
  for _ in $(seq 1 30); do
    curl -s -m 2 -o /dev/null "http://127.0.0.1:10000/devstoreaccount1?comp=list" && break
    sleep 1
  done
fi
echo "Azurite is up on http://127.0.0.1:10000"

SAS="$(node scripts/emulator-sas.mjs "$CONTAINER" | tail -1)"
echo
echo "AZURE_BLOB_SAS_URL=$SAS"
echo

if [ "${1:-}" != "--run" ]; then
  echo "To run the API on it:  scripts/azure-dev.sh --run"
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a
# Set to empty rather than unset: nitro loads .env itself and fills in
# anything missing, so unsetting BLOB_DIR just lets it come back and the
# API quietly keeps writing to local files instead of Azure.
export BLOB_DIR=
export AZURE_BLOB_SAS_URL="$SAS"

echo "starting the API with Azure Blob as its storage..."
exec npm run dev
