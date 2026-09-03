// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/nova-uploader.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tovintage",
  alias: ["tovintage"],
  aliases: ["tovintage"],
  category: "convert",
  description: "Efek vintage pada gambar",
  usage: ".tovintage (reply gambar)",
  example: ".tovintage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) return m.reply(claraWrap("tovintage", "Reply gambar dengan caption .tovintage untuk efek vintage.", "guide"));

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) mediaBuffer = await m.download();
    else if (m.quoted && m.quoted.download) mediaBuffer = await m.quoted.download();
    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) { await m.react("❌"); return m.reply(claraWrap("tovintage", "Gagal mengunduh gambar.")); }

    const link = await uploadToCatbox(mediaBuffer, "image.jpg");
    const apiUrl = `https://api-faa.my.id/faa/vintage?url=${encodeURIComponent(link)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });
    const ct = res.headers["content-type"] || "";

    let imgBuffer;
    if (ct.startsWith("image/")) {
      imgBuffer = Buffer.from(res.data);
    } else {
      const json = JSON.parse(res.data.toString());
      const imageUrl = json.url || json.result || json.image || json.data?.url || json.data;
      if (!imageUrl) { await m.react("❌"); return m.reply(claraWrap("tovintage", "API tidak mengembalikan gambar.")); }
      const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });
      imgBuffer = Buffer.from(img.data);
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "📼 Vintage mode aktif!" }, { quoted: m });
    await m.reply(novaBerhasil("tovintage"));
  } catch (e) {
    console.error("tovintage error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("tovintage"));
  }
}

export { pluginConfig as config, handler };
