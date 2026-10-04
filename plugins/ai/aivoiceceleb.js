// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aivoiceceleb — TTS suara SELEBRITAS & KARAKTER (KuroNeko)
// 12 voice: nahida, nami, ana, taylor_swift, elon_musk, angela_adkinsh,
// eminem, miku, optimus_prime, goku, mickey_mouse, kendrick_lamar
// Key: apikeys.json kuroneko.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import te from "../../src/lib/rara-error.js";
import { celebTTS, celebVoiceList } from "../../src/scraper/kuroneko.js";

const pluginConfig = {
  name: "aivoiceceleb",
  alias: ["voiceceleb", "ttsceleb", "suaraseleb", "celebtts"],
  category: "ai",
  description: "AI voice suara selebritas & karakter — Taylor Swift, Elon Musk, Goku, Hatsune Miku, Eminem, dll",
  usage: ".aivoiceceleb <voice> <teks>\n.aivoiceceleb list",
  example: ".aivoiceceleb elon_musk halo semuanya\n.aivoiceceleb goku ayo latihan!",
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

  try {
    await m.react("🕒");

    // daftar voice
    if (!sub || sub === "list" || sub === "voices") {
      let voices = [];
      try {
        const models = await celebVoiceList();
        voices = models.map((v) => `• *${v.id}* — ${v.name}`);
      } catch {
        voices = ["• gagal ambil daftar — coba lagi nanti"];
      }
      return m.reply(raraWrap("aivoiceceleb",
        `Suara AI selebritas & karakter!\n\nCARA PAKAI:\n${m.prefix}aivoiceceleb <voice> <teks>\n\nDAFTAR VOICE (${voices.length}):\n${voices.join("\n")}\n\nContoh: ${m.prefix}aivoiceceleb taylor_swift halo apa kabar semua?`, "guide"));
    }

    const voice = sub;
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      await m.react("❌");
      return m.reply(raraWrap("aivoiceceleb", `Kasih teksnya!\n\nContoh: ${m.prefix}aivoiceceleb ${voice} halo semuanya apa kabar\n\nKetik ${m.prefix}aivoiceceleb list buat daftar voice`, "guide"));
    }

    const audioUrl = await celebTTS(text, voice);
    const axios = (await import("axios")).default;
    const res = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 60000 });
    const buf = Buffer.from(res.data);
    if (!buf || buf.length < 5000) throw new Error("file audio kosong");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      audio: buf,
      mimetype: "audio/wav",
      ptt: true,
    }, { quoted: m });
    // Kartu info (audio gak bisa caption) — kirim sebagai teks setelah voice note
    try {
      const info = await probeBuffer(buf, { mime: "audio/wav" });
      const card = mediaResultCard({
        header: "voiceceleb",
        request: [["Engine", "KuroNeko seleb TTS"], ["Voice", (m.args || [])[0] || "-"]],
        size: info.size, mime: info.mime, duration: info.duration,
      });
      if (card) await m.reply(card);
    } catch {}
  } catch (err) {
    console.error("aivoiceceleb error:", err);
    await m.react("❌");
    return m.reply(raraWrap("aivoiceceleb", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
