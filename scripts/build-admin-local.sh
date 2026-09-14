#!/bin/bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$#" -eq 0 ]; then
  set -- backend frontend knowledge-gateway platform-gateway
fi
for service in "$@"; do
  case "$service" in
    backend|frontend|knowledge-gateway|platform-gateway) ;;
    *) echo "Unknown Admin DSH service: $service" >&2; exit 1 ;;
  esac
  # Tar stdin avoids Docker Desktop xattr failures on external Mac volumes.
  COPYFILE_DISABLE=1 tar --no-xattrs --exclude='._*' --exclude='__pycache__' \
    --exclude='.pytest_cache' --exclude='.venv' --exclude='.env*' \
    -C "$repo_dir/$service" -cf - . |
    docker build -t "admin-dsh-local-$service:latest" -
done
