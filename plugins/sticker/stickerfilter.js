// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import axios from "axios";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "stickerfilter",
  alias: ["stickerfilter"],
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
    let help = "╭──「 🎨 Sticker Filter 」\n";
    help += "├── Reply sticker dengan filter:\n";
    help += "├──\n";
    help += "├── *Filter tersedia:*\n";
    for (const f of FILTERS) {
      help += `├── • ${f}\n`;
    }
    help += "├──\n";
    help += `├── 💡 *Contoh:* \`${m.prefix}stickerfilter blur\`\n`;
    help += "├── (Reply sticker dulu)\n";
    help += "╰──────────❀";
    return m.reply(help, "stickerfilter");
  }

  if (!FILTERS.includes(filter)) {
    return m.reply(`╭──「 🎨 Sticker Filter 」\n├── ❌ Filter tidak valid\n├── Pilih: ${FILTERS.join(", ")}\n╰──────────❀`, "stickerfilter");
  }

  if (!m.quoted || !m.quoted.sticker) {
    return m.reply("╭──「 🎨 Sticker Filter 」\n├── ❌ Reply sticker dulu\n├── Yang mau difilter\n╰──────────❀", "stickerfilter");
  }

  await m.react("🕒");

  try {
    const stickerBuffer = await m.quoted.download();
    if (!stickerBuffer || stickerBuffer.length < 100) {
      return m.reply("╭──「 🎨 Sticker Filter 」\n├── ❌ Gagal download sticker\n├── Coba lagi nanti\n╰──────────❀", "stickerfilter");
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
      return m.reply("╭──「 🎨 Sticker Filter 」\n├── ❌ Gagal apply filter\n├── Coba lagi nanti\n╰──────────❀", "stickerfilter");
    }

    const exifBuf = await addExifToWebp(buf, "Nova AI", "Sticker Filter");
    await sock.sendMessage(m.chat, { sticker: exifBuf }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("[StickerFilter] Error:", err.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "stickerfilter");
  }
}

export { pluginConfig as config, handler };
