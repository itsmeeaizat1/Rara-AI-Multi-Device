// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/rara-uploader.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "tozombie",
  alias: ["tozombie"],
  aliases: ["tozombie"],
  category: "convert",
  description: "Efek zombie pada gambar",
  usage: ".tozombie (reply gambar)",
  example: ".tozombie",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) return m.reply(raraWrap("tozombie", "Reply gambar dengan caption .tozombie untuk efek zombie.", "guide"));

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) mediaBuffer = await m.download();
    else if (m.quoted && m.quoted.download) mediaBuffer = await m.quoted.download();
    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) { await m.react("❌"); return m.reply(raraWrap("tozombie", "Gagal mengunduh gambar.")); }

    const link = await uploadToCatbox(mediaBuffer, "image.jpg");
    const apiUrl = `https://api-faa.my.id/faa/zombie?url=${encodeURIComponent(link)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });
    const ct = res.headers["content-type"] || "";

    let imgBuffer;
    if (ct.startsWith("image/")) {
      imgBuffer = Buffer.from(res.data);
    } else {
      const json = JSON.parse(res.data.toString());
      const imageUrl = json.url || json.result || json.image || json.data?.url || json.data;
      if (!imageUrl) { await m.react("❌"); return m.reply(raraWrap("tozombie", "API tidak mengembalikan gambar.")); }
      const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });
      imgBuffer = Buffer.from(img.data);
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "🧟 Kamu jadi zombie!" }, { quoted: m });
    await m.reply(raraBerhasil("tozombie"));
  } catch (e) {
    console.error("tozombie error:", e.message);
    await m.react("❌");
    m.reply(raraGangguan("tozombie"));
  }
}

export { pluginConfig as config, handler };
