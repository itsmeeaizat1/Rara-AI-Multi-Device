#!/usr/bin/env bash
# tools/push-github.sh — COMMIT otomatis + PUSH THROTTLED Nova ke GitHub.
#
# PELAJARAN 26 Sep 2026: push terlalu sering (tiap perubahan kecil) memicu
# sistem deteksi penyalahgunaan GitHub → akun suspend. Sekarang:
#   - COMMIT selalu jalan (aman, lokal doang)
#   - PUSH otomatis maksimal 1x per jeda (default 3 JAM), sisanya nunggu
#   - PUSH LANGSUNG kapan pun: tambahkan argumen "now"
#
# Token TIDAK disimpan di file ini. Dibaca dari environment (prioritas kiri):
#   GITHUB_TOKEN  →  GITHUB_TOKEN2
#
# Pakai:
#   bash tools/push-github.sh "feat: tambah fitur X"      # commit + push (kalau jeda sudah lewat)
#   bash tools/push-github.sh "feat: tambah fitur X" now  # commit + push LANGSUNG tanpa nunggu jeda
#   NOVA_PUSH_COOLDOWN_SEC=1800 bash tools/push-github.sh "fix: Y"   # ubah jeda (contoh: 30 mnt)
# Server (set sekali di ~/.bashrc / PM2 ecosystem):
#   export GITHUB_TOKEN2=xxxx
set -e
MSG="${1:-update otomatis $(date '+%Y-%m-%d %H:%M')}"
FORCE="${2:-}"
TOKEN="${GITHUB_TOKEN:-${GITHUB_TOKEN2:-}}"
REPO="${NOVA_REPO:-https://github.com/itsmeeaizat/Nova-AI-Whatsapp-Bot-Multi-Device-2.git}"
COOLDOWN="${NOVA_PUSH_COOLDOWN_SEC:-10800}"   # default 3 jam
cd "$(dirname "$0")/.."
git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ bukan repo git"; exit 1; }
LAST_FILE="$(git rev-parse --git-dir)/push-github-last"

# ── 1. COMMIT (selalu jalan, lokal doang — gak butuh token) ──
git add -A
if git diff --cached --quiet; then
  echo "ℹ️ tidak ada perubahan baru"
else
  git commit -m "$MSG"
  echo "✅ commit lokal: $MSG"
fi

# ── 2. PUSH (throttled) ──
NOW=$(date +%s)
LAST=$(cat "$LAST_FILE" 2>/dev/null || echo 0)
if [ "$FORCE" != "now" ] && [ -n "$LAST" ] && [ $((NOW - LAST)) -lt "$COOLDOWN" ]; then
  LEFT=$(( (LAST + COOLDOWN - NOW) / 60 ))
  echo "🕒 push DITUNDA (anti spam): jeda belum lewat, bisa push lagi dalam ±${LEFT} menit."
  echo "   Commit lokal tetap aman. Mau push SEKARANG? jalankan dengan argumen 'now'."
  exit 0
fi

[ -n "$TOKEN" ] || { echo "⚠️ Token belum diset — commit tersimpan lokal, push dilewati."; exit 0; }

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

if git push "$REPO" HEAD:main; then
  echo "$NOW" > "$LAST_FILE"
  echo "✅ tersimpan di GitHub: $REPO"
else
  echo "❌ push gagal — commit tetap aman di lokal, coba lagi nanti."
  exit 1
fi
