// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-db-relocate.js — relokasi file DB runtime dari src/data/ ke
// src/database/<kategori>/ (request owner 26 Sep 2026: "smua db berfile
// json yg nyimpen data user/info fitur disimpan di src/database/kategori/
// filedbfitur" — konten statis seperti soal game TETAP di src/data/).
//
// Prinsip:
// 1. COPY (bukan move) — file lama dibiarkan di src/data/ biar rollback
//    ke kode lama tetap nemu datanya; file lama jadi mati (gak pernah
//    ditulis lagi) setelah semua penulis pindah path.
// 2. Copy-if-missing — idempotent: boot kedua tidak meng-copy ulang,
//    data baru di src/database SELALU menang.
// 3. Jalan otomatis di initDatabase() SEBELUM store lowdb dibaca, jadi
//    migrasi terjadi di boot pertama setelah deploy tanpa langkah manual.

import fs from "fs";
import path from "path";

// ─── file lowdb utama (src/data/main/* → per-kategori) ───
const MAIN_STORE_MAP = {
  "src/data/main/users.json": "src/database/user/users.json",
  "src/data/main/groups.json": "src/database/group/groups.json",
  "src/data/main/settings.json": "src/database/settings/settings.json",
  "src/data/main/stats.json": "src/database/stats/stats.json",
  "src/data/main/sewa.json": "src/database/sewa/sewa.json",
  "src/data/main/premium.json": "src/database/premium/premium.json",
  "src/data/main/owner.json": "src/database/owner/owner.json",
  "src/data/main/partner.json": "src/database/partner/partner.json",
};

// ─── folder DB legacy rara.json/ di root (request owner 26 Sep 2026:
// "folder rara.json yg di main ga dihapus, dipindahin aja ke src/database
// sesuai kategori masing2") — dir multi-store era sebelum relokasi
// (config.database.path "rara.json"); copy-if-missing, data di
// src/database SELALU menang, idempotent tiap boot.
const LEGACY_NOVA_DIR_MAP = {
  "rara.json/users.json": "src/database/user/users.json",
  "rara.json/groups.json": "src/database/group/groups.json",
  "rara.json/settings.json": "src/database/settings/settings.json",
  "rara.json/stats.json": "src/database/stats/stats.json",
  "rara.json/sewa.json": "src/database/sewa/sewa.json",
  "rara.json/premium.json": "src/database/premium/premium.json",
  "rara.json/owner.json": "src/database/owner/owner.json",
  "rara.json/partner.json": "src/database/partner/partner.json",
  "rara.json/chathistory.json": "src/database/chathistory/chathistory.json",
};

