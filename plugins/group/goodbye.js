// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// goodbye.js — Goodbye v1 (teks) + v2 (canvas image) + sendGoodbyeMessage
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaError, novaGuide, tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createGoodbyeCard } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `goodbye_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      const text =
        novaCaption({
          emoji: "👥",
          name: "goodbye2",
          description: "Pesan goodbye saat member keluar grup",
          usage: `${prefix}goodbye on/off`,
          example: `${prefix}goodbye on`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}setgoodbyetype v1 atau v2 untuk pilih tipe`);

      await m.reply(claraWrap("goodbye2", text));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    const text =
      claraWrap("Goodbye", ["│ Fitur: *ɢᴏᴏᴅʙʏᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `│ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `│ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}setgoodbyetype v1 atau v2 untuk pilih tipe`);

    await m.reply(claraWrap("goodbye2", text));
  } catch (error) {
    await m.reply(novaError("Goodbye", `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendGoodbyeMessage — dipanggil oleh handler.js saat member keluar
 * v1 = teks biasa (bawaan), v2 = canvas image banner
 */
async function sendGoodbyeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const goodbyeType = db.setting("goodbyeType") || 1;
  const groupData = db.getGroup(groupJid) || {};

  // Kalau goodbye off di grup ini, skip
  if (groupData.goodbye === false) return;

  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // ===== V1: TEKS BAWAAN =====
  if (goodbyeType === 1) {
    const goodbyeText =
      `╭─「 ✦ ɢᴏᴏᴅʙʏᴇ ✦ 」\n` +
      `│ @${username} telah keluar\n` +
      `│ Dari grup: *${groupName}*\n` +
      `│ Sisa member: *${memberCount}*\n` +
      `╰────  •  ────`;

    await sock.sendMessage(groupJid, {
      text: goodbyeText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS IMAGE =====
  if (goodbyeType === 2) {
    try {
      const buffer = await createGoodbyeCard(
        username,
        ppUrl,
        groupName,
        memberCount
      );

      const caption =
        `╭─「 ✦ ɢᴏᴏᴅʙʏᴇ ✦ 」\n` +
        `│ @${username} telah keluar\n` +
        `│ Dari: *${groupName}*\n` +
        `│ Sisa: *${memberCount} member*\n` +
        `╰────  •  ────`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("goodbye v2 canvas error:", err.message);
      // Fallback ke v1
      const fallbackText =
        `╭─「 ✦ ɢᴏᴏᴅʙʏᴇ ✦ 」\n` +
        `│ @${username} telah keluar\n` +
        `│ Dari grup: *${groupName}*\n` +
        `│ Sisa member: *${memberCount}*\n` +
        `╰────  •  ────`;
      await sock.sendMessage(groupJid, {
        text: fallbackText,
        mentions: [participantJid],
      });
      return;
    }
  }

  // ===== V3+: Fallback teks =====
  const goodbyeText =
    `╭─「 ✦ ɢᴏᴏᴅʙʏᴇ ✦ 」\n` +
    `│ @${username} telah keluar\n` +
    `│ Dari grup: *${groupName}*\n` +
    `│ Sisa member: *${memberCount}*\n` +
    `╰────  •  ────`;

  await sock.sendMessage(groupJid, {
    text: goodbyeText,
    mentions: [participantJid],
  });
}

export default {
  config: {
    name: "goodbye2",
    alias: ["goodbye2", "goodbye"],
    category: "group",
    description: "Pesan goodbye saat member keluar grup (v1 teks / v2 canvas image)",
    usage: ".goodbye on/off\n.setgoodbyetype v1 (teks) / v2 (gambar)",
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
