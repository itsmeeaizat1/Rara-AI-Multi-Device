// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import axios from "axios";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "stickerfilter",
  alias: ["stikerfilter", "filtersticker", "stikerfx"],
  category: "sticker",
  description: "Tambah filter ke sticker (blur, grayscale, invert, sepia, circle)",
  usage: ".stickerfilter <filter>",
  example: ".stickerfilter blur",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const FILTERS = ["blur", "grayscale", "invert", "sepia", "circle"];

async function handler(m, { sock }) {
  const filter = m.args[0]?.toLowerCase();

  if (!filter) {
    let help = "🎨 *Sticker Filter*\n\n";
    help += "Reply sticker dengan filter:\n\n";
    help += "Filter tersedia:\n";
    for (const f of FILTERS) {
      help += `- ${f}\n`;
    }
    help += `\nContoh: \`${m.prefix}stickerfilter blur\` (reply sticker)`;
    return m.reply( help, "stickerfilter");
  }

  if (!FILTERS.includes(filter)) {
    return m.reply( `❌ Filter tidak valid. Pilih: ${FILTERS.join(", ")}`, "stickerfilter");
  }

  if (!m.quoted || !m.quoted.sticker) {
    return m.reply( "❌ Reply sticker yang mau difilter.", "stickerfilter");
  }

  await m.react("🕒");

  try {
    const stickerBuffer = await m.quoted.download();
    if (!stickerBuffer || stickerBuffer.length < 100) {
      return m.reply( "❌ Gagal download sticker.", "stickerfilter");
    }

    const apiUrl = `https://api.siputzx.my.id/api/canvas/${filter}?image`;
    const formData = new FormData();
    formData.append("image", stickerBuffer, { filename: "sticker.webp" });

    const res = await axios.post(apiUrl, formData, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const buf = Buffer.from(res.data);
    if (buf.length < 100) {
      return m.reply( "❌ Gagal apply filter. Coba lagi.", "stickerfilter");
    }

    const exifBuf = await addExifToWebp(buf, "Nova AI", "Sticker Filter");
    await sock.sendMessage(m.chat, { sticker: exifBuf }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("[StickerFilter] Error:", err.message);
    await m.react("❌");
    return m.reply( te(m.prefix, m.command, m.pushName), "stickerfilter");
  }
}

export { pluginConfig as config, handler };
