// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "aivoicefuture", alias: ["aivoice2", "aivoicefuture", "ttsaifuture"], category: "future",
  alias: ["aivoicefuture"],
  description: "Text ke suara realistik multi-bahasa", usage: ".aivoice <text>",
  example: ".aivoice halo semuanya", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim();
    if (!text) {
      { const __navText = (claraWrap("AI Voice", [`│ ❏ Penggunaan: *${prefix}aivoice <text>*`,
        `│ ❏ Contoh: *${prefix}aivoice halo selamat datang*`].join("\n"))); await m.reply( __navText, "aivoice"); };
      return { handled: true };
    }
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;
    const { data } = await axios.get(url, { timeout: 15000, responseType: "arraybuffer", headers: {"User-Agent":"Mozilla/5.0"} });
    await sock.sendMessage(m.key.remoteJid, { audio: await toVoiceNote(Buffer.from(data)), mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: m });
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };