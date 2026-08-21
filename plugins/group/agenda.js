// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "data", "agenda-db.json");

// ─── Database ───
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) { console.error('[agenda.js]:', e.message); }
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("[AGENDA] Failed to save DB:", e.message);
  }
}

function isAgendaOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.enabled === true;
}

function toggleOn(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = true;
  saveDB(db);
}

function toggleOff(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = false;
  saveDB(db);
}

function getEvents(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.events || [];
}

function getActiveEvents(groupId) {
  return getEvents(groupId).filter(e => e.status === "active" && e.eventTime > Date.now());
}

function addEvent(groupId, event) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  if (!db.groups[groupId].events) db.groups[groupId].events = [];
  db.groups[groupId].events.push(event);
  saveDB(db);
}

function updateEvent(groupId, eventId, updater) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].events) return null;
  const event = db.groups[groupId].events.find(e => e.id === eventId);
  if (!event) return null;
  updater(event);
  saveDB(db);
  return event;
}

function findEvent(groupId, eventId) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].events) return null;
  return db.groups[groupId].events.find(e => e.id === eventId || e.shortId === eventId);
}

function deleteEvent(groupId, eventId) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].events) return false;
  const idx = db.groups[groupId].events.findIndex(e => e.id === eventId || e.shortId === eventId);
  if (idx === -1) return false;
  db.groups[groupId].events.splice(idx, 1);
  saveDB(db);
  return true;
}

