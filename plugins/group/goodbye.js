// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// goodbye.js — V1 (teks) + V2 (canvas hexagon) + V3 (autoresbot API bg + vertical)
import { novaError, novaGuide, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createGoodbyeCard, createGoodbyeCardV3 } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      const text =
        novaGuide('Goodbye', 'Pesan goodbye saat member keluar grup', `${prefix}goodbye on/off`) +
        "\n" +
        tipText(`Ketik ${prefix}setgoodbyetype v1/v2/v3 untuk pilih tipe`);

      await m.reply(claraWrap("goodbye2", text));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    const text =
      claraWrap("Goodbye", ["Fitur: *ɢᴏᴏᴅʙʏᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `Status: *${args === "on" ? "ON" : "OFF"}*`,
        `Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}setgoodbyetype v1/v2/v3 untuk pilih tipe`);

    await m.reply(claraWrap("goodbye2", text));
  } catch (error) {
    await m.reply(novaError("Goodbye", `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendGoodbyeMessage — dipanggil oleh handler.js saat member keluar
 * v1 = teks, v2 = canvas hexagon, v3 = autoresbot API bg + vertical layout
 */
async function sendGoodbyeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const goodbyeType = db.setting("goodbyeType") || 1;
  const groupData = db.getGroup(groupJid) || {};

  if (!groupData.goodbye) return;

  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // ===== V1: TEKS BAWAAN =====
  if (goodbyeType === 1) {
    const goodbyeText =
      `@${username} telah keluar\n` +
      `Dari grup: *${groupName}*\n` +
      `Sisa member: *${memberCount}*`;

    await sock.sendMessage(groupJid, {
      text: goodbyeText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS HEXAGON =====
  if (goodbyeType === 2) {
    try {
      const buffer = await createGoodbyeCard(username, ppUrl, groupName, memberCount);

      const caption =
        `@${username} telah keluar\n` +
        `Dari: *${groupName}*\n` +
        `Sisa: *${memberCount} member*`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("goodbye v2 canvas error:", err.message);
    }
  }

  // ===== V3: AUTORESBOT API BG + VERTICAL LAYOUT =====
  if (goodbyeType === 3) {
    try {
      const apiKey = config.APIkey?.autoresbot || "";
      const buffer = await createGoodbyeCardV3(username, ppUrl, groupName, memberCount, apiKey);

      const caption =
        `@${username} telah keluar\n` +
        `Dari: *${groupName}*\n` +
        `Sisa: *${memberCount} member*`;

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("goodbye v3 autoresbot error:", err.message);
      // Fallback ke V2
      try {
        const buffer = await createGoodbyeCard(username, ppUrl, groupName, memberCount);
        await sock.sendMessage(groupJid, {
          image: buffer,
          caption: `@${username} telah keluar\nDari: *${groupName}*\nSisa: *${memberCount} member*`,
          mentions: [participantJid],
        });
        return;
      } catch (err2) {
        console.error("goodbye v3 fallback error:", err2.message);
      }
    }
  }

  // ===== V4+: Fallback ke teks =====
  const goodbyeText =
    `@${username} telah keluar\n` +
    `Dari grup: *${groupName}*\n` +
    `Sisa member: *${memberCount}*`;

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
    description: "Pesan goodbye saat member keluar grup (v1 teks / v2 canvas / v3 autoresbot API)",
    usage: ".goodbye on/off\n.setgoodbyetype v1 (teks) / v2 (canvas) / v3 (API bg)",
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
