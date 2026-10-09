// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// goodbye.js — pesan perpisahan member keluar (single design, engine text)
import { raraError, raraGuide, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { detectCountry, fillWelcomeTemplate } from "../../src/lib/rara-welcome-card.js";
import config from "../../config.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// divider kartu promosi (konsisten sama bootdoctor/switch: pendek 14 kar biar gak hard-wrap WA)
const DIV = "━━━━━━━━━━━━━━";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(raraGuide('Goodbye', `Pesan perpisahan saat member keluar grup. Custom pesannya? Ketik ${prefix}setgoodbye <pesan>.`, `${prefix}goodbye on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    await m.reply(raraWrap("goodbye", [
      `Fitur : goodbye message`,
      `Status : ${args === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      "",
      `💡 Custom pesan? Ketik ${prefix}setgoodbye <pesan>`,
    ].join("\n")));
  } catch (error) {
    await m.reply(raraError("Goodbye", `Gagal: ${error.message}`));
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
  // Bridge (Telegram/Discord): jid = tg_<id>/dc_<id> — tampilin NAMA platform dari db
  // (disimpen bridge pas service message join), bukan ID mentah (request owner 29 Sep)
  const isBridgeJid = /^(tg|dc)_/.test(participantJid);
  const handle = isBridgeJid ? String(userData.name || username).slice(0, 30) : username;
  const country = isBridgeJid ? (participantJid.startsWith("tg_") ? "Telegram" : "Discord") : detectCountry(participantJid);

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
      username: handle, // bridge: {user}/{number} → nama platform (tg_ gak ada nomor hp)
      groupName,
      memberCount,
      desc: metadata?.desc || "",
      ownerName,
      botName: config.bot?.name || "Rara AI",
      prefix,
    });
    if (customText.length > 200) customText = customText.slice(0, 197) + "...";
  }

  // Sapaan perpisahan acak biar gak monoton
  const SAPAAN_OUT = [
    `@${handle} telah keluar dari grup...`,
    `Ada yang pergi duluan nih, @${handle}...`,
    `Kita kehilangan @${handle} hari ini...`,
    `Farewell @${handle}, semoga baik-baik saja...`,
  ];
  const sapaanOut = SAPAAN_OUT[Math.floor(Math.random() * SAPAAN_OUT.length)];

  // REVISI 9 Okt (owner): teks promosi markdown khas kartu telegram-AI —
  // seksi bold + emoji, divider, bullet ▪ label bold — biar gak polos/kaku.
  const CTA_GOODBYE = [
    "Semoga kita bertemu lagi suatu hari nanti 🌸",
    "Titip pesan buat yang masih di sini — jaga kubu ya 🛡️",
    "Pintu selalu terbuka kalau mau balik lagi 🚪✨",
  ];
  const engineText = raraWrap("Sampai Jumpa", [
    `🚪 *${sapaanOut}*`,
    ``,
    `👤 *PROFIL MEMBER KELUAR*`,
    DIV,
    `▪ *Nama:* ${displayName}`,
    `▪ *${isBridgeJid ? "Akun" : "Nomor"}:* @${handle}`,
    `▪ *Negara:* ${country}`,
    `▪ *Grup:* ${groupName}`,
    `▪ *Sisa Member:* ${memberCount}`,
    ...(customText ? [``, `💌 *PESAN PERPISAHAN*`, DIV, `▪ ${customText}`] : []),
    ``,
    `🎯 ${CTA_GOODBYE[Math.floor(Math.random() * CTA_GOODBYE.length)]}`,
  ].join("\n"));

  // KARTU CANVAS DALAM PREVIEW (request owner 16 Sep 2026, desain ulang 9 Okt
  // gaya promo telegram + teks Indonesia Title Case): kartu goodbye + pesan
  // apresiasi random buatan AI digambar canvas → ditanam di PREVIEW
  // (externalAdReply), bukan media langsung → gak bisa disimpan ke galeri.
  let ppBuffer = null;
  try {
    const ppUrl = await sock.profilePictureUrl(participantJid, "image");
    if (ppUrl) {
      const res = await fetch(ppUrl);
      if (res.ok) ppBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {}

  // Pesan apresiasi: AI (rantai rara, maks 20 dtk) → fallback template random
  let apresiasi = null;
  try {
    const { apresiasiOrTemplate } = await import("../../src/lib/rara-welcome-canvas.js");
    apresiasi = await apresiasiOrTemplate(displayName, groupName);
  } catch (e) {
    console.error("goodbye apresiasi error:", e);
  }

  try {
    const { generateGoodbyeCard } = await import("../../src/lib/rara-welcome-canvas.js");
    const { levelPreviewThumb } = await import("../../src/lib/rara-level.js");
    const card = await generateGoodbyeCard({
      groupName, ppBuffer, name: displayName, apresiasi: apresiasi || "Sampai jumpa lagi suatu hari nanti.",
    });
    const thumb = await levelPreviewThumb(card);
    await sock.sendMessage(groupJid, {
      text: engineText,
      mentions: [participantJid],
      contextInfo: {
        mentionedJid: [participantJid],
        forwardingScore: 0, isForwarded: false,
        externalAdReply: {
          title: "Sampai Jumpa!",
          body: groupName,
          thumbnail: thumb,
          previewType: "PHOTO",
          showAdAttribution: false,
          renderLargerThumbnail: true,
        },
      },
    });
    return;
  } catch (e) {
    console.error("goodbye card error:", e);
  }

  // Fallback berjenjang: canvas/preview gagal → foto profil + caption (perilaku
  // lama) → teks polos. Pesan tidak pernah hilang.
  if (ppBuffer) {
    try {
      const card = await dlCard("gambar", { buffer: ppBuffer }, [["Engine", "WhatsApp CDN"], ["Tipe", "Foto Profil Member"], ["Konteks", "Member Keluar"]]);
      await sock.sendMessage(groupJid, {
        image: ppBuffer,
        caption: card ? `${engineText}\n\n${card}` : engineText,
        mentions: [participantJid],
      });
      return;
    } catch (e) {
      console.error("goodbye image fallback error:", e);
    }
  }

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
