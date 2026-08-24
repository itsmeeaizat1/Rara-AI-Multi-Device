// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * plugins/owner/setjadibot.js
 * Command .setjadibot — atur akses jadibot (owner only).
 * Mode: all (semua user), premium (premium only), specific (user tertentu)
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setjadibot",
  alias: ["jadibotaccess", "jadibotmode", "aturjadibot"],
  category: "owner",
  description: "Atur akses fitur jadibot untuk user",
  usage: ".setjadibot <aksi>",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function getJadibotAccess() {
  const db = getDatabase();
  const stored = db.setting("jadibotAccess") || {};
  return {
    mode: stored.mode || "premium",
    allowedUsers: Array.isArray(stored.allowedUsers) ? stored.allowedUsers : [],
  };
}

function saveJadibotAccess(access) {
  const db = getDatabase();
  db.setting("jadibotAccess", access);
}

function formatAccess(access) {
  const modeLabel = {
    all: "Semua User",
    premium: "Premium Only",
    specific: "User Tertentu",
  }[access.mode] || access.mode;

  let txt = "*Pengaturan Akses Jadibot*\n\n";
  txt += `Mode: *${modeLabel}*\n`;

  if (access.mode === "specific" && access.allowedUsers.length) {
    txt += "User yang diizinkan:\n";
    access.allowedUsers.forEach((u, i) => {
      txt += `  ${i + 1}. @${u.split("@")[0]}\n`;
    });
  } else if (access.mode === "specific") {
    txt += "User yang diizinkan: (kosong)\n";
  }

  return txt;
}

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => String(a).trim()).filter(Boolean);
  const action = (args.shift() || "status").toLowerCase();

  if (action === "status" || action === "info") {
    const access = getJadibotAccess();
    const text = formatAccess(access);
    const mentions = access.mode === "specific" ? access.allowedUsers : [];
    return sock.sendMessage(m.chat, { text, mentions: mentions.length ? mentions : undefined }, { quoted: m });
  }

  if (action === "mode" || action === "setmode") {
    const mode = (args[0] || "").toLowerCase();
    if (!["all", "premium", "specific"].includes(mode)) {
      return m.reply("Mode tidak valid.\n\n" +
        "Pilih salah satu:\n" +
        "1. all - semua user bisa jadibot\n" +
        "2. premium - hanya premium user\n" +
        "3. specific - hanya user tertentu\n\n" +
        `Contoh: ${m.prefix}setjadibot mode premium`);
    }
    const access = getJadibotAccess();
    access.mode = mode;
    saveJadibotAccess(access);

    const modeLabel = {
      all: "Semua User",
      premium: "Premium Only",
      specific: "User Tertentu",
    }[mode];

    return m.reply(claraWrap("Setjadibot", `Akses jadibot diatur ke: *${modeLabel}*`));
  }

  if (action === "add" || action === "tambah") {
    const target = args[0] || (m.mentionedJid?.[0] || "");
    if (!target) {
      return m.reply( `Tag atau ketik nomor yang mau diizinkan.\n\n` +
        `Contoh: ${m.prefix}setjadibot add @user\n` +
        `Atau: ${m.prefix}setjadibot add 628xxx`, "setjadibot");
    }

    let jid = target;
    if (!target.includes("@")) {
      let num = target.replace(/[^0-9]/g, "");
      jid = num + "@s.whatsapp.net";
    }

    const access = getJadibotAccess();
    if (!access.allowedUsers.includes(jid)) {
      access.allowedUsers.push(jid);
      saveJadibotAccess(access);
      return m.reply(claraWrap("Setjadibot", `User @${jid.split("@")[0]} ditambahkan ke daftar jadibot.`));
    }
    return m.reply(claraWrap("Setjadibot", "User sudah ada di daftar."));
  }

  if (action === "remove" || action === "del" || action === "hapus") {
    const target = args[0] || (m.mentionedJid?.[0] || "");
    if (!target) {
      return m.reply( `Tag atau ketik nomor yang mau dihapus.\n\n` +
        `Contoh: ${m.prefix}setjadibot remove @user`, "setjadibot");
    }

    let jid = target;
    if (!target.includes("@")) {
      let num = target.replace(/[^0-9]/g, "");
      jid = num + "@s.whatsapp.net";
    }

    const access = getJadibotAccess();
    const idx = access.allowedUsers.indexOf(jid);
    if (idx !== -1) {
      access.allowedUsers.splice(idx, 1);
      saveJadibotAccess(access);
      return m.reply(claraWrap("Setjadibot", `User @${jid.split("@")[0]} dihapus dari daftar jadibot.`));
    }
    return m.reply(claraWrap("Setjadibot", "User tidak ada di daftar."));
  }

  if (action === "list" || action === "daftar") {
    const access = getJadibotAccess();
    if (!access.allowedUsers.length) {
      return m.reply(claraWrap("Setjadibot", "Daftar user jadibot kosong."));
    }
    let txt = "*Daftar User Jadibot*\n\n";
    access.allowedUsers.forEach((u, i) => {
      txt += `${i + 1}. @${u.split("@")[0]}\n`;
    });
    return sock.sendMessage(m.chat, { text: txt, mentions: access.allowedUsers }, { quoted: m });
  }

  return m.reply("*Pengaturan Akses Jadibot*\n\n" +
    `1. ${m.prefix}setjadibot mode <all/premium/specific>\n` +
    "   Atur siapa yang bisa pakai jadibot\n\n" +
    `2. ${m.prefix}setjadibot add @user\n` +
    "   Tambah user ke daftar (mode: specific)\n\n" +
    `3. ${m.prefix}setjadibot remove @user\n` +
    "   Hapus user dari daftar\n\n" +
    `4. ${m.prefix}setjadibot list\n` +
    "   Lihat daftar user yang diizinkan\n\n" +
    `5. ${m.prefix}setjadibot status\n` +
    "   Lihat setting aktif");
}

export { pluginConfig as config, handler, getJadibotAccess };
