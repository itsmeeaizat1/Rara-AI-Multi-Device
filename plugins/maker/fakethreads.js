// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { nexrayFakeThreads } from "../../src/scraper/nexray-maker.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "fakethreads",
  alias: ["fakethreads", "faketread", "fakethread"],
  category: "maker",
  description: "Fake Threads screenshot generator",
  usage: ".fakethreads <username> | <text>",
  example: ".fakethreads aizat | Halo semua, lagi apa?",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const input = m.args.join(" ").trim();
    if (!input || !input.includes("|")) {
      return m.reply(raraWrap("fakethreads", `Format: ${m.prefix}fakethreads <username> | <text>\n\nContoh: ${m.prefix}fakethreads aizat | Halo semua!`, "guide"));
    }
    const [username, ...textParts] = input.split("|");
    const text = textParts.join("|").trim();
    const usernameClean = username.trim().replace(/[@]/g, "");
    if (!usernameClean || !text) {
      return m.reply(raraWrap("fakethreads", "Username dan text tidak boleh kosong!", "error"));
    }

    await m.react("🕒");
    const likes = Math.floor(Math.random() * 9999) + 100;
    const replies = Math.floor(Math.random() * 100) + 1;
    const result = await nexrayFakeThreads(usernameClean, text, likes, replies);

    if (!result.status || !result.buffer) {
      await m.react("❌");
      return m.reply(raraWrap("fakethreads", "Gagal generate fake threads. Coba lagi.", "error"));
    }

    await m.react("🐣");
    const caption = `User: @${usernameClean}\nLikes: ${likes}\nReplies: ${replies}`;
    let card = "";
    try {
      const info = await probeBuffer(result.buffer);
      card = mediaResultCard({
        header: "fakethreads",
        type: "gambar",
        request: [["Username", usernameClean], ["Likes", likes], ["Replies", replies]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    return await sock.sendMessage(m.chat, { image: result.buffer, caption: (card || caption) });
  } catch (err) {
    console.error("fakethreads error:", err);
    await m.react("❌");
    return m.reply(raraWrap("fakethreads", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
