// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// teraboxv2.js — Download TeraBox v2 (pakai scraper terabox.js lokal)
import { TeraBoxDL } from "../../src/scraper/terabox.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "teraboxv2",
  alias: ["teraboxv2", "tbdl2", "tb2"],
  category: "download",
  description: "Download dari TeraBox v2 (scraper lokal)",
  usage: ".teraboxv2 <url_terabox>",
  example: ".teraboxv2 https://terabox.com/s/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || (!url.includes("terabox") && !url.includes("teraboxapp"))) {
      return m.reply(novaGuide("TeraBox v2", "Kirim URL TeraBox yang valid!", ".teraboxv2 https://terabox.com/s/xxx"));
    }

    await m.react("🕒");

    const result = await TeraBoxDL(url);
    if (!result || result.status === false || result.error) {
      await m.react("❌");
      return m.reply(novaError("TeraBox v2", result?.error || "Gagal download dari TeraBox!"));
    }

    const dlUrl = result.download || result.url || result.dl;
    if (!dlUrl) {
      await m.react("❌");
      return m.reply(novaError("TeraBox v2", "Link download tidak ditemukan!"));
    }

    const axios = (await import("axios")).default;
    const fileRes = await axios.get(dlUrl, {
      responseType: "arraybuffer", timeout: 120000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(fileRes.data);

    const caption = mediaCaption({
      platformIcon: "📁",
      platformName: "TeraBox",
      title: result.title || result.filename || "TeraBox File",
      format: result.type || "File",
      method: "Scraper Lokal",
    });

    // Cek apakah video atau file
    const isVideo = (result.type || result.filename || "").match(/mp4|avi|mkv|mov/i);
    if (isVideo) {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        document: buffer,
        fileName: result.title || result.filename || "terabox_file",
        mimetype: result.mimetype || "application/octet-stream",
        caption,
      }, { quoted: m });
    }

    await m.react("🐣");
    await m.reply(novaBerhasil("teraboxv2"));
  } catch (err) {
    console.error("[TeraBox v2]", err);
    await m.react("❌");
    m.reply(novaGagal("TeraBox v2"));
  }
}

export { pluginConfig as config, handler };
