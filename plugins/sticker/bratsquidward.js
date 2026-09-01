// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaReply } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bratsquidward",
  alias: ["bratsquidward"],
  category: "sticker",
  description: "Membuat sticker brat squidward (lokal canvas)",
  usage: ".bratsquidward <text>",
  example: ".bratsquidward Hai semua",
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
    const msg = novaReply({
      title: "bratsquidward",
      status: "⚠ Masukkan teks untuk generate brat sticker",
      content: `Contoh: ${m.prefix}bratsquidward Hai semua`,
    });
    return await m.reply(msg);
  }
  const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.png`);
  try {
    const pngBuffer = await bratGen(text, { C_BG: "#5d8aa8", C_TEXT: "#ffffff" });
    await fs.promises.writeFile(tempFile, pngBuffer);
    await sock.sendImageAsSticker(m.chat, tempFile, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    await fs.promises.unlink(tempFile).catch(() => {});
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    console.error("[bratsquidward] Error:", error.message);
    const msg = novaReply({
      title: "bratsquidward",
      status: `❌ Gagal generate: ${error.message}`,
    });
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
