#!/usr/bin/env bash
# tools/push-github.sh — COMMIT + PUSH otomatis project Nova ke GitHub.
#
# Token TIDAK disimpan di file ini (aman walau repo di-clone/di-share).
# Token dibaca dari environment. Nama yang didukung (prioritas kiri):
#   GITHUB_TOKEN  →  GITHUB_TOKEN2
#
# Pakai:
#   bash tools/push-github.sh "feat: tambah fitur X"
# atau di server (set sekali):
#   export GITHUB_TOKEN2=xxxx        # taruh di ~/.bashrc / PM2 ecosystem
#   bash tools/push-github.sh "fix: perbaikan Y"
set -e
TOKEN="${GITHUB_TOKEN:-${GITHUB_TOKEN2:-}}"
MSG="${1:-update otomatis $(date '+%Y-%m-%d %H:%M')}"
REPO="${NOVA_REPO:-https://github.com/itsmeeaizat/Nova-AI-Whatsapp-Bot-Multi-Device-2.git}"
cd "$(dirname "$0")/.."

[ -n "$TOKEN" ] || { echo "❌ Token belum diset. export GITHUB_TOKEN=... atau GITHUB_TOKEN2=..."; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ bukan repo git"; exit 1; }

# credential via askpass sementara (token tidak masuk .git/config)
ASKPASS="$(mktemp)"; trap 'rm -f "$ASKPASS"' EXIT
cat > "$ASKPASS" <<'EOS2'
#!/bin/sh
case "$1" in
  *Username*) echo "x-access-token" ;;
  *) echo "$NOVA_GIT_TOKEN" ;;
esac
EOS2
chmod +x "$ASKPASS"
export NOVA_GIT_TOKEN="$TOKEN"
export GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0

git add -A
if git diff --cached --quiet; then
  echo "ℹ️ tidak ada perubahan baru — lanjut push commit lokal yang belum terkirim"
else
  git commit -m "$MSG"
  echo "✅ commit: $MSG"
fi
git push "$REPO" HEAD:main
echo "✅ tersimpan di GitHub: $REPO"
