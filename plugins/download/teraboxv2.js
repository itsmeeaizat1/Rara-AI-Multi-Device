// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// teraboxv2.js — Terabox Downloader v2 (nekolabs + teraboxdl.site)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "teraboxv2",
  alias: ["teraboxv2", "tbx2", "teraboxdl2"],
  category: "download",
  description: "Download Terabox file v2 (nekolabs + teraboxdl.site)",
  usage: ".teraboxv2 <url Terabox>",
  example: ".teraboxv2 https://terabox.com/s/xxxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function tryNekolabs(url) {
  try {
    const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/terabox?url=${encodeURIComponent(url)}`, {
      timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (data && (data.status || data.success) && (data.result || data.data)) {
      return data.result || data.data;
    }
  } catch (e) {
    console.error("teraboxv2 nekolabs:", e.message);
  }
  return null;
}

async function tryTeraboxDl(url) {
  try {
    const { data } = await axios.post("https://teraboxdl.site/api/json-api", { url }, {
      timeout: 20000,
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (data && data.success !== false && (data.downloadLink || data.direct_link || data.dlink)) {
      return data;
    }
  } catch (e) {
    console.error("teraboxv2 teraboxdl.site:", e.message);
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/terabox\.com|teraboxapp\.com|1024terabox/i)) {
      return m.reply(claraWrap("teraboxv2", `Kirim URL Terabox yang valid.\n\nContoh: ${m.prefix}teraboxv2 https://terabox.com/s/xxxx`, "guide"));
    }

    await m.react("🕒");

    // Coba nekolabs dulu, fallback ke teraboxdl.site
    let r = await tryNekolabs(url);
    if (!r) r = await tryTeraboxDl(url);

    if (!r) {
      await m.react("❌");
      return m.reply(claraWrap("teraboxv2", "Gagal download. API mungkin down atau URL invalid.", "error"));
    }

    const fileUrl = r.direct_link || r.downloadLink || r.dlink || r.url || r.link;
    const fileName = r.filename || r.file_name || r.name || "file";
    const fileSize = r.size || r.file_size || "";

    if (!fileUrl) {
      await m.react("❌");
      return m.reply(claraWrap("teraboxv2", "Link download tidak ditemukan.", "error"));
    }

    await m.react("🐣");

    // Kirim link saja karena Terabox file biasanya besar
    let msg = `╭──「 *ᴛᴇʀᴀʙᴏx v2* 」\n`;
    msg += `│ File: *${fileName}*\n`;
    if (fileSize) msg += `│ Size: *${fileSize}*\n`;
    if (r.thumb || r.thumbnail) msg += `│ Thumbnail: ${r.thumb || r.thumbnail}\n`;
    msg += `│\n`;
    msg += `│ Download:\n${fileUrl}\n`;
    msg += `│ Engine: nekolabs + teraboxdl.site\n`;
    msg += `╰──────────`;

    // Kalau thumbnail ada, kirim dengan image
    if (r.thumb || r.thumbnail) {
      try {
        const imgUrl = r.thumb || r.thumbnail;
        if (imgUrl.startsWith("http")) {
          const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
          return await sock.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: msg });
        }
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("teraboxv2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("teraboxv2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
