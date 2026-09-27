#!/usr/bin/env bash
# tools/save-to-branch.sh — COMMIT + PUSH otomatis perubahan Nova ke BRANCH TERPISAH.
#
# OWNER 27 Sep 2026: "setiap ada perubahan push ke branch terpisah, jadi nanti
# sampai muncul notif di GitHub ada tombol hijau, nanti pushnya sesuai kemauan aku"
# → setiap perubahan di-commit lalu di-PUSH ke branch sendiri di GitHub, muncul
# notifikasi + banner hijau "Compare & pull request", dan OWNER yang merge ke
# main sendiri kapan pun sesuai maunya.
#
# Pelajaran suspend 26 Sep TETAP berlaku: MAIN TIDAK PERNAH di-push otomatis
# oleh script ini — merge ke main 100% keputusan owner (tombol hijau di GitHub
# atau perintah eksplisit).
#
# Pakai:
#   bash tools/save-to-branch.sh "feat: tambah fitur X"
#   bash tools/save-to-branch.sh "fix: Y" nama-branch-fitur
#   NOVA_AUTO_BRANCH=pekerjaan-hari-ini bash tools/save-to-branch.sh "fix: Z"
# Token auth (urutan): NOVA_GH_TOKEN → GITHUB_TOKEN_2 → GITHUB_TOKEN (env).
set -e
MSG="${1:-perubahan otomatis $(date '+%Y-%m-%d %H:%M')}"
BRANCH="${2:-${NOVA_AUTO_BRANCH:-auto-changes}}"
TOKEN="${NOVA_GH_TOKEN:-${GITHUB_TOKEN_2:-${GITHUB_TOKEN:-}}}"
cd "$(dirname "$0")/.."
git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ bukan repo git"; exit 1; }

case "$BRANCH" in
  main|master) echo "❌ script ini gak pernah push ke $BRANCH — pakai nama branch lain"; exit 1 ;;
esac

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
  echo "✅ commit: $MSG"
fi

if [ -z "$TOKEN" ]; then
  echo "⚠️ token GitHub gak ada di env — commit aman di branch lokal '$BRANCH' (belum ke GitHub)"
  exit 0
fi

if PUSH_TOKEN="$TOKEN" timeout 150 git -c credential.helper='!f() { echo "username=x-access-token"; echo "password=$PUSH_TOKEN"; }; f' push -q -u origin "$BRANCH" 2>/dev/null; then
  REPO_URL="$(git remote get-url origin | sed -E 's#https://[^@/]*@#https://#; s#\.git$##')"
  echo "🟢 ter-push ke branch '$BRANCH'"
  echo "👉 $REPO_URL — muncul banner hijau \"Compare & pull request\""
  echo "   tombol hijau langsung: $REPO_URL/pull/new/$BRANCH"
  echo "ℹ️ merge ke main sesuai maumu — script ini gak pernah sentuh main."
else
  echo "⚠️ push gagal — commit tetap aman di branch lokal '$BRANCH'"
fi
