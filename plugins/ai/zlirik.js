// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zlirik — AI Lyrics Generator via zelapi.eu.cc /ai-generate (suite z)
// 🔹 Owner 14 Sep: minta "AI Music Generator" — dites live, suno/sunora/
//    melody/remusic (music generator ASLI, keluar AUDIO) SEMUA MATI di zelapi
//    (Not found / HTTP 400 / HTTP 400 / timeout). Yang beneran hidup cuma
//    generator LIRIK TEKS (lyricsai + ailyrics) — jadi fitur ini JUJUR nulis
//    "generator lirik", BUKAN generator lagu/audio beneran.
// 🔹 CATATAN: bot udah punya `.lirikai` (Gemini, lebih fleksibel) — fitur ini
//    SENGAJA dipisah nama `.zlirik` biar gak bentrok/dobel sama fitur lama.
// 🔹 STRICT: endpoint mati → error asli, no fallback.
// ═════════════════════════════════════════════

import { zelLyrics, _setZelHttpForTest, _setZelKeyForTest } from "../../src/scraper/zelapi.js";
import { raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";

export { _setZelHttpForTest, _setZelKeyForTest };

const pluginConfig = {
  name: "zlirik",
  alias: ["zlirik", "zlyrics", "zbuatlirik"],
  category: "ai",
  description: "Generator lirik lagu AI dari zelapi (prefix z) — bikin lirik dari topik/tema",
  usage: ".zlirik <topik> | genre/mood opsional pakai pipe: .zlirik <topik> | <genre> | <mood>",
  example: ".zlirik kehilangan sahabat | pop | sedih",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 1, isEnabled: true,
};

async function handler(m) {
  try {
    const raw = (m.args || []).join(" ").trim();
    const usage = () => raraGuideV2("zlirik", {
 kaomoji: "(๑´ㅂ`๑)",
 sapaan: "generator lirik AI — bikin lirik lagu dari topik bebas! (◍•ᴗ•◍)",
      cara: "ketik topiknya, genre & mood opsional pakai pemisah |",
      contoh: `${m.prefix}zlirik cinta yang tak terbalas | pop | sedih`,
      note: "ini lirik teks doang, bukan lagu/audio beneran · mau lebih fleksibel coba .lirikai",
      spec: ["⚡ energi 1", "⏱ 20dtk", "💸 gratis"],
    });
    if (!raw) return m.reply(usage());

    const parts = raw.split("|").map((s) => s.trim());
    const [topic, genre, mood] = parts;
    if (!topic) return m.reply(usage());

    await m.react("🧠");
    // ailyrics support genre+emotion lengkap → dicoba duluan, fallback lyricsai (cuma topic+style)
    let r = await zelLyrics("ailyrics", { theme: topic, genre, emotion: mood });
    if (!r.ok) r = await zelLyrics("lyricsai", { topic, style: genre });

    if (!r.ok) {
      await m.react("❌");
      const map = { API_KEY: "⚠️ Key zelapi belum di-set — owner isi apikeys.json slot *zelapi*." };
      return m.reply(raraWrap("zlirik", map[r.error] || `❌ *GAGAL: ${r.error}*`));
    }
    await m.react("🐣");

    return m.reply(raraWrap("zlirik",
      `🎵 *${r.title}*${r.genre && r.genre !== "-" ? ` (${r.genre})` : ""}\n\n${r.lyrics.slice(0, 3500)}\n\n` +
      `_(generator lirik teks zelapi — belum ada audio)_`));
  } catch (err) {
    console.error("[zlirik]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("zlirik", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig, handler, pluginConfig as config };
export default { pluginConfig, handler };
