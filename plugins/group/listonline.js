// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "listonline",
  alias: ["listonline", "liston"],
  category: "group",
  description: "Cek daftar member yang sedang online/aktif di grup",
  usage: ".listonline",
  example: ".listonline",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
}

async function handler(m, { sock, conn, args }) {
  // Wajib di grup
  if (!m.isGroup) {
    await m.reply(raraWrap("List Online", "❗ Command ini hanya bisa dipakai di grup.", "warn"));
    return;
  }

  try {
    const store = sock.store || conn?.store || {};
    const presences = store?.presences?.[m.chat];

    if (!presences || Object.keys(presences).length === 0) {
      await m.reply(raraWrap("List Online", "💤 Tidak ada data aktivitas yang terdeteksi saat ini.", "info"));
      return;
    }

    const botNum = (sock.user?.id || "").replace(/@.+/g, "");
    const onlineJids = Object.keys(presences).filter(jid => jid !== botNum && !jid.startsWith("0@"));

    if (onlineJids.length === 0) {
      await m.reply(raraWrap("List Online", "💤 Tidak ada member lain yang terlihat aktif.", "info"));
      return;
    }

    // Ambil nama grup
    let groupName = "Grup";
    try {
      const meta = m.groupMetadata || (await sock.groupMetadata(m.chat));
      groupName = meta?.subject || "Grup";
    } catch {}

    // Format daftar online
    const lines = [];
    lines.push(`👥 ${toSC("Grup")}: ${groupName}`);
    lines.push(`📊 ${toSC("Terdeteksi")}: ${onlineJids.length} ${toSC("member aktif")}`);
    lines.push("");

    const mentions = [];

    for (let i = 0; i < onlineJids.length; i++) {
      const jid = onlineJids[i];
      const presence = presences[jid];
      let status = "Online";

      if (presence?.lastKnownPresence === "composing") status = "Mengetik...";
      else if (presence?.lastKnownPresence === "recording") status = "Merekam...";
      else if (presence?.lastKnownPresence === "available") status = "Online";
      else if (presence?.lastKnownPresence === "unavailable") status = "Offline";

      const num = jid.split("@")[0];
      mentions.push(jid);
      lines.push(`${i + 1}. @${num}`);
      lines.push(`   ${toSC("Status")}: ${toSC(status)}`);
    }

    const teks = raraWrap("List Online", lines, "success");

    // Kirim dengan mentions + contextInfo
    await sock.sendMessage(m.chat, {
      text: teks,
      mentions: mentions,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: config.bot?.name || "Rara AI",
          body: `Mendeteksi ${onlineJids.length} aktivitas terbaru`,
          thumbnailUrl: config.bot?.thumbnailUrl || "",
          sourceUrl: config.info?.website || "",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    }, { quoted: m });
  } catch (e) {
    console.error("[listonline] Error:", e.message);
    await m.reply(raraWrap("List Online", "❌ Terjadi kesalahan teknis saat mengecek daftar online.", "error"));
  }
}

export { pluginConfig as config, handler };
