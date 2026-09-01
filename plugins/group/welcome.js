// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// welcome.js — V1 (teks) + V2 (canvas hexagon) + V3 (autoresbot API bg + vertical)
import { tipText, claraWrap, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createWideDiscordCard, createWelcomeCardV3 } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Welcome', 'Aktifkan atau matikan pesan sambutan (welcome) untuk member baru.', `${prefix}welcome on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    const text =
      claraWrap("Welcome", ["Fitur: *ᴡᴇʟᴄᴏᴍᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `Status: *${args === "on" ? "ON" : "OFF"}*`,
        `Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}setwelcometype v1/v2/v3 untuk pilih tipe`);

    await m.reply(claraWrap("welcome2", text));
  } catch (error) {
    await m.reply(novaError('Welcome', `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendWelcomeMessage — dipanggil oleh handler.js saat member baru join
 * v1 = teks biasa, v2 = canvas hexagon, v3 = autoresbot API bg + vertical layout
 */
async function sendWelcomeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const welcomeType = db.setting("welcomeType") || 1;
  const groupData = db.getGroup(groupJid) || {};

  if (!groupData.welcome) return;

  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // ===== V1: TEKS BAWAAN =====
  if (welcomeType === 1) {
    const welcomeText =
      `Halo @${username}!\n` +
      `Selamat datang di *${groupName}*\n` +
      `Kamu member ke-*${memberCount}*\n\n` +
      `Ketik *${prefix}menu* untuk lihat fitur\n` +
      `Ketik *${prefix}help* untuk bantuan`;

    await sock.sendMessage(groupJid, {
      text: welcomeText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS HEXAGON =====
  if (welcomeType === 2) {
    try {
      const buffer = await createWideDiscordCard(username, ppUrl, groupName, memberCount);

      const caption =
        `Halo @${username}!\n` +
        `Selamat datang di *${groupName}*\n` +
        `Member ke-*${memberCount}*\n\n` +
        `Ketik *${prefix}menu* untuk lihat fitur`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("welcome v2 canvas error:", err.message);
    }
  }

  // ===== V3: AUTORESBOT API BG + VERTICAL LAYOUT =====
  if (welcomeType === 3) {
    try {
      const apiKey = config.APIkey?.autoresbot || "";
      const buffer = await createWelcomeCardV3(username, ppUrl, groupName, memberCount, apiKey);

      const caption =
        `Halo @${username}!\n` +
        `Selamat datang di *${groupName}*\n` +
        `Member ke-*${memberCount}*\n\n` +
        `Ketik *${prefix}menu* untuk lihat fitur`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("welcome v3 autoresbot error:", err.message);
      // Fallback ke V2 jika V3 gagal
      try {
        const buffer = await createWideDiscordCard(username, ppUrl, groupName, memberCount);
        await sock.sendMessage(groupJid, {
          image: buffer,
          caption: `Halo @${username}!\nSelamat datang di *${groupName}*\nMember ke-*${memberCount}*\n\nKetik *${prefix}menu* untuk lihat fitur`,
          mentions: [participantJid],
        });
        return;
      } catch (err2) {
        console.error("welcome v3 fallback error:", err2.message);
      }
    }
  }

  // ===== V4+: Fallback ke teks =====
  const welcomeText =
    `Halo @${username}!\n` +
    `Selamat datang di *${groupName}*\n` +
    `Kamu member ke-*${memberCount}*\n\n` +
    `Ketik *${prefix}menu* untuk lihat fitur\n` +
    `Ketik *${prefix}help* untuk bantuan`;

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
    description: "Pesan welcome saat member join grup (v1 teks / v2 canvas / v3 autoresbot API)",
    usage: ".welcome on/off\n.setwelcometype v1 (teks) / v2 (canvas) / v3 (API bg)",
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
