// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraHeader, separator, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "waifu", alias: ["waifu"], category: "random",
  alias: ["waifu"],
  description: "Random waifu image", usage: ".waifu",
  example: ".waifu", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const { data } = await axios.get("https://api.waifu.pics/sfw/waifu", { timeout: 10000 });
    if (!data?.url) throw new Error("Gagal ambil nih gambar");
    await sock.sendMessage(m.key.remoteJid, { image: { url: data.url }, caption: raraWrap("Waifu", "") }, { quoted: m });
  } catch (e) {
    await m.reply(raraWrap("waifu", "Error: " + e.message, "error"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };