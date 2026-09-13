// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";

import { novaError, novaEmpty, novaGuide, novaNoInput,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
import { computeNextMidnightWib, buildLiburHeader, buildLiburCard } from "../../src/lib/nova-libur-card.js";

const pluginConfig = {
  name: "harilibur",
  alias: ["harilibur"],
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
  try {
    const res = await axios.get("https://api.nexray.eu.cc/information/hari-libur", {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(novaError("HariLibur", "Gagal ambil info hari libur nih"));
    }

    const r = data.result;

    // ⏳ PENGHITUNG (13 Sep 2026): header libur terdekat / hari ini + ticker live
    const hariIni = r.hari_ini || {};
    const liburTerdekat = (r.mendatang?.hari_libur || [])[0] || null;
    const nasionalTerdekat = (r.mendatang?.event_nasional || [])[0] || null;
    const header = buildLiburHeader(hariIni, liburTerdekat);

    let caption = `📅 *HARI LIBUR & NASIONAL MENDATANG* 📅\n\n`;
    if (header) {
      caption += header + "\n\n";
    }

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

    { const __navText = claraWrap(caption.trim().split("\n")); await m.reply(__navText); };

    // libur besok (daysUntil <= 1) → ticker live sampai tengah malam D-day
    if (liburTerdekat && liburTerdekat.event && Number(liburTerdekat.daysUntil) <= 1 && !(hariIni.events || []).length) {
      const targetTs = computeNextMidnightWib();
      runLiveTicker({
        sock,
        chat: m.chat,
        m,
        initialCard: buildLiburCard(liburTerdekat.event, targetTs - Date.now()),
        tickCard: (st) => buildLiburCard(liburTerdekat.event, st.remainingMs),
        mode: "down",
        targetTs,
      }).catch(() => {});
    }
  } catch (error) {
    console.error("[Hari Libur]", error.message);
    m.reply(novaError("HariLibur", "Ada error nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
