// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antinomorluar",
  alias: ["antiasing", "antiforeign", "anl", "antinomor"],
  category: "group",
  description: "Blokir nomor dengan prefix tertentu di grup (contoh: 60 = Malaysia)",
  usage: ".antinomorluar <on/off/set prefix>",
  example: ".antinomorluar on 60\n.antinomorluar set 60,44\n.antinomorluar off",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  isBotAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handleAntiNomorLuar(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antinomorluar) return false;

  // Get blocked prefixes (comma-separated, e.g. "60,44,1")
  const blockedPrefixes = (groupData.nomorluarBlock || "60")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const senderNum = m.senderNumber || (m.sender || "").replace(/@.+/g, "");

  // Check if sender number starts with any blocked prefix
  const isBlocked = blockedPrefixes.some((prefix) => senderNum.startsWith(prefix));
  if (!isBlocked) return false;

  // Remove the blocked foreign user
  try {
    await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
  } catch {}

  try {
    await sock.sendMessage(m.chat, {
      text: `Anti Nomor Luar - @${senderNum} dikeluarkan (prefix ${blockedPrefixes.join(",")} diblokir)`,
      mentions: [m.sender],
    });
  } catch {}

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const action = args[0]?.toLowerCase();
  const prefixArg = args[1]?.replace(/[^0-9,]/g, "");
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antinomorluar ? "ON" : "OFF";
    const currentBlock = groupData.nomorluarBlock || "60";
    let txt = `Anti Nomor Luar\n\n`;
    txt += `Status: ${status}\n`;
    txt += `Prefix diblokir: ${currentBlock}\n\n`;
    txt += `Cara pakai:\n`;
    txt += `1. ${m.prefix}antinomorluar on 60 - aktifkan, blokir 60\n`;
    txt += `2. ${m.prefix}antinomorluar set 60,44 - blokir 60 dan 44\n`;
    txt += `3. ${m.prefix}antinomorluar off - matikan`;
    return sendReplyWithNav(m, sock, txt, { commandName: "antinomorluar" });
  }

  if (action === "on") {
    const prefix = prefixArg || groupData.nomorluarBlock || "60";
    db.setGroup(m.chat, { antinomorluar: true, nomorluarBlock: prefix });
    m.react("✅");
    return m.reply(claraWrap("Antinomorluar", `Anti Nomor Luar diaktifkan\nPrefix diblokir: ${prefix}`));
  }

  if (action === "off") {
    db.setGroup(m.chat, { antinomorluar: false });
    m.react("✅");
    return m.reply(claraWrap("Antinomorluar", `Anti Nomor Luar dinonaktifkan`));
  }

  if (action === "set") {
    if (!prefixArg) {
      return m.reply(`Masukkan prefix nomor!\nContoh: \`${m.prefix}antinomorluar set 60\``);
    }
    db.setGroup(m.chat, { nomorluarBlock: prefixArg });
    m.react("✅");
    const isOn = groupData.antinomorluar;
    return m.reply(claraWrap("Antinomorluar", `Prefix diblokir diubah ke: ${prefixArg}\nStatus: ${isOn ? "ON" : "OFF"}`));
  }

  return m.reply(`Gunakan:\n\`${m.prefix}antinomorluar on 60\`\n\`${m.prefix}antinomorluar set 60,44\`\n\`${m.prefix}antinomorluar off\``);
}

export { pluginConfig as config, handler, handleAntiNomorLuar };
