// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// suaraai — TTS natural multi-bahasa 42 voice (Haidar text2speech/voiser)
// Indonesia: Gadis/Ardi/Siti/Dimas/Tuti/Jajang — Jepang: Aoi/Daichi/Mayu dll —
// Korea: BongJin/JiMin dll — Inggris: Mia/Olivia dll.
// Fallback seleb voice (Taylor Swift, Goku, dll): .aivoiceceleb (KuroNeko).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { haidarTTS, HAIDAR_VOICES } from "../../src/scraper/haidar-ai.js";

const VOICE_GROUPS = {
  "🇮🇩 Indonesia": ["Gadis", "Ardi", "Siti", "Dimas", "Tuti", "Jajang"],
  "🇯🇵 Jepang": ["Aoi", "Daichi", "Mayu", "Naoki", "Shiori", "Nanami", "Keita"],
  "🇰🇷 Korea": ["BongJin", "GookMin", "Hyunsu", "JiMin", "SeoHyeon", "SoonBok", "YuJin", "SunHi", "InJoon"],
  "🇬🇧 Inggris": ["Abbi", "Bella", "Hollie", "Maisie", "Mia", "Olivia", "Alfie", "Elliot", "Ethan", "Noah"],
  "🇦🇪 Arab": ["Meryem", "Ibrahim"],
  "✨ Unik": ["Algenib", "Despina", "Enceladus", "Ava", "Marcello", "William", "Ash", "Sage"],
};

const pluginConfig = {
  name: "suaraai",
  alias: ["ttsai", "voiceai", "suaraaivip"],
  category: "ai",
  description: "AI voice natural 42 suara multi-bahasa — Gadis, Siti, Aoi (JP), JiMin (KR), dll",
  usage: ".suaraai <voice> <teks>\n.suaraai list",
  example: ".suaraai siti halo semua apa kabar\n.suaraai aoi konnichiwa minna",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();

  if (!sub || sub === "list" || sub === "voices") {
    const groups = Object.entries(VOICE_GROUPS)
      .map(([g, vs]) => `${g}: ${vs.map((v) => `*${v}*`).join(", ")}`)
      .join("\n\n");
    return m.reply(novaWrap("suaraai",
      `AI voice natural ${HAIDAR_VOICES.length} suara!\n\nCARA PAKAI:\n${m.prefix}suaraai <voice> <teks>\n\n${groups}\n\nContoh: ${m.prefix}suaraai siti halo semua apa kabar?\n\nMau suara selebritas (Taylor Swift, Goku, Eminem)? Pakai ${m.prefix}aivoiceceleb`, "guide"));
  }

  // voice case-insensitive
  const voice = HAIDAR_VOICES.find((v) => v.toLowerCase() === sub) || null;
  const text = (voice ? args.slice(1) : args).join(" ").trim();

  if (!voice) {
    return m.reply(novaWrap("suaraai", `Voice *${sub}* gak ada!\n\nKetik ${m.prefix}suaraai list buat daftar ${HAIDAR_VOICES.length} voice\nContoh: ${m.prefix}suaraai siti halo semua`, "guide"));
  }
  if (!text) {
    return m.reply(novaWrap("suaraai", `Kasih teksnya!\n\nContoh: ${m.prefix}suaraai ${voice} halo semuanya apa kabar`, "guide"));
  }

  try {
    await m.react("🕒");
    const audioUrl = await haidarTTS(text, voice);
    const axios = (await import("axios")).default;
    const res = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 60000 });
    const buf = Buffer.from(res.data);
    if (!buf || buf.length < 3000) throw new Error("file audio kosong");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      audio: buf,
      mimetype: "audio/mpeg",
      ptt: true,
    }, { quoted: m });
  } catch (err) {
    console.error("suaraai error:", err);
    await m.react("❌");
    return m.reply(novaWrap("suaraai", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
