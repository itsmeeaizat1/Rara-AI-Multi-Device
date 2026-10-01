// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { persistReminders, armReminder } from "../../src/lib/rara-reminder-engine.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: "reminder",
  alias: ["reminder", "remind"],
  category: "tools",
  description: "Reminder pribadi - bot nge-tag kamu pas waktunya tiba",
  usage: ".remind <durasi> <pesan>",
  example: ".remind 30m beli pulsa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// === In-memory reminder store ===
// Structure: global.raraReminders = [{ id, jid, sender, message, fireAt, timerId }]
if (!global.raraReminders) global.raraReminders = [];
if (!global.raraReminderLog) global.raraReminderLog = {}; // { sender: [timestamp, timestamp, ...] }
let reminderCounter = 0;

// Anti-spam: max 3 creations per 60 seconds per user
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(sender) {
  if (!global.raraReminderLog[sender]) global.raraReminderLog[sender] = [];
  const now = Date.now();
  // Filter to only entries within the window
  global.raraReminderLog[sender] = global.raraReminderLog[sender].filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (global.raraReminderLog[sender].length >= RATE_LIMIT_MAX) {
    const oldest = global.raraReminderLog[sender][0];
    const waitSec = Math.ceil((RATE_LIMIT_WINDOW - (now - oldest)) / 1000);
    return { allowed: false, waitSec };
  }
  global.raraReminderLog[sender].push(now);
  return { allowed: true };
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const ms = num * multipliers[unit];
  if (ms < 5000) return null; // min 5 detik
  if (ms > 604800000) return null; // max 7 hari
  return ms;
}

function formatDuration(ms) {
  if (ms < 60000) return `${Math.floor(ms / 1000)} detik`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} menit`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} jam ${Math.floor((ms % 3600000) / 60000)} menit`;
  return `${Math.floor(ms / 86400000)} hari ${Math.floor((ms % 86400000) / 3600000)} jam`;
}

function formatTimeLeft(fireAt) {
  const remaining = fireAt - Date.now();
  if (remaining <= 0) return "sekarang";
  return formatDuration(remaining);
}

function generateReminderId() {
  reminderCounter++;
  return `R${Date.now().toString(36).toUpperCase().slice(-4)}${reminderCounter}`;
}

