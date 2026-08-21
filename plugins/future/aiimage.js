// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aiimagev2", alias: ["aigen", "texttoimage", "generateimage"], category: "future",
  description: "Generate gambar dari teks dengan AI", usage: ".aiimage <deskripsi>",
  example: ".aiimage kucing astronaut di bulan", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const prompt = m.text?.trim();
    if (!prompt) {
      await sendReplyWithNav(sock, m, claraWrap("AI Image", [`╎❏ Penggunaan: *${prefix}aiimage <deskripsi>*`,
        `╎❏ Contoh: *${prefix}aiimage kucing astronaut*`,
        "╎❏ AI akan generate gambar dari teks"].join("\n")), "aiimage");
      return { handled: true };
    }
    { const __navText = "_🎨 Generating gambar... mohon tunggu_"; await m.reply(__navText); };
    const { data } = await axios.get("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt), {
      timeout: 60000, responseType: "arraybuffer",
    });
    await sock.sendMessage(m.key.remoteJid, { image: Buffer.from(data), caption: claraWrap("AI Image", [`╎❏ Prompt: *${prompt.substring(0,60)}*`].join("\n")) }, { quoted: m });
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`╎❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };