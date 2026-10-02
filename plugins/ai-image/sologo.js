// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "sologo",
  alias: ["sologo"],
  category: 'ai image',
  description: "Membuat logo menggunakan AI dari teks (prompt)",
  usage: ".sologo <prompt>",
  example: ".sologo Kucing lucu warna biru",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.text?.trim() || m.args.join(" ");

  if (!prompt) {
        return m.reply(raraGuide("sologo", {
 kaomoji: "(¬‿¬)✧",
 sapaan: "bikin logo dari deskripsi teks, hasilnya clean! (⌒‿⌒)",
      cara: "ketik deskripsi logo yang mau dibuat",
      contoh: `${m.prefix}sologo robot keren warna merah`,
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }), "sologo");
  }
  try {
  await m.react("🕒");
    const apiUrl = `https://api.nexray.eu.cc/ai/sologo?prompt=${encodeURIComponent(prompt)}`;
    const res = await axios.get(apiUrl, {
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result || data.result.length === 0) {
      return m.reply(raraError("SoLogo", "⚠️ AI gagal membuat logo. Coba gunakan prompt (deskripsi) yang lain."));
    }

    const logo = data.result[0];

    const caption = `🎨 *SOLOGO AI* 🎨\n\n` +
      `*Prompt:* ${prompt}\n` +
      `*Judul:* ${logo.title}\n` +
      `*Deskripsi:* ${logo.desc}\n` +
      `*Tipe:* ${logo.logo_type || "origin"}`;

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: { url: logo.thumbnail },
      caption: caption
    }, { quoted: m });
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(prompt?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[sologo.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("[SoLogo AI]", error.message);
    m.reply(raraError("SoLogo", "😔 Terjadi kesalahan saat memproses permintaan ke AI."));
  }
}

export { pluginConfig as config, handler };
