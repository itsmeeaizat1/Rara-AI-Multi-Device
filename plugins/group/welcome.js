// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// welcome.js — Welcome v1 (teks) + v2 (canvas image) + sendWelcomeMessage
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, claraWrap, novaCaption, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createWideDiscordCard } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Welcome', 'Aktifkan atau matikan pesan sambutan (welcome) untuk member baru.', `${prefix}welcome on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    const text =
      claraWrap("Welcome", ["│ Fitur: *ᴡᴇʟᴄᴏᴍᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `│ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `│ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}setwelcometype v1 atau v2 untuk pilih tipe`);

    await m.reply(claraWrap("welcome2", text));
  } catch (error) {
    await m.reply(novaError('Welcome', `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendWelcomeMessage — dipanggil oleh handler.js saat member baru join
 * v1 = teks biasa (bawaan), v2 = canvas image banner
 */
async function sendWelcomeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const welcomeType = db.setting("welcomeType") || 1;
  const groupData = db.getGroup(groupJid) || {};

  // Kalau welcome off di grup ini, skip
  if (groupData.welcome === false) return;

  // Ambil info
  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // ===== V1: TEKS BAWAAN =====
  if (welcomeType === 1) {
    const welcomeText =
      `╭─「 *ᴡᴇʟᴄᴏᴍᴇ* 」\n` +
      `│ Halo @${username}!\n` +
      `│ Selamat datang di *${groupName}*\n` +
      `│ Kamu member ke-*${memberCount}*\n` +
      `│\n` +
      `│ Ketik *${prefix}menu* untuk lihat fitur\n` +
      `│ Ketik *${prefix}help* untuk bantuan\n` +
      `╰──────────`;

    await sock.sendMessage(groupJid, {
      text: welcomeText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS IMAGE =====
  if (welcomeType === 2) {
    try {
      const buffer = await createWideDiscordCard(
        username,
        ppUrl,
        groupName,
        memberCount
      );

      const caption =
        `╭─「 *ᴡᴇʟᴄᴏᴍᴇ* 」\n` +
        `│ Halo @${username}!\n` +
        `│ Selamat datang di *${groupName}*\n` +
        `│ Member ke-*${memberCount}*\n` +
        `│\n` +
        `│ Ketik *${prefix}menu* untuk lihat fitur\n` +
        `╰──────────`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("welcome v2 canvas error:", err.message);
      // Fallback ke v1 jika canvas gagal
      const fallbackText =
        `╭─「 *ᴡᴇʟᴄᴏᴍᴇ* 」\n` +
        `│ Halo @${username}!\n` +
        `│ Selamat datang di *${groupName}*\n` +
        `│ Kamu member ke-*${memberCount}*\n` +
        `│\n` +
        `│ Ketik *${prefix}menu* untuk lihat fitur\n` +
        `╰──────────`;
      await sock.sendMessage(groupJid, {
        text: fallbackText,
        mentions: [participantJid],
      });
      return;
    }
  }

  // ===== V3-V7: Tipe lain (fallback ke teks) =====
  const welcomeText =
    `╭─「 *ᴡᴇʟᴄᴏᴍᴇ* 」\n` +
    `│ Halo @${username}!\n` +
    `│ Selamat datang di *${groupName}*\n` +
    `│ Kamu member ke-*${memberCount}*\n` +
    `│\n` +
    `│ Ketik *${prefix}menu* untuk lihat fitur\n` +
    `╰──────────`;

  await sock.sendMessage(groupJid, {
    text: welcomeText,
    mentions: [participantJid],
  });
}

export default {
  config: {
    name: "welcome2",
    alias: ["welcome2", "welcome"],
    category: "group",
    description: "Pesan welcome saat member join grup (v1 teks / v2 canvas image)",
    usage: ".welcome on/off\n.setwelcometype v1 (teks) / v2 (gambar)",
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
