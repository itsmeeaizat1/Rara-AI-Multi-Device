// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "toimage",
  alias: ["toimage"],
  aliases: ["toimage", "toimg", "stickerimage", "stikerimg"],
  category: "convert",
  description: "Convert sticker ke gambar PNG/JPG",
  usage: ".toimage (reply sticker)",
  example: ".toimage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(claraWrap("toimage", "Reply sticker dengan caption .toimage", "guide"));

    const isSticker = quoted.type === "stickerMessage" || quoted.mtype === "stickerMessage";
    if (!isSticker) return m.reply(claraWrap("toimage", "Reply harus sticker!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(claraWrap("toimage", "Gagal mengunduh sticker.")); }

    const tmpDir = path.join(os.tmpdir(), "nova-toimg");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const inputPath = path.join(tmpDir, `sticker_${Date.now()}.webp`);
    const outputPath = path.join(tmpDir, `image_${Date.now()}.png`);

    fs.writeFileSync(inputPath, mediaBuffer);

    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" "${outputPath}"`);

    if (!fs.existsSync(outputPath)) { await m.react("❌"); return m.reply(claraWrap("toimage", "Gagal convert sticker ke gambar.")); }

    const imgBuffer = fs.readFileSync(outputPath);
    await m.react("🐣");
    await m.reply(novaBerhasil("toimage"));
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "✅ Sticker → Image" }, { quoted: m });

    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
  } catch (e) {
    console.error("toimage error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("toimage"));
  }
}

export { pluginConfig as config, handler };
