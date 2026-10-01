// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  raraWrap,
  raraGuide,
} from "../../src/lib/rara-menu-style.js";
import {
  isLid,
  lidToJid,
} from "../../src/lib/rara-lid.js";

const pluginConfig = {
  name: "whitelist",
  alias: ["whitelist", "wl"],
  category: "owner",
  description: "Mode bot hanya merespon nomor whitelist — add/remove/list/on/off",
  usage: ".whitelist on/off/add/remove/list",
  example: ".whitelist add 6281234567890",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Normalisasi nomor: strip non-digit, 08xxx → 628xxx
function normalizeNumber(input) {
  let num = String(input || "").replace(/[^0-9]/g, "");
  if (num.startsWith("08")) num = "62" + num.slice(1);
  else if (num.startsWith("0")) num = "62" + num.slice(1);
  return num;
}

// Resolve target: reply > mention > args
function resolveTarget(m) {
  let raw = "";
  if (m.quoted) {
    raw = m.quoted.sender || m.quoted.participant || "";
  } else if (m.mentionedJid?.length) {
    raw = m.mentionedJid[0] || "";
  } else if (m.args?.[0]) {
    raw = m.args[0];
  }
  if (!raw) return "";
  if (isLid(raw)) raw = lidToJid(raw);
  return normalizeNumber(raw);
}

function getWhitelist(db) {
  return db.setting("whitelist") || [];
}

function saveWhitelist(db, list) {
  db.setting("whitelist", list);
  db.save();
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args?.[0] || m.text || "").toLowerCase().trim();

  const guide = raraGuide(
    "whitelist",
    "Mode bot hanya merespon nomor whitelist",
    `${m.prefix}whitelist add 6281234567890`,
    "Sub: on/off, add/remove <nomor/tag/reply>, list",
  );

  if (!action) {
    const mode = db.setting("whitelistMode") || false;
    const list = getWhitelist(db);
    return m.reply(
      raraWrap("whitelist", `📌 *Mode Whitelist: ${mode ? "ON" : "OFF"}*\n\n` +
        `Jumlah nomor terdaftar: ${list.length}\n\n` +
        `💡 \`${m.prefix}whitelist on\` — aktifkan mode (bot hanya merespon nomor whitelist)\n` +
        `\`${m.prefix}whitelist add <nomor>\` — tambah nomor\n` +
        `\`${m.prefix}whitelist list\` — lihat daftar`)
    );
  }

  switch (action) {
    case "on":
    case "enable": {
      db.setting("whitelistMode", true);
      db.save();
      return m.reply(raraWrap("whitelist", `✅ *Mode Whitelist Aktif*\n\n` +
        `Bot hanya merespon nomor yang ada di whitelist\n` +
        `Owner selalu bisa akses bot`));
    }
    case "off":
    case "disable": {
      db.setting("whitelistMode", false);
      db.save();
      return m.reply(raraWrap("whitelist", `❌ *Mode Whitelist Nonaktif*\n\n` +
        `Bot merespon semua nomor lagi`));
    }
    case "add":
    case "tambah": {
      const target = resolveTarget({ ...m, args: m.args?.slice(1) });
      if (!target || target.length < 10 || target.length > 15) {
        return m.reply(raraWrap("whitelist", `❌ *Gagal*\n\n` +
          `Masukkan nomor yang valid, tag user, atau reply pesannya\n\n` +
          `💡 Contoh: \`${m.prefix}whitelist add 6281234567890\``));
      }
      const list = getWhitelist(db);
      const exists = list.some((n) => {
        const c = String(n).replace(/[^0-9]/g, "");
        return c === target || c.endsWith(target) || target.endsWith(c);
      });
      if (exists) {
        return m.reply(raraWrap("whitelist", `❌ *Gagal*\n\n` +
          `Nomor \`${target}\` sudah ada di whitelist`));
      }
      list.push(target);
      saveWhitelist(db, list);
      return m.reply(raraWrap("whitelist", `✅ *Berhasil*\n\n` +
        `+\`${target}\` ditambahkan ke whitelist\n` +
        `Total nomor: ${list.length}`));
    }
    case "remove":
    case "delete":
    case "hapus": {
      const target = resolveTarget({ ...m, args: m.args?.slice(1) });
      if (!target) {
        return m.reply(raraWrap("whitelist", `❌ *Gagal*\n\n` +
          `Masukkan nomor yang mau dihapus\n\n` +
          `💡 Contoh: \`${m.prefix}whitelist remove 6281234567890\``));
      }
      const list = getWhitelist(db);
      const idx = list.findIndex((n) => {
        const c = String(n).replace(/[^0-9]/g, "");
        return c === target || c.endsWith(target) || target.endsWith(c);
      });
      if (idx === -1) {
        return m.reply(raraWrap("whitelist", `❌ *Gagal*\n\n` +
          `Nomor \`${target}\` tidak ada di whitelist`));
      }
      const removed = list.splice(idx, 1)[0];
      saveWhitelist(db, list);
      return m.reply(raraWrap("whitelist", `✅ *Berhasil*\n\n` +
          `-\`${removed}\` dihapus dari whitelist\n` +
        `Total nomor: ${list.length}`));
    }
    case "list":
    case "daftar": {
      const list = getWhitelist(db);
      const mode = db.setting("whitelistMode") || false;
      if (!list.length) {
        return m.reply(raraWrap("whitelist", `📌 *Whitelist Kosong*\n\n` +
          `Mode: ${mode ? "ON" : "OFF"}\n\n` +
          `💡 Tambah dengan \`${m.prefix}whitelist add <nomor>\``));
      }
      let text = `📌 *Daftar Whitelist* (${list.length})\n\n`;
      list.forEach((n, i) => {
        text += `${i + 1}. +${n}\n`;
      });
      return m.reply(raraWrap("whitelist", text));
    }
    default:
      return m.reply(guide);
  }
}

export { pluginConfig as config, handler };
