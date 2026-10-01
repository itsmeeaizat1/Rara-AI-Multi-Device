// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "transferlimit",
  alias: ["transferlimit"],
  category: "user",
  description: "Transfer limit ke user lain (biaya admin 5%)",
  usage: ".transferlimit @tag <jumlah>",
  example: ".transferlimit @user 50",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const ADMIN_FEE = 0.05; // 5% biaya admin
const MIN_TRANSFER = 10;

function formatNumber(num) {
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
    return m.reply( raraWrap("Transfer Limit",
      `Tag atau reply user yang mau dikasih limit.\n\n` +
      `Usage: \`.transferlimit @tag <jumlah>\`\n` +
      `Contoh: \`.transferlimit @user 50\`\n\n` +
      `Minimal transfer: ${MIN_TRANSFER} limit\n` +
      `Biaya admin: 5%`, "warn"), "transferlimit");
  }

  // Dapatkan jumlah
  const amount = parseInt(m.args?.find(a => !isNaN(a) && !a.startsWith("@")) || 0);

  if (!amount || amount < MIN_TRANSFER) {
    return m.reply( raraWrap("Transfer Limit",
      `Jumlah minimal transfer: *${MIN_TRANSFER} limit*\n\n` +
      `Contoh: \`.transferlimit @user 50\``, "warn"), "transferlimit");
  }

  // Cek sender
  const sender = db.getUser(m.sender) || db.setUser(m.sender);
  const senderEnergi = sender?.energi ?? config.energi?.default ?? 300;

  if (senderEnergi === -1) {
    return m.reply( raraWrap("Transfer Limit",
      "Owner/Premium unlimited tidak bisa transfer limit.", "warn"), "transferlimit");
  }

  if (senderEnergi < amount) {
    return m.reply( raraWrap("Transfer Limit",
      `Limit kamu tidak cukup!\n\n` +
      `Sisa limit: *${formatNumber(senderEnergi)}*\n` +
      `Butuh: *${formatNumber(amount)}*`, "warn"), "transferlimit");
  }

  // Cek target == sender
  if (targetJid === m.sender) {
    return m.reply( raraWrap("Transfer Limit",
      "Tidak bisa transfer ke diri sendiri.", "warn"), "transferlimit");
  }

  // Hitung biaya admin
  const fee = Math.ceil(amount * ADMIN_FEE);
  const totalDeduct = amount + fee;
  const diterima = amount;

  // Potong sender
  if (senderEnergi < totalDeduct) {
    return m.reply( raraWrap("Transfer Limit",
      `Limit kamu tidak cukup untuk transfer + biaya admin!\n\n` +
      `Butuh: *${formatNumber(totalDeduct)}* (${formatNumber(amount)} + ${formatNumber(fee)} admin)\n` +
      `Sisa limit: *${formatNumber(senderEnergi)}*`, "warn"), "transferlimit");
  }

  db.updateEnergi(m.sender, -totalDeduct);
  try { sock.sendMessage(m.chat, { text: totalDeduct + " Limit terpakai" }); } catch {}

  // Tambah ke target
  db.updateEnergi(targetJid, diterima);
  db.save();

  const targetName = targetJid.split("@")[0];
  let msg = "";
  msg += `Dari: *${m.pushName || m.sender.split("@")[0]}*\n`;
  msg += `Ke: *${targetName}*\n`;
  msg += `Jumlah: *${formatNumber(diterima)} limit*\n`;
  msg += `Biaya admin: *${formatNumber(fee)} limit (5%)*\n`;
  msg += `Total dipotong: *${formatNumber(totalDeduct)} limit*\n`;
  msg += `\n`;
  msg += `Sisa limit kamu: ${formatNumber(senderEnergi - totalDeduct)}`;

  return m.reply( msg, "transferlimit");
}

export { pluginConfig as config, handler };
