// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// goodbye.js — pesan perpisahan member keluar (single design, engine text)
import { novaError, novaGuide, claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { detectCountry, fillWelcomeTemplate } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Goodbye', `Pesan perpisahan saat member keluar grup. Custom pesannya? Ketik ${prefix}setgoodbye <pesan>.`, `${prefix}goodbye on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    await m.reply(claraWrap("goodbye", [
      `Fitur : goodbye message`,
      `Status : ${args === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      "",
      `💡 Custom pesan? Ketik ${prefix}setgoodbye <pesan>`,
    ].join("\n")));
  } catch (error) {
    await m.reply(novaError("Goodbye", `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendGoodbyeMessage — dipanggil oleh handler.js saat member keluar
 * Single design: engine text + info lengkap + mention
 */
async function sendGoodbyeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const groupData = db.getGroup(groupJid) || {};

  if (!groupData.goodbye) return;

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

  // Pesan custom goodbyeMsg yang di-set owner (kalau ada)
  // Semua placeholder didukung: {user} {number} {group} {desc} {count} {owner} {date} {time} {day} {bot} {prefix}
  let customText = "";
  const customMsg = String(groupData.goodbyeMsg || "").trim();
  if (customMsg) {
    customText = fillWelcomeTemplate(customMsg, {
      username,
      groupName,
      memberCount,
      desc: metadata?.desc || "",
      ownerName,
      botName: config.bot?.name || "Nova AI",
      prefix,
    });
    if (customText.length > 200) customText = customText.slice(0, 197) + "...";
  }

  // Sapaan perpisahan acak biar gak monoton
  const SAPAAN_OUT = [
    `@${username} telah keluar dari grup...`,
    `Ada yang pergi duluan nih, @${username}...`,
    `Kita kehilangan @${username} hari ini...`,
    `Farewell @${username}, semoga baik-baik saja...`,
  ];
  const sapaanOut = SAPAAN_OUT[Math.floor(Math.random() * SAPAAN_OUT.length)];

  const rows = [
    `│ • 👤 Nama : ${displayName}`,
    `│ • 📱 Nomor : @${username}`,
    `│ • 🌏 Negara : ${country}`,
    `│ • 🏠 Grup : ${groupName}`,
    `│ • 👥 Sisa Member : ${memberCount}`,
  ];
  if (customText) {
    rows.push("│", `│ • 💌 ${customText}`);
  }
  const engineText = novaGameBox({
    title: "goodbye", icon: "🚪",
    flavor: `🚪 *${sapaanOut}*`,
    body: rows.join("\n"),
    cta: gameCTA("goodbye"),
  });

  await sock.sendMessage(groupJid, {
    text: engineText,
    mentions: [participantJid],
  });
}

export default {
  config: {
    name: "goodbye2",
    alias: ["goodbye2", "goodbye"],
    category: "group",
    description: "Pesan goodbye saat member keluar grup (teks engine)",
    usage: ".goodbye on/off\n.setgoodbye <pesan> (custom)\n.resetgoodbye (reset)",
    example: ".goodbye on",
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
  },
  handler,
  sendGoodbyeMessage,
};
