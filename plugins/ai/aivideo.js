// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aivideo — TEXT → VIDEO AI (KuroNeko text2vid, engine sora) — GENERATOR
// VIDEO AI PERTAMA di bot! Key: apikeys.json kuroneko.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { text2vid } from "../../src/scraper/kuroneko.js";

const pluginConfig = {
  name: "aivideo",
  alias: ["text2vid", "texttovideo", "videai", "aivid"],
  category: "ai",
  description: "AI bikin VIDEO dari teks — generator video AI (text → mp4)",
  usage: ".aivideo <deskripsi>",
  example: ".aivideo kucing astronot berjalan di bulan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.args.join(" ").trim();
  if (!prompt) {
    return m.reply(claraWrap("aivideo", `Bikin video AI dari teks!\n\nContoh: ${m.prefix}aivideo kucing astronot berjalan di bulan\n${m.prefix}aivideo ombak besar di pantai saat senja\n\nProses 1-3 menit, sabar ya 🎬`, "guide"));
  }
  try {
    await m.react("🕒");
    const videoUrl = await text2vid(prompt);
    const axios = (await import("axios")).default;
    const vres = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 120000 });
    const buf = Buffer.from(vres.data);
    if (!buf || buf.length < 20000) throw new Error("file video kosong");

    await m.react("🐣");
    const caption = claraWrap("aivideo", `🎬 Video AI berhasil dibuat!\n\n📝 Prompt: *${prompt}*\n⚙️ Engine: KuroNeko text2vid (sora)\n📦 Ukuran: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
    await sock.sendMessage(m.chat, {
      video: buf,
      caption,
      gifplayback: false,
    }, { quoted: m });
  } catch (err) {
    console.error("aivideo error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aivideo", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
