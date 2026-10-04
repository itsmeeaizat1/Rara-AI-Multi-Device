// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aivideo — TEXT → VIDEO AI (KuroNeko text2vid, engine sora) — GENERATOR
// VIDEO AI PERTAMA di bot! Key: apikeys.json kuroneko.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";
import te from "../../src/lib/rara-error.js";
import { haidarTxt2vid } from "../../src/scraper/haidar-ai.js";

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
    return m.reply(raraWrap("aivideo", `Bikin video AI dari teks!\n\nContoh: ${m.prefix}aivideo kucing astronot berjalan di bulan\n${m.prefix}aivideo ombak besar di pantai saat senja\n\nProses 1-3 menit, sabar ya 🎬`, "guide"));
  }
  try {
    await m.react("🕒");
    // Engine utama: Haidar txt2vid (sora) — fallback: KuroNeko
    let videoUrl = null;
    try {
      videoUrl = await haidarTxt2vid(prompt);
    } catch (eh) {
      console.error("[aivideo] haidar down:", eh.message);
      const { text2vid: knVid } = await import("../../src/scraper/kuroneko.js");
      videoUrl = await knVid(prompt);
    }
    const axios = (await import("axios")).default;
    const vres = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 120000 });
    const buf = Buffer.from(vres.data);
    if (!buf || buf.length < 20000) throw new Error("file video kosong");

    await m.react("🐣");
    let caption = raraWrap("aivideo", "🎬 Video AI berhasil dibuat!");
    try {
      const info = await probeBuffer(buf);
      const card = mediaResultCard({
        header: "aivideo",
        request: [["Engine", "Haidar txt2vid"], ["Prompt", String(prompt).slice(0, 80)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height, duration: info.duration,
      });
      if (card) caption = card;
    } catch {}
    await sock.sendMessage(m.chat, {
      video: buf,
      caption,
      gifplayback: false,
    }, { quoted: m });
  } catch (err) {
    console.error("aivideo error:", err);
    await m.react("❌");
    return m.reply(raraWrap("aivideo", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
