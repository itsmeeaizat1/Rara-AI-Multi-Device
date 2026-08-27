// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "aiimagev2", alias: ["aiimagev2"], category: "future",
  alias: ["aiimagev2"],
  description: "Generate gambar dari teks dengan AI", usage: ".aiimage <deskripsi>",
  example: ".aiimage kucing astronaut di bulan", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const prompt = m.text?.trim();
    if (!prompt) {
      await m.reply( novaCaption({
  emoji: "📁",
  name: "aiimagev2",
  description: "Generate gambar dari teks dengan AI",
  usage: `${prefix}aiimage <deskripsi>`,
  example: `${prefix}aiimage kucing astronaut di bulan`,
}), "aiimage");
      return { handled: true };
    }
    { await m.react("🕒"); };
    const { data } = await axios.get("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt), {
      timeout: 60000, responseType: "arraybuffer",
    });
    await sock.sendMessage(m.key.remoteJid, { image: Buffer.from(data), caption: claraWrap("AI Image", [`│ Prompt: *${prompt.substring(0,60)}*`].join("\n")) }, { quoted: m });
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`│ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };