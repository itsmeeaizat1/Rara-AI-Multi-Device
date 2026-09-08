// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tinyurl",
  alias: ["tinyurl", "short"],
  category: "browser",
  description: "Mempersingkat URL / link menggunakan TinyURL",
  usage: ".tinyurl <url>",
  example: ".tinyurl https://google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    let url = m.args?.join(" ").trim() || (m.quoted && (m.quoted.text || m.quoted.caption));
    if (!url) {
      return m.reply(claraWrap("tinyurl", `Masukkan URL yang ingin dipersingkat!\n\nContoh: ${m.prefix}tinyurl https://google.com`, "guide"));
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    await m.react("🕒");

    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      timeout: 10000,
    });

    const shortUrl = res.data;

    if (!shortUrl || typeof shortUrl !== "string" || !shortUrl.startsWith("http")) {
      await m.react("❌");
      return m.reply(claraWrap("tinyurl", "Gagal memperpendek URL. Pastikan URL valid."));
    }

    await m.react("🐣");

    let result = "";
    result += `Original: ${url}\n`;
    result += `Short URL: ${shortUrl.trim()}\n`;
        return m.reply(result);
  } catch (err) {
    console.error("tinyurl error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tinyurl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
