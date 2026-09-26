#!/usr/bin/env bash
# tools/save-to-branch.sh — COMMIT otomatis perubahan Nova ke BRANCH, TANPA PUSH.
#
# PELAJARAN 26 Sep 2026: sistem auto-push lama (push-github.sh, sudah DIHAPUS)
# bikin akun GitHub kena flag abuse. Sekarang perubahan cuma di-commit ke
# branch "auto-changes" (default) dan TIDAK PERNAH push ke remote.
# Push ke GitHub HANYA kalau owner yang minta.
#
# Pakai:
#   bash tools/save-to-branch.sh "feat: tambah fitur X"
#   NOVA_AUTO_BRANCH=pekerjaan-hari-ini bash tools/save-to-branch.sh "fix: Y"
# Gabungin ke main nanti (manual / saat owner minta):
#   git checkout main && git merge auto-changes
set -e
MSG="${1:-perubahan otomatis $(date '+%Y-%m-%d %H:%M')}"
BRANCH="${NOVA_AUTO_BRANCH:-auto-changes}"
cd "$(dirname "$0")/.."
git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ bukan repo git"; exit 1; }

# pindah ke branch kerja (bawa-bawa perubahan yang belum di-commit)
CUR="$(git branch --show-current)"
if [ "$CUR" != "$BRANCH" ]; then
  git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH"
  echo "🌿 pindah ke branch: $BRANCH"
fi

git add -A
if git diff --cached --quiet; then
  echo "ℹ️ tidak ada perubahan baru — tidak ada yang di-commit"
else
  git commit -m "$MSG"
  echo "✅ commit tersimpan di branch '$BRANCH' (LOKAL, tidak dipush): $MSG"
fi
echo "ℹ️ push ke GitHub hanya dilakukan atas permintaan owner."
