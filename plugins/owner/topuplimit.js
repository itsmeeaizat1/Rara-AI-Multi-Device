// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "topuplimit",
  alias: ["topuplimit", "addlimit", "tambahlimit", "givelimit", "sisipienergi"],
  category: "owner",
  description: "Tambah limit user (owner only)",
  usage: ".topuplimit @tag <jumlah>",
  example: ".topuplimit @user 500",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatNumber(num) {
  if (num === -1) return "∞ Unlimited";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function handler(m, { sock }) {
  const db = getDatabase();

  // Dapatkan target
  let targetJid = null;
  if (m.quoted) {
    targetJid = m.quoted.sender;
  } else if (m.mentionedJid?.length) {
    targetJid = m.mentionedJid[0];
  }

  if (!targetJid) {
    return m.reply( claraWrap("Topup Limit",
      `Tag atau reply user yang mau ditambah limitnya.\n\n` +
      `Usage: \`.topuplimit @tag <jumlah>\`\n` +
      `Contoh: \`.topuplimit @user 500\``, "warn"), "topuplimit");
  }

  // Dapatkan jumlah
  const amount = parseInt(m.args?.find(a => !isNaN(a) && !a.startsWith("@")) || 0);

  if (!amount || amount <= 0) {
    return m.reply( claraWrap("Topup Limit",
      `Jumlah tidak valid!\n\n` +
      `Contoh: \`.topuplimit @user 500\``, "warn"), "topuplimit");
  }

  // Set unlimited jika -1
  const user = db.getUser(targetJid) || db.setUser(targetJid);
  const beforeEnergi = user?.energi ?? config.energi?.default ?? 300;

  if (amount === -1) {
    // Set unlimited
    const userData = db.getUser(targetJid) || db.setUser(targetJid);
    userData.energi = -1;
    db.setUser(targetJid, userData);
    db.save();

    return m.reply( `╭──「 *TOPUP LIMIT\n` + 」
      `│ ❏ User: *${targetJid.split("@")[0]}*\n` +
      `│ ❏ Sebelum: *${formatNumber(beforeEnergi)}*\n` +
      `│ ❏ Sesudah: *∞ Unlimited*\n` +
      `╰──────────❀`, "topuplimit");
  }

  // Tambah limit
  const afterEnergi = db.updateEnergi(targetJid, amount);
  db.save();

  const targetName = targetJid.split("@")[0];
  let msg = `╭──「 *TOPUP LIMIT\n`; 」
  msg += `│ ❏ User: *${targetName}*\n`;
  msg += `│ ❏ Sebelum: *${formatNumber(beforeEnergi)}*\n`;
  msg += `│ ❏ Tambah: *+${formatNumber(amount)}*\n`;
  msg += `│ ❏ Sesudah: *${formatNumber(afterEnergi)}*\n`;
  msg += `╰──────────❀`;

  return m.reply( msg, "topuplimit");
}

export { pluginConfig as config, handler };
