// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// goodbye.js — V1 (teks) + V2 (canvas hexagon) + V3 (autoresbot API bg + vertical)
import { novaError, novaGuide, claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createGoodbyeCard, createGoodbyeCardV3, createGoodbyeCardV4, detectCountry, fillWelcomeTemplate } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Goodbye', `Pesan perpisahan saat member keluar grup. Pilih tipe dengan ${prefix}setgoodbyetype v1-v5.`, `${prefix}goodbye on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    await m.reply(claraWrap("goodbye", [
      `Fitur : goodbye message`,
      `Status : ${args === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      "",
      `💡 Ketik ${prefix}setgoodbyetype v1/v2/v3/v4/v5 untuk pilih tipe`,
    ].join("\n")));
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

  // Engine text goodbye (dipakai v1 teks + caption v2/v3 + fallback)
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

  // ===== V1: TEKS BAWAAN =====
  if (goodbyeType === 1) {
    await sock.sendMessage(groupJid, {
      text: engineText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS HEXAGON =====
  if (goodbyeType === 2) {
    try {
      const buffer = await createGoodbyeCard(username, ppUrl, groupName, memberCount);

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
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

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
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
          caption: engineText,
          mentions: [participantJid],
        });
        return;
      } catch (err2) {
        console.error("goodbye v3 fallback error:", err2.message);
      }
    }
  }

  // ===== V4: GLASSMORPHISM CARD =====
  if (goodbyeType === 4) {
    try {
      const buffer = await createGoodbyeCardV4(username, ppUrl, groupName, memberCount);
      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("goodbye v4 glassmorphism error:", err.message);
    }
  }

  // ===== V5: SIMPLE — teks engine + foto profile =====
  if (goodbyeType === 5 && ppUrl) {
    try {
      await sock.sendMessage(groupJid, {
        image: { url: ppUrl },
        caption: engineText,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("goodbye v5 simple error:", err.message);
    }
  }

  // ===== Fallback ke teks =====
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
    description: "Pesan goodbye saat member keluar grup (v1 teks / v2 canvas / v3 API / v4 glassmorphism / v5 teks + foto PP)",
    usage: ".goodbye on/off\n.setgoodbyetype v1 (teks) / v2 (canvas) / v3 (API bg) / v4 (glassmorphism) / v5 (teks + foto PP)",
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
