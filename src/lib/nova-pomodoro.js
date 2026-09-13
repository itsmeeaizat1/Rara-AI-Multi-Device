// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// POMODORO ENGINE (13 Sep 2026, variasi fitur polos batch 4)
// ".pomodoro fitur TIMER tapi gak ada timer hidup + session di RAM
//  hilang pas restart" — sekarang: (1) session persist ke database
// (tahan restart, kayak nova-alarm/nova-reminder-engine), (2) scheduler
// pusat tiap 30 dtk jadi sumber kebenaran pergantian fase, (3) live
// ticker 🕒 edit-in-place per fase (start/status/otomatis pas ganti fase).
// ═══════════════════════════════════════════════════════════════════
import { claraWrap } from "./nova-menu-style.js";
import { runLiveTicker, formatRemaining } from "./nova-countdown.js";
import { persistLoad, persistSave } from "./nova-ram-persist.js";

const STORE_KEY = "pomodoroSessions";

/** Store session pomodoro (persist). */
function store() {
  if (!global.pomodoroSessions) global.pomodoroSessions = {};
  return global.pomodoroSessions;
}

export function getSession(sender) {
  persistLoad(STORE_KEY);
  return store()[sender] || null;
}

function save() {
  persistSave(STORE_KEY);
}

export function createSession({ sender, chat, focusMs, breakMs }) {
  persistLoad(STORE_KEY);
  const s = {
    sender,
    chat,
    phase: "focus",
    phaseStart: Date.now(),
    focusMs,
    breakMs,
    cycles: 0,
    totalFocusMs: 0,
    createdAt: Date.now(),
    tickerFired: false,
  };
  store()[sender] = s;
  save();
  return s;
}

/** Selesaiin sesi manual — return total fokus (termasuk fokus berjalan). */
export function endSession(sender) {
  const s = store()[sender];
  if (!s) return null;
  let totalFocus = s.totalFocusMs;
  if (s.phase === "focus") {
    totalFocus += Math.min(s.focusMs, Date.now() - s.phaseStart);
  }
  delete store()[sender];
  save();
  return { cycles: s.cycles, totalFocusMs: totalFocus };
}

export function phaseMs(s) {
  return s.phase === "focus" ? s.focusMs : s.breakMs;
}

export function phaseEndTs(s) {
  return s.phaseStart + phaseMs(s);
}

/** Ganti fase (focus→break / break→focus), persist, return s.
 * atTs = epoch mulai fase baru (default sekarang) — pas fast-forward
 * dilewat timeline lama biar jumlah fase kelewat kehitung bener. */
export function advancePhase(s, atTs = Date.now()) {
  if (s.phase === "focus") {
    s.totalFocusMs += s.focusMs;
    s.cycles++;
    s.phase = "break";
  } else {
    s.phase = "focus";
  }
  s.phaseStart = atTs;
  s.tickerFired = false;
  save();
  return s;
}

/**
 * Fast-forward fase yang kelewat pas bot mati / scheduler idle.
 * @returns {number} berapa pergantian fase yang dilewati
 */
export function recomputeIfMissed(s) {
  let missed = 0;
  while (Date.now() >= phaseEndTs(s) && missed < 100) {
    // fase yang kelewat dihitung utuh (fokus selesai = 1 cycle)
    // phaseStart fase baru = titik akhir fase lama (timeline preserve)
    advancePhase(s, phaseEndTs(s));
    missed++;
  }
  return missed;
}

/** Kartu fase sekarang (statis — dipakai status & transisi). */
export function buildPhaseCard(s, prefix = ".") {
  const isFocus = s.phase === "focus";
  const label = isFocus ? "🍅 FOKUS" : "☕ ISTIRAHAT";
  const lines = [
    `${label} berjalan`,
    "",
    `🕒 Sisa: *${formatRemaining(Math.max(0, phaseEndTs(s) - Date.now()))}*`,
    `🔁 Cycle selesai: ${s.cycles}x`,
    `⏱ Total fokus: ${formatTime(s.totalFocusMs)}`,
    "",
    `Ketik *${prefix}pomodoro stop* untuk berhenti`,
  ];
  return claraWrap("Pomodoro", lines.join("\n"));
}

/** Kartu tick live (edit-in-place tiap detik/menit). */
export function buildTickCard(s) {
  const remaining = Math.max(0, phaseEndTs(s) - Date.now());
  if (s.phase === "focus") {
    return claraWrap("Pomodoro — Fokus", [
      "🍅 *SESI FOKUS*",
      "",
      `🕒 Sisa: *${formatRemaining(remaining)}*`,
      `🔁 Cycle: ${s.cycles}x`,
      "",
      "_tahan fokusnya, hampir sampai_ ✨",
    ].join("\n"));
  }
  return claraWrap("Pomodoro — Istirahat", [
    "☕ *WAKTU ISTIRAHAT*",
    "",
    `🕒 Sisa: *${formatRemaining(remaining)}*`,
    `🔁 Cycle selesai: ${s.cycles}x`,
    "",
    "_anjing-in dulu, tar fokus lagi_ ✨",
  ].join("\n"));
}