// ─── Helpers ───
function genId() {
  return "AGD" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function checkOwner(botConfig, m) {
  const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
  const sender = m.sender || m.key?.participant || "";
  if (!ownerJid) return false;
  const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
  const cleanSender = sender.replace(/[^0-9]/g, "");
  return cleanOwner === cleanSender;
}

// Parse Indonesian date/time strings
// Supports: "25 Aug 2026 20:00", "25/08/2026 20:00", "2026-08-25 20:00",
//           "25 Agustus 2026 20:00", "25-08-2026 20:00", "besok 20:00", "hari ini 18:00"
function parseDateTime(str) {
  if (!str) return null;
  const original = str;
  str = str.toLowerCase().trim();

  const now = new Date();

  // Relative keywords
  if (/^hari ini\b/.test(str) || /^today\b/.test(str)) {
    const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
    const h = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const m = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.getTime() > now.getTime() ? d.getTime() : null;
  }

  if (/^besok\b/.test(str) || /^tomorrow\b/.test(str)) {
    const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
    const h = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const m = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  if (/^lusa\b/.test(str)) {
    const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
    const h = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const m = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  // Replace Indonesian month names
  const monthMap = {
    "januari": "Jan", "februari": "Feb", "maret": "Mar", "april": "Apr",
    "mei": "May", "juni": "Jun", "juli": "Jul", "agustus": "Aug",
    "september": "Sep", "oktober": "Oct", "november": "Nov", "desember": "Dec",
  };
  for (const [id, en] of Object.entries(monthMap)) {
    str = str.replace(new RegExp(`\\b${id}\\b`, "gi"), en);
  }

  // Try multiple formats
  // Format: DD/MM/YYYY HH:mm or DD-MM-YYYY HH:mm
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if (match) {
    const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]), parseInt(match[4]), parseInt(match[5]), 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Format: DD MMM YYYY HH:mm (e.g., 25 Aug 2026 20:00)
  match = str.match(/(\d{1,2})\s+(\w{3,})\s+(\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if (match) {
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]} ${match[4]}:${match[5]}:00`);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Format: YYYY-MM-DD HH:mm
  match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2})[:.](\d{2})/);
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5]), 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Format: DD/MM/YYYY (no time, default 12:00)
  match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]), 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  return null;
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const dayName = days[d.getDay()];
  const day = d.getDate().toString().padStart(2, "0");
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${dayName}, ${day} ${monthName} ${year} ${h}:${m}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "Waktunya tiba!";
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (mins > 0) parts.push(`${mins} menit`);
  if (secs > 0 && days === 0 && hours === 0) parts.push(`${secs} detik`);
  return parts.length > 0 ? parts.join(" ") : "beberapa detik";
}

// H-X label
function hLabel(ms) {
  if (ms <= 0) return "H-NOW";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return "H-NOW";
  if (hours < 24) return `H-${Math.ceil(hours)}`;
  const days = Math.ceil(hours / 24);
  return `H-${days}`;
}

async function getGroupMembers(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    return metadata.participants.map(p => p.id);
  } catch (e) {
    return [];
  }
}

// ─── Background checker (CronJob every minute) ───
function startAgendaChecker() {
  new CronJob(
    "* * * * *",
    async () => {
      try {
        const { getSocket } = await import("../../src/connection.js");
        const sock = getSocket();
        if (!sock) return;

        const db = loadDB();
        const now = Date.now();

        for (const groupId of Object.keys(db.groups || {})) {
          if (!db.groups[groupId]?.events) continue;

          for (const event of db.groups[groupId].events) {
            if (event.status !== "active") continue;
            if (!event.eventTime) continue;

            const diff = event.eventTime - now;

            // ─── Reminder: H-1 hour ───
            if (!event.reminded1h && diff <= 3600000 && diff > 0) {
              const lines = [
                `╎ ⏰ PENGINGAT: 1 Jam Lagi!`,
                ``,
                `╎ Acara: *${event.name}*`,
                `╎ Waktu: ${formatDate(event.eventTime)}`,
                `╎ Sisa: *${formatCountdown(diff)}*`,
                ``,
                `╎ 📢 Bersiap-siap ya semuanya!`,
              ];

              try {
                await sock.sendMessage(groupId, {
                  text: claraWrap("Agenda - Pengingat", lines.join("\n")),
                });
              } catch (e) { console.error('[agenda.js]:', e.message); }

              updateEvent(groupId, event.id, (e) => { e.reminded1h = true; });
            }

            // ─── Reminder: H-1 day ───
            if (!event.reminded1d && diff <= 86400000 && diff > 3600000) {
              const lines = [
                `╎ ⏰ PENGINGAT: Besok!`,
                ``,
                `╎ Acara: *${event.name}*`,
                `╎ Waktu: ${formatDate(event.eventTime)}`,
                `╎ Sisa: *${formatCountdown(diff)}*`,
                ``,
                `╎ Jangan lupa ya!`,
              ];

              try {
                await sock.sendMessage(groupId, {
                  text: claraWrap("Agenda - Pengingat", lines.join("\n")),
                });
              } catch (e) { console.error('[agenda.js]:', e.message); }

              updateEvent(groupId, event.id, (e) => { e.reminded1d = true; });
            }

            // ─── Event time reached ───
            if (diff <= 0 && !event.notified) {
              const lines = [
                `╎ 🔔 WAKTUNYA TIBA!`,
                ``,
                `╎ Acara: *${event.name}*`,
                `╎ Waktu: ${formatDate(event.eventTime)}`,
                ``,
                `╎ 📢 Ayo semuanya! Jangan sampai ketinggalan!`,
              ];

              try {
                await sock.sendMessage(groupId, {
                  text: claraWrap("Agenda - Waktu Tiba", lines.join("\n")),
                });
              } catch (e) { console.error('[agenda.js]:', e.message); }

              updateEvent(groupId, event.id, (e) => {
                e.notified = true;
                e.status = "done";
                e.notifiedAt = now;
              });
            }
          }
        }
      } catch (e) {
        console.log("[AGENDA] Checker error:", e.message);
      }
    },
    null,
    true,
    "Asia/Jakarta"
  );
}

// ─── Plugin ───
export default {
  name: "agenda",
  alias: ["agenda", "countdown", "acara"],
  category: "group",
  desc: "Smart Agenda & Countdown Grup - Atur acara, hitung mundur otomatis, pengingat H-1 hari & H-1 jam",
  usage: ".agenda tambah | <nama> | <tanggal jam>\n.agenda list - Acara aktif\n.agenda status <id> - Lihat countdown\n.agenda hapus <id> - Hapus acara\n.agendaon / .agendaoff - Toggle (owner)\n.agendahistory - Riwayat",
  example: ".agenda tambah | Mabar Valorant | 25 Aug 2026 20:00\n.agenda tambah | Kopdar | besok 15:00\n.agenda tambah | Ulang tahun Budi | 25/08/2026 00:00",
  wait: "🕐",
  error: "❌",

  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const raw = m.text?.trim() || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];
    const isOwner = checkOwner(botConfig, m);

    // ─── Toggle ───
    if (new RegExp(`^${prefix}agendaon\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Agenda", [
          `╎ Status: *Akses Ditolak*`,
          ``,
          `╎ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOn(groupId);
      await m.reply(claraWrap("Agenda", [
        `╎ Status: *AKTIF* 🟢`,
        ``,
        `╎ Fitur Smart Agenda dinyalakan.`,
        `╎ Ketik *${prefix}agenda tambah | <nama> | <tanggal jam>*`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    if (new RegExp(`^${prefix}agendaoff\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Agenda", [
          `╎ Status: *Akses Ditolak*`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOff(groupId);
      await m.reply(claraWrap("Agenda", [
        `╎ Status: *NONAKTIF* 🔴`,
        ``,
        `╎ Fitur Agenda dimatikan.`,
        `╎ Ketik *${prefix}agendaon* untuk aktifkan lagi.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── History ───
    if (new RegExp(`^${prefix}agendahistory\\b`, "i").test(raw)) {
      const all = getEvents(groupId);
      if (all.length === 0) {
        await m.reply(claraWrap("Agenda - Riwayat", [
          `╎ Belum ada riwayat acara di grup ini.`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`╎ Total: *${all.length}* acara`, ``];
      all.slice(-10).reverse().forEach((e) => {
        const status = e.status === "active" ? "🟢" : e.status === "done" ? "✅" : "🔴";
        lines.push(
          `╎ ${status} ${e.shortId} - ${e.name}`,
          `╎    ${formatDate(e.eventTime)}`,
          `╎    ${e.status === "done" ? "Selesai" : formatCountdown(e.eventTime - Date.now())}`,
          ``
        );
      });

      await m.reply(claraWrap("Agenda - Riwayat", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // Check if enabled
    if (!isAgendaOn(groupId)) {
      await m.reply(claraWrap("Agenda", [
        `╎ Status: *Nonaktif di grup ini*`,
        ``,
        `╎ Owner: ketik *${prefix}agendaon* untuk mengaktifkan.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Sub-commands ───
    const subCmd = raw.toLowerCase().match(
      new RegExp(`^${prefix}agenda\\s+(list|status|hapus|tambah|bantu|help)\\b`, "i")
    );

    // .agenda list
    if (subCmd && subCmd[1] === "list") {
      const active = getActiveEvents(groupId);
      if (active.length === 0) {
        await m.reply(claraWrap("Agenda - Aktif", [
          `╎ Tidak ada acara aktif.`,
          ``,
          `╎ Bikin baru: *${prefix}agenda tambah | <nama> | <tanggal jam>*`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`╎ Acara aktif: *${active.length}*`, ``];
      const sorted = active.sort((a, b) => a.eventTime - b.eventTime);
      sorted.forEach((e, i) => {
        const diff = e.eventTime - Date.now();
        const hl = hLabel(diff);
        lines.push(
          `╎ ${i + 1}. ${e.shortId} - ${e.name}`,
          `╎    ${formatDate(e.eventTime)}`,
          `╎    *${hl}* - ${formatCountdown(diff)} lagi`,
          ``
        );
      });

      lines.push(`╎ Ketik *${prefix}agenda status <id>* untuk detail.`);

      await m.reply(claraWrap("Agenda - Daftar Aktif", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // .agenda status <id>
    if (subCmd && subCmd[1] === "status") {
      const idMatch = raw.match(new RegExp(`^${prefix}agenda\\s+status\\s+(\\S+)`, "i"));
      const eventId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!eventId) {
        await m.reply(claraWrap("Agenda", [
          `╎ Format: *${prefix}agenda status <id>*`,
          `╎ Contoh: *${prefix}agenda status AGD3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const event = findEvent(groupId, eventId);
      if (!event) {
        await m.reply(claraWrap("Agenda", [
          `╎ Acara *${eventId}* tidak ditemukan.`,
          `╎ Ketik *${prefix}agenda list* untuk lihat yang aktif.`,
        ].join("\n")));
        return { handled: true };
      }

      const diff = event.eventTime - Date.now();
      const hl = hLabel(diff);

      const lines = [
        `╎ ${event.shortId} - ${event.name}`,
        `╎ Dibuat oleh: ${event.creator}`,
        `╎ Tanggal dibuat: ${formatDate(event.createdAt)}`,
        ``,
        `╎ 📅 Waktu Acara:`,
        `╎    *${formatDate(event.eventTime)}*`,
        ``,
        `╎ ⏰ Countdown:`,
        `╎    *${hl}* - ${diff > 0 ? formatCountdown(diff) + " lagi" : "Waktunya tiba!"}`,
      ];

      if (event.status === "done") {
        lines.push(``, `╎ Status: *SELESAI* ✅`);
        if (event.notifiedAt) {
          lines.push(`╎ Notifikasi terkirim: ${formatDate(event.notifiedAt)}`);
        }
      } else if (diff <= 0) {
        lines.push(``, `╎ Status: *Waktunya tiba!* 🔔`);
      } else {
        lines.push(``, `╎ Status: *Aktif* 🟢`);
        if (event.reminded1d) lines.push(`╎ Pengingat H-1 hari: ✅ terkirim`);
        if (event.reminded1h) lines.push(`╎ Pengingat H-1 jam: ✅ terkirim`);
      }

      const text = claraWrap("Agenda - Status", lines.join("\n")) +
        "\n" +
        tipText(`${prefix}agenda hapus ${event.shortId} untuk hapus (owner)`);

      await m.reply(text);
      await m.react("✅");
      return { handled: true };
    }

    // .agenda hapus <id>
    if (subCmd && subCmd[1] === "hapus") {
      if (!isOwner) {
        await m.reply(claraWrap("Agenda", [
          `╎ Status: *Akses Ditolak*`,
          ``,
          `╎ Hanya owner yang bisa menghapus acara.`,
        ].join("\n")));
        return { handled: true };
      }

      const idMatch = raw.match(new RegExp(`^${prefix}agenda\\s+hapus\\s+(\\S+)`, "i"));
      const eventId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!eventId) {
        await m.reply(claraWrap("Agenda", [
          `╎ Format: *${prefix}agenda hapus <id>*`,
          `╎ Contoh: *${prefix}agenda hapus AGD3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const event = findEvent(groupId, eventId);
      if (!event) {
        await m.reply(claraWrap("Agenda", [
          `╎ Acara *${eventId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      const deleted = deleteEvent(groupId, event.id);
      if (deleted) {
        await m.reply(claraWrap("Agenda - Hapus", [
          `╎ ✅ Acara *${event.shortId}* dihapus.`,
          `╎ ${event.name}`,
        ].join("\n")));
        await m.react("✅");
      } else {
        await m.reply(claraWrap("Agenda", [
          `╎ Gagal menghapus acara.`,
        ].join("\n")));
        await m.react("❌");
      }
      return { handled: true };
    }

    // .agenda help
    if (subCmd && (subCmd[1] === "help" || subCmd[1] === "bantu")) {
      await m.reply(claraWrap("Agenda - Bantuan", [
        `╎ Cara Pakai:`,
        ``,
        `╎ 1. Tambah acara:`,
        `╎    *${prefix}agenda tambah | <nama> | <tanggal jam>*`,
        ``,
        `╎ 2. Format tanggal:`,
        `╎    25 Aug 2026 20:00`,
        `╎    25/08/2026 20:00`,
        `╎    besok 15:00`,
        `╎    hari ini 18:00`,
        ``,
        `╎ 3. Lihat acara aktif:`,
        `╎    *${prefix}agenda list*`,
        ``,
        `╎ 4. Cek countdown:`,
        `╎    *${prefix}agenda status <id>*`,
        ``,
        `╎ 5. Hapus acara (owner):`,
        `╎    *${prefix}agenda hapus <id>*`,
        ``,
        `╎ 6. Riwayat:`,
        `╎    *${prefix}agendahistory*`,
        ``,
        `╎ 7. Toggle (owner):`,
        `╎    *${prefix}agendaon* / *${prefix}agendaoff*`,
        ``,
        `╎ 📌 Auto-reminder: H-1 hari & H-1 jam`,
        `╎ 📌 Auto-ping semua member saat waktunya tiba`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Main: Add new event ───
    const body = raw.replace(new RegExp(`^${prefix}agenda\\s+`, "i"), "").trim();

    if (!body || (!subCmd && !body.toLowerCase().startsWith("tambah"))) {
      await m.reply(claraWrap("Agenda - Bantuan", [
        `╎ Cara Pakai:`,
        ``,
        `╎ *${prefix}agenda tambah | <nama> | <tanggal jam>*`,
        ``,
        `╎ Contoh:`,
        `╎    *${prefix}agenda tambah | Mabar Valorant | 25 Aug 2026 20:00*`,
        `╎    *${prefix}agenda tambah | Kopdar | besok 15:00*`,
        `╎    *${prefix}agenda tambah | Ulang tahun Budi | 25/08/2026 00:00*`,
        ``,
        `╎ Sub-command:`,
        `╎    *${prefix}agenda list* - Acara aktif`,
        `╎    *${prefix}agenda status <id>* - Countdown`,
        `╎    *${prefix}agenda hapus <id>* - Hapus (owner)`,
        `╎    *${prefix}agendahistory* - Riwayat`,
      ].join("\n")));
      return { handled: true };
    }

    // Parse: tambah | <nama> | <tanggal jam>
    const parts = body.split("|").map(p => p.trim()).filter(p => p);

    if (parts.length < 3) {
      await m.reply(claraWrap("Agenda", [
        `╎ Format kurang lengkap.`,
        ``,
        `╎ Format: *${prefix}agenda tambah | <nama> | <tanggal jam>*`,
        `╎ Contoh: *${prefix}agenda tambah | Mabar Valorant | 25 Aug 2026 20:00*`,
      ].join("\n")));
      return { handled: true };
    }

    // Remove "tambah" from first part if present
    let eventName = parts[0];
    if (eventName.toLowerCase().startsWith("tambah")) {
      eventName = eventName.replace(/^tambah\s*/i, "").trim();
    }
    if (!eventName) eventName = parts[0];

    const dateTimeStr = parts[2] || parts[1];
    const eventTime = parseDateTime(dateTimeStr);

    if (!eventTime) {
      await m.reply(claraWrap("Agenda", [
        `╎ Format tanggal tidak valid: *${dateTimeStr}*`,
        ``,
        `╎ Format yang didukung:`,
        `╎    25 Aug 2026 20:00`,
        `╎    25/08/2026 20:00`,
        `╎    2026-08-25 20:00`,
        `╎    besok 15:00`,
        `╎    hari ini 18:00`,
      ].join("\n")));
      return { handled: true };
    }

    if (eventTime <= Date.now()) {
      await m.reply(claraWrap("Agenda", [
        `╎ Waktu yang dimasukkan sudah lewat.`,
        `╎ Gunakan tanggal & jam yang masih akan datang.`,
      ].join("\n")));
      return { handled: true };
    }

    await m.react("🕐");

    const eventId = genId();
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

    const event = {
      id: eventId,
      shortId: eventId,
      name: eventName,
      eventTime,
      creator: senderName,
      creatorJid: sender,
      createdAt: Date.now(),
      status: "active",
      reminded1d: false,
      reminded1h: false,
      notified: false,
    };

    addEvent(groupId, event);

    const diff = eventTime - Date.now();
    const hl = hLabel(diff);

    const lines = [
      `╎ ${eventId} - ${eventName}`,
      `╎ Dibuat oleh: ${senderName}`,
      ``,
      `╎ 📅 Waktu Acara:`,
      `╎    *${formatDate(eventTime)}*`,
      ``,
      `╎ ⏰ Countdown:`,
      `╎    *${hl}* - ${formatCountdown(diff)} lagi`,
      ``,
      `╎ 📌 Auto-reminder akan dikirim:`,
      `╎    H-1 jam sebelum acara`,
      `╎    Saat waktunya tiba (notifikasi tanpa tag)`,
    ];

    const text = claraWrap("Agenda - Acara Baru", lines.join("\n")) +
      "\n" +
      tipText(`${prefix}agenda status ${eventId} untuk cek countdown`);

    await m.reply(text);
    await m.react("✅");
    return { handled: true };
  },
};

export { startAgendaChecker };
