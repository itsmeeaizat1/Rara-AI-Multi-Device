// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/rara-uploader.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "tojepang",
  alias: ["tojepang"],
  aliases: ["tojepang"],
  category: "convert",
  description: "Efek jepang pada gambar",
  usage: ".tojepang (reply gambar)",
  example: ".tojepang",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) return m.reply(raraWrap("tojepang", "Reply gambar dengan caption .tojepang untuk efek jepang.", "guide"));

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) mediaBuffer = await m.download();
    else if (m.quoted && m.quoted.download) mediaBuffer = await m.quoted.download();
    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) { await m.react("❌"); return m.reply(raraWrap("tojepang", "Gagal mengunduh gambar.")); }

    const link = await uploadToCatbox(mediaBuffer, "image.jpg");
    const apiUrl = `https://api-faa.my.id/faa/jepang?url=${encodeURIComponent(link)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });
    const ct = res.headers["content-type"] || "";

    let imgBuffer;
    if (ct.startsWith("image/")) {
      imgBuffer = Buffer.from(res.data);
    } else {
      const json = JSON.parse(res.data.toString());
      const imageUrl = json.url || json.result || json.image || json.data?.url || json.data;
      if (!imageUrl) { await m.react("❌"); return m.reply(raraWrap("tojepang", "API tidak mengembalikan gambar.")); }
      const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });
      imgBuffer = Buffer.from(img.data);
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "🗾 Kamu sudah di Jepang!" }, { quoted: m });
    await m.reply(mediaInfoCaption({ header: "Jepang", fields: [
      { label: "Efek", value: "Gaya Jepang" },
      { label: "Hasil", value: "Gambar" }, { label: "Ukuran", value: (imgBuffer.length / 1024).toFixed(1) + " KB" },
    ] }));
    await m.reply(raraBerhasil("tojepang"));
  } catch (e) {
    console.error("tojepang error:", e.message);
    await m.react("❌");
    m.reply(raraGangguan("tojepang"));
  }
}

export { pluginConfig as config, handler };
