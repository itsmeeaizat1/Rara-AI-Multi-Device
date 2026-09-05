// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// welcome.js — pesan sambutan member baru (single design, engine text)
import { claraWrap, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { detectCountry, fillWelcomeTemplate } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Welcome', `Aktifkan atau matikan pesan sambutan member baru. Custom pesannya? Ketik ${prefix}setwelcome <pesan>.`, `${prefix}welcome on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    await m.reply(claraWrap("welcome", [
      `Fitur : welcome message`,
      `Status : ${args === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      "",
      `💡 Custom pesan? Ketik ${prefix}setwelcome <pesan>`,
    ].join("\n")));
  } catch (error) {
    await m.reply(novaError('Welcome', `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendWelcomeMessage — dipanggil oleh handler.js saat member baru join
 * Single design: engine text + info lengkap + mention
 */
async function sendWelcomeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const groupData = db.getGroup(groupJid) || {};

  if (!groupData.welcome) return;

  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // Info user dari database + deteksi negara dari nomor
  const userData = db.getUser(participantJid) || {};
  const displayName = userData.name || userData.regName || username;
  const country = detectCountry(participantJid);

  // Nama owner grup (buat placeholder {owner})
  const ownerJid = metadata?.owner || "";
  const ownerData = ownerJid ? db.getUser(ownerJid) || {} : {};
  const ownerName = ownerData.name || ownerData.regName || ownerJid.split("@")[0] || "Owner";

  // Deskripsi/rules grup: custom welcomeMsg (yang di-set owner) > deskripsi grup
  // Semua placeholder didukung: {user} {number} {group} {desc} {count} {owner} {date} {time} {day} {bot} {prefix}
  let rulesText = "";
  const customMsg = String(groupData.welcomeMsg || "").trim();
  if (customMsg) {
    rulesText = fillWelcomeTemplate(customMsg, {
      username,
      groupName,
      memberCount,
      desc: metadata?.desc || "",
      ownerName,
      botName: config.bot?.name || "Nova AI",
      prefix,
    });
  } else if (metadata?.desc) {
    rulesText = metadata.desc;
  }
  if (rulesText.length > 200) rulesText = rulesText.slice(0, 197) + "...";

  // Sapaan acak biar gak monoton
  const SAPAAN = [
    `Halo kak @${username}, selamat datang!`,
    `Wew, akhirnya @${username} nyampe juga!`,
    `Ada member baru nih, welcome ya @${username}!`,
    `Ketemu lagi di sini, selamat datang @${username}!`,
    `Tumben @${username} mampir ke sini, haha welcome!`,
  ];
  const sapaan = SAPAAN[Math.floor(Math.random() * SAPAAN.length)];

  const rows = [
    `│ • 👤 Nama : ${displayName}`,
    `│ • 📱 Nomor : @${username}`,
    `│ • 🌏 Negara : ${country}`,
    `│ • 🏠 Grup : ${groupName}`,
    `│ • 👥 Total Member : ${memberCount}`,
  ];
  if (rulesText) {
    rows.push("│", `│ • 📋 ${rulesText}`);
  }

  const engineText = novaGameBox({
    title: "welcome", icon: "👋",
    flavor: `👋 *${sapaan}*`,
    body: rows.join("\n"),
    cta: gameCTA("welcome"),
  });

  await sock.sendMessage(groupJid, {
    text: engineText,
    mentions: [participantJid],
  });
}

export default {
  config: {
    name: "welcome2",
    alias: ["welcome2", "welcome"],
    category: "group",
    description: "Pesan welcome saat member join grup (teks engine)",
    usage: ".welcome on/off\n.setwelcome <pesan> (custom)\n.resetwelcome (reset)",
    example: ".welcome on",
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
  },
  handler,
  sendWelcomeMessage,
};