/** Kartu transisi fase (dikirim scheduler pas fase ganti). */
export function buildTransitionCard(s) {
  if (s.phase === "break") {
    return claraWrap("Fokus Selesai", [
      "✅ *SESI FOKUS SELESAI!*",
      "",
      `🔁 Cycle: ${s.cycles}x`,
      `⏱ Total fokus: ${formatTime(s.totalFocusMs)}`,
      "",
      `☕ Sekarang *istirahat ${formatTime(s.breakMs)}*`,
      "",
      "_ Santai dulu, bot bakal manggil pas udah waktunya_ ✨",
    ].join("\n"));
  }
  return claraWrap("Istirahat Selesai", [
    "🔄 *ISTIRAHAT SELESAI!*",
    "",
    `🍅 Mulai *fokus lagi ${formatTime(s.focusMs)}*`,
    `🔁 Cycle selesai: ${s.cycles}x`,
    "",
    `Ketik *.pomodoro stop* untuk berhenti`,
    "",
    "_ Gas, semangat!_ ✨",
  ].join("\n"));
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Live ticker satu fase — berhenti sendiri kalau sesi di-stop /
 * fase berganti (phaseStart beda). Kuota edit dihitung dari durasi fase.
 */
export function firePhaseTicker(sock, s, prefix = ".") {
  const phaseStart = s.phaseStart;
  const phaseDur = phaseMs(s);
  const maxEdits = Math.min(80, 12 + Math.ceil(phaseDur / 60000));
  s.tickerFired = true;
  save();
  runLiveTicker({
    sock,
    chat: s.chat,
    m: null,
    initialCard: buildTickCard(s),
    tickCard: (st) => {
      const cur = store()[s.sender];
      if (!cur || cur.phaseStart !== phaseStart) return buildTickCard(cur || s); // dibatalkan → render kondisi sekarang sekali, loop bakal break di cek bawah
      return buildTickCard(cur);
    },
    mode: "down",
    targetTs: s.phaseStart + phaseDur,
    maxEdits,
    isCancelled: () => {
      const cur = store()[s.sender];
      return !cur || cur.phaseStart !== phaseStart;
    },
  }).catch(() => {});
}

/** Scheduler pusat tiap 30 dtk — sumber kebenaran pergantian fase. */
export function ensurePomodoroScheduler(sock) {
  if (global.__pomodoroSched) return;
  global.__pomodoroSched = setInterval(async () => {
    try {
      persistLoad(STORE_KEY);
      const all = Object.values(store());
      for (const s of all) {
        if (Date.now() < phaseEndTs(s)) continue;
        // kelewat > 1 fase (scheduler idle) → fast-forward
        recomputeIfMissed(s);
        await sock
          .sendMessage(s.chat, { text: buildTransitionCard(s) })
          .catch(() => {});
        firePhaseTicker(sock, s);
      }
    } catch {}
  }, 30 * 1000);
}

/**
 * Dipanggil pas startup (connection.js) — re-arm semua sesi persist:
 * fase yang kelewat pas bot mati di-fast-forward + kartu kabar, lalu
 * scheduler & ticker nyala lagi. Tahan restart total.
 */
export function restorePomodoro(sock) {
  try {
    persistLoad(STORE_KEY);
    const all = Object.values(store());
    for (const s of all) {
      const missed = recomputeIfMissed(s);
      if (missed > 0) {
        sock
          .sendMessage(s.chat, {
            text: claraWrap("Pomodoro Lanjut", [
              "⚠️ Bot sempat mati/restart",
              "",
              `${missed} pergantian fase kelewat`,
              `Sekarang: *${s.phase === "focus" ? "🍅 Fokus" : "☕ Istirahat"}*`,
              "",
              `🕒 Sisa: *${formatRemaining(Math.max(0, phaseEndTs(s) - Date.now()))}*`,
              "",
              "_sesi lanjut otomatis — ketik *.pomodoro stop* buat berhenti_",
            ].join("\n")),
          })
          .catch(() => {});
      }
      firePhaseTicker(sock, s);
    }
    if (all.length > 0) ensurePomodoroScheduler(sock);
  } catch {}
}

/** seam test: bersihin scheduler & store */
export function _resetPomodoroForTest() {
  if (global.__pomodoroSched) clearInterval(global.__pomodoroSched);
  global.__pomodoroSched = null;
  global.pomodoroSessions = {};
}
