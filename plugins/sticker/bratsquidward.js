// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraReply, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";

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
    const msg = raraReply({
      title: "bratsquidward",
      status: "⚠ Masukkan teks untuk generate brat sticker",
      content: `Contoh: ${m.prefix}bratsquidward Hai semua`,
    });
    return await m.reply(msg);
  }
  const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.png`);
  try {
  await m.react("🕒");
    const pngBuffer = await bratGen(text, { C_BG: "#5d8aa8", C_TEXT: "#ffffff" });
    await fs.promises.writeFile(tempFile, pngBuffer);
    let webpBuf = null;
    await sock.sendImageAsSticker(m.chat, tempFile, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
      onWebp: (b) => { webpBuf = b; },

    });
    await fs.promises.unlink(tempFile).catch(() => {});
      await m.react("🐣");
            let card = "";
      try {
        if (webpBuf) {
          const info = await probeBuffer(webpBuf);
          card = mediaResultCard({
            header: "bratsquidward",
            type: "stiker",
            request: [["Teks", String(text).slice(0, 80)]],
            size: info.size, mime: info.mime || "image/webp",
            width: info.width, height: info.height,
          });
        }
      } catch { /* best-effort */ }
      await m.reply(card || raraBerhasil("bratsquidward"));
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    console.error("[bratsquidward] Error:", error.message);
    const msg = raraGangguan("bratsquidward");
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
