// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/nova-uploader.js";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "totua",
  alias: ["totua"],
  aliases: ["totua"],
  category: "convert",
  description: "Efek tua pada gambar",
  usage: ".totua (reply gambar)",
  example: ".totua",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) return m.reply(novaWrap("totua", "Reply gambar dengan caption .totua untuk efek tua.", "guide"));

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) mediaBuffer = await m.download();
    else if (m.quoted && m.quoted.download) mediaBuffer = await m.quoted.download();
    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) { await m.react("❌"); return m.reply(novaWrap("totua", "Gagal mengunduh gambar.")); }

    const link = await uploadToCatbox(mediaBuffer, "image.jpg");
    const apiUrl = `https://api-faa.my.id/faa/tua?url=${encodeURIComponent(link)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });
    const ct = res.headers["content-type"] || "";

    let imgBuffer;
    if (ct.startsWith("image/")) {
      imgBuffer = Buffer.from(res.data);
    } else {
      const json = JSON.parse(res.data.toString());
      const imageUrl = json.url || json.result || json.image || json.data?.url || json.data;
      if (!imageUrl) { await m.react("❌"); return m.reply(novaWrap("totua", "API tidak mengembalikan gambar.")); }
      const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });
      imgBuffer = Buffer.from(img.data);
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "👴 Kamu jadi versi tua!" }, { quoted: m });
    await m.reply(novaBerhasil("totua"));
  } catch (e) {
    console.error("totua error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("totua"));
  }
}

export { pluginConfig as config, handler };
