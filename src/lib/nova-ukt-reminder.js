// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// PENGINGAT UKT/SPP ENGINE (13 Sep 2026, batch 4 variasi polos)
// Audit: fitur MATI TOTAL — db.setSetting BUKAN API (db.setting(key,value))
// → crash pas pertama dipakai; checker interval cuma nyala kalau ada
// yang ngetik .pengingatukt (restart = reminder gak jalan); kartu cek
// statis. Sekarang: engine persist + checker nyala dari startup +
// countdown live 🕒 H-2 hari ke deadline + reminder H-7/3/1/0
// masing-masing bisa kick ticker H-1/H-0.
// ═══════════════════════════════════════════════════════════════════
import { novaWrap } from "./nova-menu-style.js";
import { getDatabase } from "./nova-database.js";
import { runLiveTicker, formatRemaining } from "./nova-countdown.js";

function getStore(db) {
  if (!db.setting("uktReminders")) db.setting("uktReminders", {}); // db.setting(key, value) — BUKAN setSetting
  return db.setting("uktReminders");
}
function saveStore(db) {
  db.save();
}

export function getRecord(sender, db) {
  return getStore(db || getDatabase())[sender] || null;
}

export function setRecord(db, sender, record) {
  getStore(db)[sender] = record;
  saveStore(db);
}

export function deleteRecord(db, sender) {
  const store = getStore(db);
  if (store[sender]) {
    delete store[sender];
    saveStore(db);
    return true;
  }
  return false;
}

export function deadlineEodTs(record) {
  const d = new Date(record.deadline);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function remainingMs(record) {
  return deadlineEodTs(record) - Date.now();
}

export function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatRupiah(n) {
  if (!n) return "Tidak diset";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

// ═══════════════════════════════════════════════════════════════════
// LIVE TICKER H-2 HARI (≤48 jam ke deadline) — kartu 🕒 edit-in-place
// sampai akhir hari deadline. Guard per sender anti stack.
// ═══════════════════════════════════════════════════════════════════
function buildTickCard(record, remMs) {
  return novaWrap("Pengingat UKT", [
    "💰 *BAYAR UKT/SPP!*",
    "",
    `📅 Deadline: ${formatDate(record.deadline)}`,
    `💵 Jumlah: ${formatRupiah(record.amount)}`,
    `📚 ${record.semester || "Semester ini"}`,
    "",
    `🕒 Sisa: *${formatRemaining(remMs)}*`,
    "",
    "_jangan sampai telat ya_ ✨",
  ].join("\n"));
}

function buildFinalCard(record) {
  return novaWrap("Pengingat UKT", [
    "⌛ *DEADLINE UKT TIBA!*",
    "",
    `📅 Deadline: ${formatDate(record.deadline)}`,
    `💵 Jumlah: ${formatRupiah(record.amount)}`,
    "",
    "_hari terakhir — buruan bayar sekarang!_",
  ].join("\n"));
}

function buildCancelledCard() {
  return novaWrap("Pengingat UKT", [
    "✅ *COUNTDOWN DIBATALKAN*",
    "",
    "_pengingat udah dihapus/diganti — countdown mati sendiri_ ✨",
  ].join("\n"));
}

/** Watch: record masih ada & belum diganti? (isCancelled ticker) */
function makeWatch(sender, setAt) {
  return () => {
    try {
      const cur = getRecord(sender);
      return !cur || cur.setAt !== setAt; // dihapus/di-set ulang → batal
    } catch {
      return true;
    }
  };
}

export function fireUktTicker(sock, sender, record) {
  const g = (global.__uktTickers = global.__uktTickers || {});
  if (g[sender]) return; // ticker user ini lagi jalan
  const rem = remainingMs(record);
  if (rem <= 0 || rem > 48 * 3600000) return; // cuma H-2 hari ke bawah
  g[sender] = true;
  const watch = makeWatch(sender, record.setAt);
  runLiveTicker({
    sock,
    chat: sender, // pengingat UKT = urusan pribadi → DM user
    m: null,
    initialCard: buildTickCard(record, rem),
    tickCard: (st) => buildTickCard(record, st.remainingMs),
    finalCard: () => (watch() ? buildCancelledCard() : buildFinalCard(record)),
    mode: "down",
    targetTs: deadlineEodTs(record),
    maxEdits: 40,
    isCancelled: watch,
  }).finally(() => { delete g[sender]; });
}

// ═══════════════════════════════════════════════════════════════════
// CHECKER — reminder H-7, H-3, H-1, H-0 (dedup per hari via record.reminded)
// + auto-delete record lewat 30 hari. H-1/H-0 reminder sekalian nyalain
// countdown live. Nyala dari startup connection.js (gak nunggu command).
// ═══════════════════════════════════════════════════════════════════
export async function checkUktOnce(sock) {
  const db = getDatabase();
  const store = getStore(db);
  let changed = false;

  for (const [sender, record] of Object.entries(store)) {
    if (!record || !record.deadline) continue;
    const daysLeft = daysUntil(new Date(record.deadline));

    const reminderDays = [7, 3, 1, 0];
    if (reminderDays.includes(daysLeft) && !record.reminded?.includes(daysLeft)) {
      let urgency = "";
      if (daysLeft === 0) urgency = "🔴 HARI INI - BAYAR SEKARANG!";
      else if (daysLeft === 1) urgency = "🟠 BESOK - siapkan pembayaran!";
      else if (daysLeft === 3) urgency = "🟡 3 hari lagi";
      else urgency = "🟢 7 hari lagi";

      const msg = novaWrap("Pengingat UKT/SPP", [
        `📅 Deadline: ${formatDate(new Date(record.deadline))}`,
        `💵 Jumlah: ${formatRupiah(record.amount)}`,
        `Status: ${urgency}`,
        ``,
        `Jangan lupa bayar tepat waktu ya!`,
      ].join("\n"));

      try {
        await sock.sendMessage(sender, { text: msg });
        // H-1 & H-0 → countdown live ikut nyala
        if (daysLeft <= 1) fireUktTicker(sock, sender, record);
      } catch (e) {
        console.error("[pengingatukt] send reminder:", e.message);
      }

      if (!record.reminded) record.reminded = [];
      record.reminded.push(daysLeft);
      changed = true;
    }

    if (daysLeft < -30) {
      delete store[sender];
      changed = true;
    }
  }

  if (changed) saveStore(db);
}

let checkerTimer = null;
export function startUktChecker(sock) {
  if (checkerTimer) return;
  checkerTimer = setInterval(() => {
    checkUktOnce(sock).catch(() => {});
  }, 60 * 60 * 1000);
  checkUktOnce(sock).catch(() => {}); // cek langsung pas startup
}

/** Dipanggil connection.js startup: checker nyala + ticker record ≤48 jam re-arm. */
export function restoreUkt(sock) {
  try {
    startUktChecker(sock);
    const store = getStore(getDatabase());
    for (const [sender, record] of Object.entries(store)) {
      const rem = remainingMs(record);
      if (rem > 0 && rem <= 48 * 3600000 && !global.__uktTickers?.[sender]) {
        fireUktTicker(sock, sender, record);
      }
    }
  } catch (e) {
    console.error("[pengingatukt] restore gagal:", e.message);
  }
}

/** seam test */
export function _resetUktForTest() {
  if (checkerTimer) clearInterval(checkerTimer);
  checkerTimer = null;
  global.__uktTickers = {};
}
