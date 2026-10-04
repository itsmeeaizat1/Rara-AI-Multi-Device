// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import FormData from 'form-data'
import _sharp from 'sharp'
import axios from "axios";

function getSharp() {
  return _sharp;
}
import fs from "fs";
import path from "path";
import { config } from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "smeme",
  alias: ["smeme"],
  category: "sticker",
  description: "Membuat sticker meme dari gambar",
  usage: ".smeme <top>|<bottom>",
  example: ".smeme Ketika|Kamu Lupa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.isImage);
  const isSticker =
    m.isSticker ||
    (m.quoted && (m.quoted.isSticker || m.quoted.type === "stickerMessage"));
  if (!isImage && !isSticker) {
    return m.reply(raraWrap("smeme", [
      "Reply atau kirim gambar/sticker dengan caption",
      "",
      "💡 Contoh: " + m.prefix + "smeme Top|Bottom",
    ]));
  }
  const input = m.args.join(" ");
  if (!input || !input.includes("|")) {
    return m.reply(raraWrap("smeme", [
      "📌 Format: top|bottom",
      "",
      "💡 Contoh: " + m.prefix + "smeme Ketika|Kamu Lupa",
    ]));
  }
  const [top, bottom] = input.split("|").map((s) => s.trim());
  try {
  await m.react("🕒");
    let mediaBuffer;
    if (m.quoted) {
      mediaBuffer = await m.quoted.download();
    } else if (m.download) {
      mediaBuffer = await m.download();
    }
    if (!mediaBuffer) {
      return m.reply(raraGagal("Smeme"));
    }
    let imageBuffer;
    try {
      imageBuffer = await (
        await getSharp()
      )(mediaBuffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    } catch (e) {
      console.log("[SMEME] Sharp resize failed:", e.message);
      imageBuffer = mediaBuffer;
    }
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: "meme.png",
      contentType: "image/png",
    });
    let imageUrl;
    try {
      const catboxForm = new FormData();
      catboxForm.append('reqtype', 'fileupload');
      catboxForm.append('fileToUpload', imageBuffer, {
        filename: "meme.png",
        contentType: "image/png",
      });
      const catboxRes = await axios.post(
        "https://catbox.moe/user/api.php",
        catboxForm,
        {
          headers: catboxForm.getHeaders(),
          timeout: 30000,
        },
      );
      if (catboxRes.data && catboxRes.data.startsWith('http')) {
        imageUrl = catboxRes.data;
      }
    } catch (e) {
      console.log("[SMEME] Catbox failed:", e.message);
    }
    // Fallback: telegraph
    if (!imageUrl) {
      try {
        const form2 = new FormData();
        form2.append('file', imageBuffer, {
          filename: "meme.png",
          contentType: "image/png",
        });
        const telegraphRes = await axios.post(
          "https://telegra.ph/upload",
          form2,
          {
            headers: form2.getHeaders(),
            timeout: 30000,
          },
        );
        if (telegraphRes.data?.[0]?.src) {
          imageUrl = "https://telegra.ph" + telegraphRes.data[0].src;
        }
      } catch (e) {
        console.log("[SMEME] Telegraph failed:", e.message);
      }
    }
    if (!imageUrl) {
      return m.reply(raraGagal("Smeme"));
    }
    console.log("[SMEME] Image uploaded:", imageUrl);
    const encodeText = (text) => {
      if (!text) return "_";
      return encodeURIComponent(text)
        .replace(/-/g, "--")
        .replace(/_/g, "__")
        .replace(/%20/g, "_");
    };
    const topEncoded = encodeText(top);
    const bottomEncoded = encodeText(bottom);
    const memeUrl = `https://api.memegen.link/images/custom/${topEncoded}/${bottomEncoded}.png?background=${encodeURIComponent(imageUrl)}`;
    const response = await axios.get(memeUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const buffer = Buffer.from(response.data);
    let webpBuf = null;
    await sock.sendImageAsSticker(m.chat, buffer, m, {
      packname: config.sticker?.packname || "Rara-AI",
      author: config.sticker?.author || "Bot",
      onWebp: (b) => { webpBuf = b; },
    });
      await m.react("🐣");
      let card = "";
      try {
        if (webpBuf) {
          const info = await probeBuffer(webpBuf);
          card = mediaResultCard({
            header: "smeme",
            type: "stiker",
            request: [
              ["Teks atas", top],
              ["Teks bawah", bottom],
            ],
            size: info.size,
            mime: info.mime || "image/webp",
            width: info.width,
            height: info.height,
          });
        }
      } catch { /* best-effort */ }
      await m.reply(card || raraBerhasil("smeme"));
  } catch (error) {
    console.log("[SMEME] Error:", error.message);
    m.reply(raraGangguan("smeme"));
  }
}
export { pluginConfig as config, handler };
