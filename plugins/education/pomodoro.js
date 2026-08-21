// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pomodoro",
  alias: ["pomodoro", "studytime", "timerbelajar", "fokus"],
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

// In-memory store: sender -> session
const sessions = new Map();

const DEFAULT_FOCUS = 25; // menit
const DEFAULT_BREAK = 5;  // menit

function getSession(sender) {
  return sessions.get(sender) || null;
}

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
      return sendReplyWithNav(m, sock, claraWrap("Pomodoro", [
        "Sesi sedang berjalan!",
        `Ketik ${prefix}pomodoro status untuk cek`,
        `Ketik ${prefix}pomodoro stop untuk berhenti`,
      ].join("\n")), { commandName: "pomodoro" });
    }

    let focusMin = parseInt(args[1]) || DEFAULT_FOCUS;
    let breakMin = parseInt(args[2]) || DEFAULT_BREAK;
    if (focusMin < 1 || focusMin > 120) focusMin = DEFAULT_FOCUS;
    if (breakMin < 1 || breakMin > 60) breakMin = DEFAULT_BREAK;

    const session = {
      sender,
      startTime: Date.now(),
      focusMs: focusMin * 60 * 1000,
      breakMs: breakMin * 60 * 1000,
      phase: "focus",
      cycles: 0,
      totalFocusMs: 0,
    };
    sessions.set(sender, session);

    // Schedule focus end
    setTimeout(async () => {
      const s = getSession(sender);
      if (!s || s.phase !== "focus") return;
      s.phase = "break";
      s.totalFocusMs += s.focusMs;
      s.cycles++;
      await sock.sendMessage(m.key?.remoteJid || sender, {
        text: claraWrap("Pomodoro - Istirahat", [
          `Sesi fokus selesai! (${formatTime(s.focusMs)})`,
          `Cycle: ${s.cycles}x`,
          `Sekarang istirahat ${formatTime(s.breakMs)}`,
          `Total fokus hari ini: ${formatTime(s.totalFocusMs)}`,
        ].join("\n")),
      }).catch((e) => { console.error('[pomodoro.js]:', e.message); });

      // Schedule break end
      setTimeout(async () => {
        const s2 = getSession(sender);
        if (!s2 || s2.phase !== "break") return;
        s2.phase = "focus";
        s2.startTime = Date.now();
        await sock.sendMessage(m.key?.remoteJid || sender, {
          text: claraWrap("Pomodoro - Fokus", [
            `Istirahat selesai!`,
            `Mulai sesi fokus lagi (${formatTime(s2.focusMs)})`,
            `Cycle: ${s2.cycles}x selesai`,
            `Ketik ${prefix}pomodoro stop untuk berhenti`,
          ].join("\n")),
        }).catch((e) => { console.error('[pomodoro.js]:', e.message); });
      }, breakMin * 60 * 1000);
    }, focusMin * 60 * 1000);

    return sendReplyWithNav(m, sock, claraWrap("Pomodoro - Fokus", [
      `Sesi dimulai!`,
      `Fokus: ${focusMin} menit`,
      `Istirahat: ${breakMin} menit`,
      `Phase: Fokus`,
      ``,
      `Bot akan kirim pengingat saat waktu habis.`,
    ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pomodoro stop untuk berhenti`), { commandName: "pomodoro" });
  }

  // .pomodoro status
  if (sub === "status" || sub === "cek") {
    const s = getSession(sender);
    if (!s) {
      return sendReplyWithNav(m, sock, claraWrap("Pomodoro", [
        `Belum ada sesi aktif.`,
        `Ketik ${prefix}pomodoro start untuk mulai`,
      ].join("\n")), { commandName: "pomodoro" });
    }
    const elapsed = Date.now() - s.startTime;
    const total = s.phase === "focus" ? s.focusMs : s.breakMs;
    const remaining = Math.max(0, total - elapsed);
    return sendReplyWithNav(m, sock, claraWrap("Pomodoro - Status", [
      `Phase: ${s.phase === "focus" ? "Fokus" : "Istirahat"}`,
      `Sisa waktu: ${formatTime(remaining)}`,
      `Cycle selesai: ${s.cycles}x`,
      `Total fokus: ${formatTime(s.totalFocusMs)}`,
    ].join("\n")), { commandName: "pomodoro" });
  }

  // .pomodoro stop
  if (sub === "stop" || sub === "berhenti") {
    const s = getSession(sender);
    if (!s) {
      return sendReplyWithNav(m, sock, claraWrap("Pomodoro", [
        `Tidak ada sesi aktif.`,
      ].join("\n")), { commandName: "pomodoro" });
    }
    const totalFocus = s.totalFocusMs;
    if (s.phase === "focus") {
      const elapsed = Date.now() - s.startTime;
      totalFocus += elapsed;
    }
    sessions.delete(sender);
    return sendReplyWithNav(m, sock, claraWrap("Pomodoro - Selesai", [
      `Sesi dihentikan.`,
      `Cycle: ${s.cycles}x`,
      `Total fokus: ${formatTime(totalFocus)}`,
      `Kerja bagus!`,
    ].join("\n")), { commandName: "pomodoro" });
  }

  // Default: help
  const txt = claraWrap("Pomodoro Timer", [
    `Timer belajar Pomodoro: fokus ${DEFAULT_FOCUS} menit + istirahat ${DEFAULT_BREAK} menit`,
    ``,
    `Perintah:`,
    `1. ${prefix}pomodoro start - Mulai sesi (default 25/5)`,
    `2. ${prefix}pomodoro start 30 10 - Custom (30 fokus, 10 istirahat)`,
    `3. ${prefix}pomodoro status - Cek sisa waktu`,
    `4. ${prefix}pomodoro stop - Berhenti`,
  ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pomodoro start untuk mulai`);
  return sendReplyWithNav(m, sock, txt, { commandName: "pomodoro" });
}

export { pluginConfig as config, handler };
