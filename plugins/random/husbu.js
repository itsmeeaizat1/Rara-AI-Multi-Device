// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "husbu", alias: ["husbu"], category: "random",
  alias: ["husbu"],
  description: "Random husbu image", usage: ".husbu",
  example: ".husbu", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const { data } = await axios.get("https://api.waifu.pics/sfw/husbando", { timeout: 10000 });
    if (!data?.url) throw new Error("Gagal mengambil gambar");
    await sock.sendMessage(m.key.remoteJid, { image: { url: data.url }, caption: claraWrap("Husbu", "✨") }, { quoted: m });
  } catch (e) {
    await m.reply(claraWrap("husbu", "Error: " + e.message, "error"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };