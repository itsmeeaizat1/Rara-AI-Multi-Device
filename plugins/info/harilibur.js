// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";

import {  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "harilibur",
  alias: ["harilibur", "libur", "harinasional"],
  category: "info",
  description: "Menampilkan informasi hari libur dan hari nasional mendatang",
  usage: ".harilibur",
  example: ".harilibur",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  await m.react("🕒");

  try {
    const res = await axios.get("https://api.nexray.eu.cc/information/hari-libur", {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(claraWrap("harilibur", "⚠️ Gagal mengambil informasi hari libur saat ini."));
    }

    const r = data.result;
    let caption = `📅 *HARI LIBUR & NASIONAL MENDATANG* 📅\n\n`;

    if (r.mendatang.hari_libur && r.mendatang.hari_libur.length > 0) {
      caption += `*ʜᴀʀɪ ʟɪʙᴜʀ ᴍᴇɴᴅᴀᴛᴀɴɢ*\n`;
      r.mendatang.hari_libur.slice(0, 5).forEach(item => {
        caption += `- ${item.date}: ${item.event} (${item.daysUntil} hari lagi)\n`;
      });
      caption += `\n`;
    }

    if (r.mendatang.event_nasional && r.mendatang.event_nasional.length > 0) {
      caption += `*ʜᴀʀɪ ɴᴀꜱɪᴏɴᴀʟ ᴍᴇɴᴅᴀᴛᴀɴɢ*\n`;
      r.mendatang.event_nasional.slice(0, 5).forEach(item => {
        caption += `- ${item.date}: ${item.event} (${item.daysUntil} hari lagi)\n`;
      });
    }

    { const __navText = claraWrap(caption.trim().split("\n").filter(l => l.trim())); await m.reply(__navText); };
    await m.react("🐣");

  } catch (error) {
    console.error("[Hari Libur]", error.message);
    m.reply(claraWrap("harilibur", "😔 Terjadi kesalahan saat mengambil data hari libur."));
  }
}

export { pluginConfig as config, handler };
