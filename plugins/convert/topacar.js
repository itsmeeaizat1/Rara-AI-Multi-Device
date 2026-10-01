// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/rara-uploader.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "topacar",
  alias: ["topacar"],
  aliases: ["topacar"],
  category: "convert",
  description: "Efek pacar pada gambar",
  usage: ".topacar (reply gambar)",
  example: ".topacar",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) return m.reply(raraWrap("topacar", "Reply gambar dengan caption .topacar untuk efek pacar.", "guide"));

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) mediaBuffer = await m.download();
    else if (m.quoted && m.quoted.download) mediaBuffer = await m.quoted.download();
    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) { await m.react("❌"); return m.reply(raraWrap("topacar", "Gagal mengunduh gambar.")); }

    const link = await uploadToCatbox(mediaBuffer, "image.jpg");
    const apiUrl = `https://api-faa.my.id/faa/pacar?url=${encodeURIComponent(link)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });
    const ct = res.headers["content-type"] || "";

    let imgBuffer;
    if (ct.startsWith("image/")) {
      imgBuffer = Buffer.from(res.data);
    } else {
      const json = JSON.parse(res.data.toString());
      const imageUrl = json.url || json.result || json.image || json.data?.url || json.data;
      if (!imageUrl) { await m.react("❌"); return m.reply(raraWrap("topacar", "API tidak mengembalikan gambar.")); }
      const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });
      imgBuffer = Buffer.from(img.data);
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "💑 Kamu punya pacar baru!" }, { quoted: m });
    await m.reply(raraBerhasil("topacar"));
  } catch (e) {
    console.error("topacar error:", e.message);
    await m.react("❌");
    m.reply(raraGangguan("topacar"));
  }
}

export { pluginConfig as config, handler };