// ─── file DB per-fitur (kategori = domain fitur) ───
export const RELOCATE_FILES = {
  ...MAIN_STORE_MAP,
  ...LEGACY_NOVA_DIR_MAP,

  // kategori: auto/ — state semua fitur otomatis (notifier/watcher/scheduler)
  "src/data/autoanimenotifier.json": "src/database/auto/autoanimenotifier.json",
  "src/data/autoanime_winbu_sent.json": "src/database/auto/autoanime_winbu_sent.json",
  "src/data/autoanime_winbu_state.json": "src/database/auto/autoanime_winbu_state.json",
  "src/data/autoapihealth.json": "src/database/auto/autoapihealth.json",
  "src/data/autobackup.json": "src/database/auto/autobackup.json",
  "src/data/activity-tracker.json": "src/database/auto/activity-tracker.json",
  "src/data/autobackup_drive.json": "src/database/auto/autobackup_drive.json",
  "src/data/autobirthday.json": "src/database/auto/autobirthday.json",
  "src/data/autobolanotify.json": "src/database/auto/autobolanotify.json",
  "src/data/automovienotifier.json": "src/database/auto/automovienotifier.json",
  "src/data/autoreengage.json": "src/database/auto/autoreengage.json",
  "src/data/autorefill.json": "src/database/auto/autorefill.json",
  "src/data/autorenewal.json": "src/database/auto/autorenewal.json",
  "src/data/autoreport.json": "src/database/auto/autoreport.json",
  "src/data/autotranslate.json": "src/database/auto/autotranslate.json",
  "src/data/autocleancache.json": "src/database/auto/autocleancache.json",
  "src/data/bencana-state.json": "src/database/auto/bencana-state.json",
  "src/data/bootdoctor.json": "src/database/auto/bootdoctor.json",
  "src/data/cryptoalert.json": "src/database/auto/cryptoalert.json",
  "src/data/linkedinnotify.json": "src/database/auto/linkedinnotify.json",
  "src/data/webwatch.json": "src/database/auto/webwatch.json",
  "src/data/weekly-snapshots.json": "src/database/auto/weekly-snapshots.json",

  // kategori: ai/ — sesi & memori AI
  "src/data/ai-sessions.json": "src/database/ai/ai-sessions.json",
  "src/data/autoflow.json": "src/database/ai/autoflow.json",
  "src/data/autoflow-memory.json": "src/database/ai/autoflow-memory.json",

  // kategori: game/ — state game runtime
  "src/data/cooking.json": "src/database/game/cooking.json",
  "src/data/family100.state.json": "src/database/game/family100.state.json",
  "src/data/quiz-verify.json": "src/database/game/quiz-verify.json",
  "src/data/catur.json": "src/database/game/catur.json",
  "src/data/caturSkor.json": "src/database/game/caturSkor.json",

  // kategori: group/ — db fitur grup
  "src/data/absen.json": "src/database/group/absen.json",
  "src/data/agenda-db.json": "src/database/group/agenda-db.json",
  "src/data/autorole.json": "src/database/group/autorole.json",
  "src/data/cekfakta-db.json": "src/database/group/cekfakta-db.json",
  "src/data/checklink.json": "src/database/group/checklink.json",
  "src/data/donasi-db.json": "src/database/group/donasi-db.json",
  "src/data/patungan-db.json": "src/database/group/patungan-db.json",
  "src/data/tod-db.json": "src/database/group/tod-db.json",

  // kategori: panel/ — db panel & provider (topup/smm/pulsa)
  "src/data/digipulsa.json": "src/database/panel/digipulsa.json",
  "src/data/fmpulsa.json": "src/database/panel/fmpulsa.json",
  "src/data/nokos_beli.json": "src/database/panel/nokos_beli.json",
  "src/data/nokos_result.json": "src/database/panel/nokos_result.json",
  "src/data/nokos_smm.json": "src/database/panel/nokos_smm.json",
  "src/data/ppob.json": "src/database/panel/ppob.json",
  "src/data/ptero-panels.json": "src/database/panel/ptero-panels.json",
  "src/data/provsmm.json": "src/database/panel/provsmm.json",
  "src/data/undrsmm.json": "src/database/panel/undrsmm.json",

  // kategori: user/ — data per-user
  "src/data/chat_dna.json": "src/database/user/chat_dna.json",
  "src/data/moodtrack.json": "src/database/user/moodtrack.json",
  "src/data/totp.json": "src/database/user/totp.json",

  // kategori: owner/ — pengaturan owner
  "src/data/prefix.json": "src/database/owner/prefix.json",
  "src/data/stickerCommands.json": "src/database/owner/stickerCommands.json",

  // kategori: tools/ — sesi tool
  "src/data/am-v2-session.json": "src/database/tools/am-v2-session.json",

  // kategori: system/ — cache/infra bot
  "src/data/lid-cache.json": "src/database/system/lid-cache.json",

  // legacy single-file (pre-lowdb) — disimpan sebagai arsip
  "src/data/db.json": "src/database/main/db.json",
  "src/data/main/db.json": "src/database/main/db.json",
};

// ─── folder DB yang di-copy utuh (json banyak file dalam subdir) ───
export const RELOCATE_DIRS = {
  "src/data/premium-db": "src/database/premium-db", // {premium,owner,partner}.json (rara-premium-db)
  "src/data/cpanel": "src/database/panel/cpanel",
  "src/data/digitalocean": "src/database/panel/digitalocean",
  "src/data/linode": "src/database/panel/linode",
};

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
}

/**
 * Copy semua file DB lama → lokasi baru (copy-if-missing, idempotent).
 * Dipanggil otomatis di initDatabase(). Return jumlah file/folder yang dimigrasi.
 */
export function relocateDatabaseFiles(root = process.cwd()) {
  let migrated = 0;
  try {
    for (const [fromRel, toRel] of Object.entries(RELOCATE_FILES)) {
      const from = path.join(root, fromRel);
      const to = path.join(root, toRel);
      if (!fs.existsSync(from) || fs.existsSync(to)) continue;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      migrated++;
    }
    for (const [fromRel, toRel] of Object.entries(RELOCATE_DIRS)) {
      const from = path.join(root, fromRel);
      const to = path.join(root, toRel);
      if (!fs.existsSync(from) || fs.existsSync(to)) continue;
      copyDirRecursive(from, to);
      migrated++;
    }
  } catch {}
  return migrated;
}
