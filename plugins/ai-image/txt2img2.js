// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { Txt2Img2 } from "../../src/scraper/txt2img2.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "txt2img2",
  alias: ["txt2img2"],
  category: 'ai image',
  description: "Buat gambar dari teks pakai Flux Klein 4B",
  usage: ".txt2img2 <deskripsi gambar>",
  example: ".txt2img2 Mobil Lamborghini revuelto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(raraGuideV2("txt2img2", {
 kaomoji: "(•̀ᴗ•́)و",
 sapaan: "bikin gambar dari teks pakai AI Flux Klein 4B, hasilnya tajam! (๑•̀ㅂ•́)و✧",
      cara: "ketik deskripsi gambar yang mau dibuat",
      contoh: m.prefix + "txt2img2 Mobil Lamborghini revuelto",
      note: "proses generate agak lama, sekitar 30-60 detik",
      spec: ["⚡ energi 3", "⏱ 30dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await Txt2Img2(text);

    if (!result.status) {
      { return await m.reply(raraWrap(m.command, result.error || "Generate gagal, coba lagi ya", "error")); };
    }

    await sock.sendMedia(m.chat, result.url, `🎨 *Flux Klein 4B*\n\nPrompt: *${result.prompt}*`, m, {
      type: "image",
    });
  } catch (e) {
    console.error(e);
    m.reply(raraError("Txt2Img2", "❌ Gagal generate gambar, coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