async function handler(m, { sock }) {
  const text = m.text || "";
  const chatId = m.chat;
  const sender = m.sender;

  const args = text.trim().split(/\s+/);
  const subCmd = (args[0] || "").toLowerCase();

  // === HELP ===
  if (!text || subCmd === "help" || subCmd === "bantuan") {
    return m.reply( raraWrap("Reminder", [
      "Sistem pengingat pribadi - bot nge-tag kamu pas waktunya tiba",
      "",
      "Perintah tersedia:",
      "",
      ".remind <durasi> <pesan>",
      "Buat reminder baru",
      "",
      ".remind list",
      "Lihat daftar reminder aktif kamu",
      "",
      ".remind cancel <id>",
      "Batalkan reminder berdasarkan ID",
      "",
      ".remind cancel all",
      "Batalkan semua reminder kamu",
      "",
      "Format durasi:",
      "s = detik, m = menit, h = jam, d = hari, w = minggu",
      "Min 5 detik, Max 7 hari",
      "",
      "Contoh:",
      ".remind 30m beli pulsa",
      ".remind 2h kirim laporan",
      ".remind 1d ulang tahun teman",
      ".remind 10s cek air mendidih",
    ]), { commandName: "reminder" });
  }

  // === LIST ===
  if (subCmd === "list" || subCmd === "daftar") {
    const myReminders = global.raraReminders.filter((r) => r.sender === sender && !r.fired);

    if (myReminders.length === 0) {
      return m.reply(raraWrap("Reminder", "Kamu gak punya reminder aktif!\n\nKetik .remind help untuk buat reminder", "info"));
    }

    const lines = myReminders.map((r, i) => {
      const timeLeft = formatTimeLeft(r.fireAt);
      return `${i + 1}. ID: ${r.id}\n   Pesan: ${r.message}\n   Berbunyi: ${timeLeft} lagi`;
    });

    return m.reply(raraWrap(`Reminder Aktif (${myReminders.length})`, lines));
  }

  // === CANCEL ===
  if (subCmd === "cancel" || subCmd === "batal" || subCmd === "hapus") {
    const target = (args[1] || "").toLowerCase().trim();

    if (target === "all") {
      const before = global.raraReminders.length;
      const myReminders = global.raraReminders.filter((r) => r.sender === sender && !r.fired);
      myReminders.forEach((r) => {
        if (r.timerId) clearTimeout(r.timerId);
        r.fired = true;
      });
      persistReminders(); // simpen ke db — anti hilang pas restart
      const cancelled = myReminders.length;
      if (cancelled === 0) {
        return m.reply(raraWrap("Reminder", "Gak ada reminder aktif untuk dibatalkan!", "warn"));
      }
      return m.reply(raraWrap("Reminder", `Berhasil batalkan ${cancelled} reminder!`, "success"));
    }

    if (!target) {
      return m.reply(raraWrap("Reminder", "Format: .remind cancel <id> atau .remind cancel all", "error"));
    }

    const reminder = global.raraReminders.find((r) => r.id === target && r.sender === sender && !r.fired);
    if (!reminder) {
      return m.reply(raraWrap("Reminder", `Reminder ${target} tidak ditemukan atau sudah berbunyi!`, "error"));
    }

    if (reminder.timerId) clearTimeout(reminder.timerId);
    reminder.fired = true;

    persistReminders(); // simpen ke db — anti hilang pas restart
    return m.reply(raraWrap("Reminder", [
      `Reminder ${target} dibatalkan!`,
      `Pesan: ${reminder.message}`,
    ], "success"));
  }

  // === CREATE ===
  // Parse duration from first arg
  const durStr = args[0];
  const durationMs = parseDuration(durStr);

  if (!durationMs) {
    return m.reply(raraWrap("Reminder", [
      "Format durasi salah!",
      "",
      "Gunakan: .remind <durasi> <pesan>",
      "Durasi: s/m/h/d/w (min 5s, max 7d)",
      "",
      "Contoh: .remind 30m beli pulsa",
      "Contoh: .remind 2h kirim laporan",
    ], "error"));
  }

  // Get message (everything after duration)
  const message = text.slice(durStr.length).trim();

  if (!message) {
    return m.reply(raraWrap("Reminder", "Pesan reminder gak boleh kosong!\n\n💡 *Contoh:* .remind 30m beli pulsa", "error"));
  }

  if (message.length > 200) {
    return m.reply(raraWrap("Reminder", "Pesan terlalu panjang (max 200 karakter)", "error"));
  }

  // Max 10 active reminders per user
  const myActive = global.raraReminders.filter((r) => r.sender === sender && !r.fired);
  if (myActive.length >= 10) {
    return m.reply(raraWrap("Reminder", "Maksimal 10 reminder aktif per user!\n\nKetik .remind list untuk lihat, .remind cancel <id> untuk hapus", "warn"));
  }

  // Anti-spam rate limit
  const rateCheck = checkRateLimit(sender);
  if (!rateCheck.allowed) {
    return m.reply(raraWrap("Reminder", `Terlalu banyak reminder dibuat!\n\nTunggu ${rateCheck.waitSec} detik lagi sebelum buat reminder baru.`, "warn"));
  }

  const id = generateReminderId();
  const fireAt = Date.now() + durationMs;
  const timeStr = formatDuration(durationMs);
  const senderName = m.pushName || sender.split("@")[0];

  // Create reminder object
  const reminder = {
    id,
    jid: chatId,
    sender,
    senderName,
    message,
    fireAt,
    createdAt: Date.now(),
    fired: false,
    timerId: null,
  };

  // Schedule via engine — persist ke db biar tetep jalan walau bot restart
  global.raraReminders.push(reminder);
  armReminder(sock, reminder);
  persistReminders();

  // Clean up old fired reminders (keep last 50)
  if (global.raraReminders.length > 50) {
    global.raraReminders = global.raraReminders.filter((r) => !r.fired).slice(-30).concat(
      global.raraReminders.filter((r) => !r.fired).slice(0, 20)
    );
  }
  persistReminders();

  await m.react("🐣");
  // 🔹 LIVE COUNTDOWN (13 Sep, request owner "fitur lain yg masih biasa aja
  // kyk .afk g ada countdown"): kartu reminder sekarang LIVE — sisa waktu
  // nge-tick tiap detik di detik-detik akhir, adaptif kalau lama, sampai
  // waktunya berbunyi. Reminder ≤ 30 dtk full countdown tiap detik.
  const fireWib = new Date(Number(fireAt) + 7 * 3600 * 1000);
  const fp = (n) => String(n).padStart(2, "0");
  const fireStr = `${fp(fireWib.getUTCHours())}:${fp(fireWib.getUTCMinutes())} WIB`;
  const card = (remainingMs, live = true) => raraWrap("Reminder Dibuat", [
    `ID: ${id}`,
    `Pesan: ${message}`,
    `Berbunyi dalam: ${formatRemaining(remainingMs)}${live ? " 🕒" : ""}`,
    `Pukul: ${fireStr}`,
    `Tag: @${sender.split("@")[0]}`,
    "",
    `.remind list untuk lihat daftar`,
    `.remind cancel ${id} untuk batalkan`,
  ], "success");
  return runLiveTicker({
    sock, chat: chatId, m,
    mode: "down", targetTs: Number(fireAt), maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 24,
    initialCard: card(fireAt - Date.now()),
    tickCard: (st) => card(st.remainingMs, st.remainingMs > 0),
    finalCard: (st) => card(st.remainingMs, false),
  }).then(() => { try { sock.sendMessage(chatId, { mentions: [sender] }); } catch {} });
}

export { pluginConfig as config, handler };
