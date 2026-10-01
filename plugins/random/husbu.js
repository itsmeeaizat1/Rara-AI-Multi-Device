// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraHeader, separator, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";
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
    if (!data?.url) throw new Error("Gagal ambil nih gambar");
    await sock.sendMessage(m.key.remoteJid, { image: { url: data.url }, caption: raraWrap("Husbu", "") }, { quoted: m });
  } catch (e) {
    await m.reply(raraWrap("husbu", "Error: " + e.message, "error"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };