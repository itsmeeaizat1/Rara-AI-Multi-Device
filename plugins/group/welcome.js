// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// welcome.js — V1 (teks) + V2 (canvas hexagon) + V3 (autoresbot API bg + vertical)
import { claraWrap, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createWideDiscordCard, createWelcomeCardV3, createWelcomeCardV4, detectCountry, fillWelcomeTemplate } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Welcome', `Aktifkan atau matikan pesan sambutan member baru. Pilih tipe dengan ${prefix}setwelcometype v1-v5.`, `${prefix}welcome on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    await m.reply(claraWrap("welcome", [
      `Fitur : welcome message`,
      `Status : ${args === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      "",
      `💡 Ketik ${prefix}setwelcometype v1/v2/v3/v4/v5 untuk pilih tipe`,
    ].join("\n")));
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

  // Engine text welcome (dipakai v1 teks + caption v2/v3 + fallback)
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

  // ===== V1: TEKS BAWAAN =====
  if (welcomeType === 1) {
    await sock.sendMessage(groupJid, {
      text: engineText,
      mentions: [participantJid],
    });
    return;
  }

  // ===== V2: CANVAS HEXAGON =====
  if (welcomeType === 2) {
    try {
      const buffer = await createWideDiscordCard(username, ppUrl, groupName, memberCount);

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
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

      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
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
          caption: engineText,
          mentions: [participantJid],
        });
        return;
      } catch (err2) {
        console.error("welcome v3 fallback error:", err2.message);
      }
    }
  }

  // ===== V4: GLASSMORPHISM CARD =====
  if (welcomeType === 4) {
    try {
      const buffer = await createWelcomeCardV4(username, ppUrl, groupName, memberCount);
      await sock.sendMessage(groupJid, {
        image: buffer,
        caption: engineText,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("welcome v4 glassmorphism error:", err.message);
    }
  }

  // ===== V5: SIMPLE — teks engine + foto profile =====
  if (welcomeType === 5 && ppUrl) {
    try {
      await sock.sendMessage(groupJid, {
        image: { url: ppUrl },
        caption: engineText,
        mentions: [participantJid],
      });
      return;
    } catch (err) {
      console.error("welcome v5 simple error:", err.message);
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
    name: "welcome2",
    alias: ["welcome2", "welcome"],
    category: "group",
    description: "Pesan welcome saat member join grup (v1 teks / v2 canvas / v3 API / v4 glassmorphism / v5 teks + foto PP)",
    usage: ".welcome on/off\n.setwelcometype v1 (teks) / v2 (canvas) / v3 (API bg) / v4 (glassmorphism) / v5 (teks + foto PP)",
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
