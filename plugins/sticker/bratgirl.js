// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraReply, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "bratcewek",
  alias: ["bratcewek"],
  category: "sticker",
  description: "Membuat sticker brat cewek (API deline)",
  usage: ".bratcewek <text>",
  example: ".bratcewek Hai semua",
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
      title: "Brat Cewek",
      status: "⚠ Masukkan teks untuk generate brat sticker",
      content: `Contoh: ${m.prefix}bratcewek Hai semua`,
    });
    return await m.reply(msg);
  }
  try {
  await m.react("🕒");
    const url = `https://api.deline.web.id/maker/cewekbrat?text=${encodeURIComponent(text)}`;
    let webpBuf = null;
    await sock.sendImageAsSticker(m.chat, url, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
      onWebp: (b) => { webpBuf = b; },

    });
      await m.react("🐣");
            let card = "";
      try {
        if (webpBuf) {
          const info = await probeBuffer(webpBuf);
          card = mediaResultCard({
            header: "bratcewek",
            type: "stiker",
            request: [["Teks", String(text).slice(0, 80)]],
            size: info.size, mime: info.mime || "image/webp",
            width: info.width, height: info.height,
          });
        }
      } catch { /* best-effort */ }
      await m.reply(card || raraBerhasil("bratcewek"));
  } catch (error) {
    console.error("[bratcewek] Error:", error.message);
    const msg = raraGangguan("bratcewek");
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
