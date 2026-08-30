// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// googlesearch.js — Google search
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "googlesearch",
  alias: ["googlesearch", "gsearch", "google"],
  category: "download",
  description: "Google search",
  usage: ".googlesearch <query>",
  example: ".googlesearch cara membuat nasi goreng",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("googlesearch", `Masukkan kata kunci!\n\nContoh: .googlesearch cara membuat nasi goreng`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/google?q=${encodeURIComponent(query)}`);
    const data = res.data?.data || res.data?.result || [];
    if (!data.length) return m.reply(claraWrap("googlesearch", "Tidak ada hasil!", "error"));

    let msg = `╭──「 *GOOGLE SEARCH* 」\n`;
    msg += `│ Query: ${query}\n`;
    msg += `│\n`;
    data.slice(0, 5).forEach((item, i) => {
      msg += `│ ${i + 1}. ${item.title || "Unknown"}\n`;
      if (item.desc) msg += `│    ${item.desc.substring(0, 100)}\n`;
      if (item.url) msg += `│    ${item.url}\n`;
      msg += `│\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("googlesearch error:", err);
    await m.react("❌");
    return m.reply(claraWrap("googlesearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
