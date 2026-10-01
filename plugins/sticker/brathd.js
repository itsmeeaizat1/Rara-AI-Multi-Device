// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraReply, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "brathd",
  alias: ["brathd"],
  category: "sticker",
  description: "Membuat sticker brat HD (lokal canvas)",
  usage: ".brathd <text>",
  example: ".brathd Hai semua",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) {
    const msg = raraReply({
      title: "brathd",
      status: "⚠ Masukkan teks untuk generate brat sticker",
      content: `Contoh: ${m.prefix}brathd Hai semua`,
    });
    return await m.reply(msg);
  }
  const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.png`);
  try {
  await m.react("🕒");
    const pngBuffer = await bratGen(text, { C_BG: "#8ac306", C_TEXT: "#000000", W: 2048, H: 2048 });
    await fs.promises.writeFile(tempFile, pngBuffer);
    await sock.sendImageAsSticker(m.chat, tempFile, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    await fs.promises.unlink(tempFile).catch(() => {});
      await m.react("🐣");
      await m.reply(raraBerhasil("brathd"));
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    console.error("[brathd] Error:", error.message);
    const msg = raraGangguan("brathd");
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
