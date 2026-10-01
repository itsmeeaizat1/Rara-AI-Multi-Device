// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Pomodoro Timer
 * Fitur: Timer belajar Pomodoro — sekarang PERSIST (tahan restart),
 *        live ticker 🕒 edit-in-place tiap fase + scheduler otomatis
 *        ganti fokus⇄istirahat (engine: src/lib/rara-pomodoro.js)
 */
import { raraWrap, tipText } from "../../src/lib/rara-menu-style.js";
import {
  getSession, createSession, endSession,
  buildPhaseCard, firePhaseTicker, ensurePomodoroScheduler,
  phaseEndTs, phaseMs, recomputeIfMissed,
} from "../../src/lib/rara-pomodoro.js";

const pluginConfig = {
  name: "pomodoro",
  alias: ["pomodoro"],
  category: "education",
  description: "Timer belajar Pomodoro (25 menit fokus + 5 menit istirahat)",
  usage: ".pomodoro <command>",
  example: ".pomodoro start\n.pomodoro status\n.pomodoro stop",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const DEFAULT_FOCUS = 25; // menit
const DEFAULT_BREAK = 5;  // menit

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;

  // .pomodoro start [focus_min] [break_min]
  if (sub === "start" || sub === "mulai") {
    if (getSession(sender)) {
      return m.reply( raraWrap("Pomodoro", [
        "Sesi sedang berjalan!",
        `Ketik ${prefix}pomodoro status untuk cek`,
        `Ketik ${prefix}pomodoro stop untuk berhenti`,
      ].join("\n")), { commandName: "pomodoro" });
    }

    let focusMin = parseInt(args[1]) || DEFAULT_FOCUS;
    let breakMin = parseInt(args[2]) || DEFAULT_BREAK;
    if (focusMin < 1 || focusMin > 120) focusMin = DEFAULT_FOCUS;
    if (breakMin < 1 || breakMin > 60) breakMin = DEFAULT_BREAK;

    const session = createSession({
      sender,
      chat: m.chat,
      focusMs: focusMin * 60 * 1000,
      breakMs: breakMin * 60 * 1000,
    });

    // scheduler pusat nyala (sumber kebenaran ganti fase)
    ensurePomodoroScheduler(sock);

    // kartu mulai + live ticker 🕒 sampai fokus selesai
    await m.reply( raraWrap("Pomodoro — Mulai", [
      "🍅 *SESI FOKUS DIMULAI!*",
      "",
      `⏱ Fokus: *${focusMin} menit*`,
      `☕ Istirahat: *${breakMin} menit* (otomatis setelah fokus)`,
      "",
      "_Waktu berjalan di kartu di bawah ini_ 👇",
    ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pomodoro stop untuk berhenti`), { commandName: "pomodoro" });
    firePhaseTicker(sock, session, prefix);
    return;
  }

  // .pomodoro status
  if (sub === "status" || sub === "cek") {
    let s = getSession(sender);
    if (!s) {
      return m.reply( raraWrap("Pomodoro", [
        "Belum ada sesi aktif.",
        `Ketik ${prefix}pomodoro start untuk mulai`,
      ].join("\n")), { commandName: "pomodoro" });
    }
    // fase kelewat pas bot sibuk/idle → fast-forward dulu biar akurat
    recomputeIfMissed(s);
    await m.reply(buildPhaseCard(s, prefix), { commandName: "pomodoro" });
    // ticker live cuma kalau fase ini belum punya ticker aktif
    if (!s.tickerFired) firePhaseTicker(sock, s, prefix);
    return;
  }

  // .pomodoro stop
  if (sub === "stop" || sub === "berhenti") {
    const s = getSession(sender);
    if (!s) {
      return m.reply( raraWrap("Pomodoro", [
        "Tidak ada sesi aktif.",
      ].join("\n")), { commandName: "pomodoro" });
    }
    const res = endSession(sender); // ticker fase lama otomatis kebatalin (isCancelled)
    return m.reply( raraWrap("Pomodoro — Selesai", [
      "⏹ *Sesi dihentikan.*",
      "",
      `🔁 Cycle: ${res.cycles}x`,
      `⏱ Total fokus: ${formatTime(res.totalFocusMs)}`,
      "",
      "Kerja bagus! 🎉",
    ].join("\n")), { commandName: "pomodoro" });
  }

  // Default: help
  const txt = raraWrap("Pomodoro Timer", [
    `Timer belajar Pomodoro: fokus ${DEFAULT_FOCUS} menit + istirahat ${DEFAULT_BREAK} menit`,
    "",
    `Perintah:`,
    `1. ${prefix}pomodoro start - Mulai sesi (default 25/5)`,
    `2. ${prefix}pomodoro start 30 10 - Custom (30 fokus, 10 istirahat)`,
    `3. ${prefix}pomodoro status - Cek sisa waktu (live 🕒)`,
    `4. ${prefix}pomodoro stop - Berhenti`,
    "",
    "_Tahan restart: sesi tersimpan di database_ ✨",
  ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pomodoro start untuk mulai`);
  return m.reply( txt, { commandName: "pomodoro" });
}

export { pluginConfig as config, handler };
