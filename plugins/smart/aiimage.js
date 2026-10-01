// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "aiimagev2", alias: ["aiimagev2", "aiimage"], category: "smart",
  alias: ["aiimagev2", "aiimage"],
  description: "Generate gambar dari teks dengan AI", usage: ".aiimage <deskripsi>",
  example: ".aiimage kucing astronaut di bulan", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const prompt = m.text?.trim();
    if (!prompt) {
      await m.reply( raraCaption({
  emoji: "🖼️",
  name: "aiimagev2",
  description: "Generate gambar dari teks dengan AI",
  usage: `${prefix}aiimage <deskripsi>`,
  example: `${prefix}aiimage kucing astronaut di bulan`,
}), "aiimage");
      return { handled: true };
    }
    { };
    const { data } = await axios.get("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt), {
      timeout: 60000, responseType: "arraybuffer",
    });
    await sock.sendMessage(m.key.remoteJid, { image: Buffer.from(data), caption: raraWrap("AI Image", [`Prompt: *${prompt.substring(0,60)}*`].join("\n")) }, { quoted: m });
  } catch (e) {
    await m.reply(raraError("AIImage", e.message || "Gagal nih"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };