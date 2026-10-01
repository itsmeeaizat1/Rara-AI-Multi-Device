// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// doggo.js — Random dog photo
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "doggo",
  alias: ["doggo", "dog", "anjing"],
  category: "misc",
  description: "Random foto anjing lucu",
  usage: ".doggo",
  example: ".doggo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const res = await axios.get("https://dog.ceo/api/breeds/image/random");
    if (!res.data?.message) throw new Error("Gagal mengambil gambar");
    await sock.sendMessage(from, { image: { url: res.data.message }, caption: "🐶 Woof!" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("doggo error:", err);
    await m.react("❌");
    return m.reply(novaWrap("doggo", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
