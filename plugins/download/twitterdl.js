// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// twitterdl.js — Download video dari Twitter/X
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "twitterdl",
  alias: ["twitterdl", "twitter", "xdl", "twitdl"],
  category: "download",
  description: "Download video dari Twitter/X",
  usage: ".twitterdl <url_twitter>",
  example: ".twitterdl https://twitter.com/user/status/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const url = m.args?.[0]?.trim();
    if (!url || (!url.includes("twitter") && !url.includes("x.com"))) {
      return m.reply(claraWrap("twitterdl", `Masukkan URL Twitter/X!\n\nContoh: .twitterdl https://twitter.com/user/status/xxx`, "guide"));
    }

    const res = await axios.get(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`);
    const data = res.data?.data || res.data;
    const videoUrl = data?.url || data?.medias?.[0]?.url || data?.videos?.[0]?.url;
    if (!videoUrl) return m.reply(claraWrap("twitterdl", "Gagal mengambil video!", "error"));

    await sock.sendMessage(from, {
      video: { url: videoUrl },
      caption: "Twitter/X Video ~"
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("twitterdl error:", err);
    await m.react("❌");
    return m.reply(claraWrap("twitterdl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
