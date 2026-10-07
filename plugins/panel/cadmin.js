// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

import axios from 'axios'
import crypto from 'crypto'
import config from '../../config.js'
import { isLid, lidToJid } from '../../src/lib/rara-lid.js'
import { hasFullAccess, getUserRole, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'
import * as timeHelper from '../../src/lib/rara-time.js'
import te from '../../src/lib/rara-error.js'
import { getDatabase } from '../../src/lib/rara-database.js'
const allCommands = VALID_SERVERS.slice(0, 5).map((v) => `cadmin${v}`);
const allAliases = VALID_SERVERS.slice(0, 5).map((v) => `createadmin${v}`);

const pluginConfig = {
  name: allCommands,
  alias: allAliases,
  category: "panel",
  description: "Buat admin panel baru (v1-v5)",
  usage: ".cadminv1 username atau .cadminv2 username,628xxx",
  example: ".cadminv1 adminku,628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function cleanJid(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  return jid.includes("@") ? jid : jid + "@s.whatsapp.net";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate() {
  return timeHelper.formatDateTime("D MMMM YYYY HH:mm");
}

function parseServerVersion(cmd, args) {
  let num = null;
  const suffix = String(cmd || "").match(/v(\d{1,3})$/i);
  if (suffix) num = parseInt(suffix[1], 10);
  // Override via argumen: .cadmin 50 user / .cadmin v50 user (support v1-v100)
  if (args && args.length) {
    const am = String(args[0] || "").trim().match(/^v?(\d{1,3})$/i);
    if (am) num = parseInt(am[1], 10);
  }
  if (num === null || !(num >= 1 && num <= 100)) num = 1;
  return { server: "v" + num, serverKey: "s" + num };
}

function getServerConfig(pteroConfig, serverKey) {
  const num = parseInt(String(serverKey || "").replace("s", ""), 10);
  if (!(num >= 1 && num <= 100)) return null;
  return pteroConfig["server" + num] || null;
}

function validateConfig(serverConfig) {
  const missing = [];
  if (!serverConfig?.domain) missing.push("domain");
  if (!serverConfig?.apikey) missing.push("apikey (PTLA)");
  return missing;
}

function getAvailableServers(pteroConfig) {
  const available = [];
  for (let i = 1; i <= 100; i++) {
    const cfg = pteroConfig[`server${i}`];
    if (cfg?.domain && cfg?.apikey) available.push(`v${i}`);
  }
  return available;
}

async function handler(m, { sock }) {
  const pteroConfig = config.pterodactyl;

  const { server: serverVersion, serverKey } = parseServerVersion(m.command, m.args);
  const serverLabel = serverVersion.toUpperCase();

  // FIX 10 Sep 2026 (request owner hierarki): create admin panel hanya
  // Owner & CEO (admin panel). Reseller hanya bisa create panel user biasa.
  if (!hasFullAccess(m.sender, serverVersion, m.isOwner)) {
    const userRole = getUserRole(m.sender, serverVersion);
    return m.reply(
      `❌ *akses ditolak*\n\n` +
        `Create admin panel hanya untuk *Owner* & *CEO (admin panel)*\n` +
        `Reseller hanya bisa create panel user biasa (.cpanel)\n\n` +
        `Role kamu: *${userRole || "Tidak ada"}* | Server: *${serverLabel}*`,
    );
  }

  const serverConfig = getServerConfig(pteroConfig, serverKey);
  const missingConfig = validateConfig(serverConfig);

  if (missingConfig.length > 0) {
    const available = getAvailableServers(pteroConfig);
    let txt = `⚠️ *sErver ${serverLabel} Belum Konfig*\n\n`;
    if (available.length > 0) {
      txt += `Server tersedia: *${available.join(", ")}*\n`;
      txt += `Contoh: \`${m.prefix}cadmin${available[0]} username\``;
    } else {
      txt += `Isi di \`config.js\` bagian \`pterodactyl.server1\``;
    }
    return await m.reply(raraWrap("Admin", txt));
  }

  let targetUser = null;
  let username = null;
  const args = m.text?.trim() || "";

  if (args.includes(",")) {
    const parts = args.split(",");
    username = parts[0]?.trim().toLowerCase();
    let nomor = parts[1]?.trim().replace(/[^0-9]/g, "");
    if (nomor) targetUser = nomor + "@s.whatsapp.net";
  } else if (args) {
    username = args.trim().toLowerCase();
  }

  if (!username) {
    const available = getAvailableServers(pteroConfig);
    return m.reply(
      `⚠️ *cara pakai*\n\n` +
        `\`${m.prefix}${m.command} username\`\n` +
        `\`${m.prefix}${m.command} username,628xxx\`\n` +
        `Reply/mention user\n\n` +
        `Server tersedia: *${available.join(", ") || "none"}*`,
    );
  }

  if (!/^[a-z0-9_]{3,16}$/.test(username)) {
    return m.reply(
      `❌ Username hanya boleh huruf kecil, angka, underscore (3-16 karakter).`,
    );
  }

  if (!targetUser) {
    if (m.quoted?.sender) {
      targetUser = cleanJid(m.quoted.sender);
    } else if (m.mentionedJid?.length > 0) {
      targetUser = cleanJid(m.mentionedJid[0]);
    } else {
      targetUser = cleanJid(m.sender);
    }
  }

  if (!targetUser) {
    return m.reply(raraWrap("Admin", `❌ Tidak dapat menentukan nomor target.`));
  }

  const isPlatformUser = /^(tg|dc)_/.test(String(targetUser.split("@")[0])); // bridge: user TG/Discord bukan nomor WA
  try {
    const [onWa] = isPlatformUser ? [{ exists: true }] : await sock.onWhatsApp(targetUser.split("@")[0]);
    if (!onWa?.exists) {
      return m.reply(
        `❌ Nomor \`${targetUser.split("@")[0]}\` tidak terdaftar di WhatsApp!`,
      );
    }
  } catch (e) { console.error('[cadmin.js]:', e.message); }

  const email = `${username}@gmail.com`;
  const name = capitalize(username) + " Admin";
  const password = username + crypto.randomBytes(3).toString("hex");

  await m.reply(
    `🛠️ *membuat admin panel...*\n\nServer: *${serverLabel}*\nUsername: \`${username}\`\nTarget: \`${targetUser.split("@")[0]}\``,
  );

  try {
    const userRes = await axios.post(
      `${serverConfig.domain}/api/application/users`,
      {
        email,
        username,
        first_name: name,
        last_name: "Admin",
        root_admin: true,
        language: "en",
        password,
      },
      {
        headers: {
          Authorization: `Bearer ${serverConfig.apikey}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json",
        },
      },
    );

    const user = userRes.data.attributes;

    let detailTxt = `ADMIN PANEL BERHASIL DIBUAT\n\n`;
    detailTxt += `Server: *${serverLabel}*\n`;
    detailTxt += `User ID: *${user.id}*\n`;
    detailTxt += `Username: *${user.username}*\n`;
    detailTxt += `Password: *${password}*\n`;
    detailTxt += `Status: *root admin*\n`;
    detailTxt += `Tanggal: *${formatDate()}*\n\n`;
    detailTxt += `Login Panel: ${serverConfig.domain}\n\n`;
    detailTxt += `Akun ini memiliki akses penuh!\nJangan bagikan ke siapapun!`;

    // Baca delivery mode (1=PM, 2=Grup, 3=PM+Grup)
    const db = getDatabase()
    const deliveryMode = db.setting('panelDeliveryMode') || 1

    const confirmTxt = `Admin Panel berhasil dibuat\n\nServer: ${serverLabel}\nUntuk: ${targetUser.split("@")[0]}`

    // Mode 1: PM Only
    if (deliveryMode === 1) {
      await sock.sendMessage(m.sender, { text: detailTxt })
      if (targetUser !== m.sender) {
        await sock.sendMessage(targetUser, { text: detailTxt })
      }
      await m.reply(raraWrap("Admin", confirmTxt + "\n\nDetail akun sudah dikirim ke DM kamu"))
    }
    // Mode 2: Grup Only
    else if (deliveryMode === 2) {
      await sock.sendMessage(m.chat, { text: detailTxt })
      if (targetUser !== m.sender && targetUser !== m.chat) {
        await sock.sendMessage(targetUser, { text: detailTxt })
      }
    }
    // Mode 3: PM + Grup
    else if (deliveryMode === 3) {
      await sock.sendMessage(m.sender, { text: detailTxt })
      await sock.sendMessage(m.chat, { text: detailTxt })
      if (targetUser !== m.sender && targetUser !== m.chat) {
        await sock.sendMessage(targetUser, { text: detailTxt })
      }
    }
  } catch (err) {
    return m.reply(raraWrap("Admin", te(m.prefix, m.command, m.pushName), "error"))
  }
}

export { pluginConfig as config, handler }