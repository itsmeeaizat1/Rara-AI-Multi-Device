// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// linesticker.js — Download sticker pack LINE (direct scrape store.line.me, no API)
import axios from "axios";
import * as cheerio from "cheerio";
import config from "../../config.js";
import { raraWrap, raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "linesticker",
  alias: ["linesticker", "linedl"],
  category: "sticker",
  description: "Download sticker pack LINE (direct scrape)",
  usage: ".linesticker <url>",
  example: ".linesticker https://store.line.me/stickershop/product/9801/en",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 25, energi: 1, isEnabled: true,
};

async function scrapeLineStickers(url) {
  // Extract product ID from URL
  const idMatch = url.match(/product\/(\d+)/);
  if (!idMatch) throw new Error("ID produk LINE tidak ditemukan dari URL");
  const productId = idMatch[1];

  // Scrape LINE sticker store page
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const title = $("title").text().trim() || $(".mdCMN38Item01Txt").first().text().trim() || "LINE Sticker";
  const author = $(".mdCMN38Item01Txt, .mdCMN04 .mdCMN04Item01Author").first().text().trim() || "Unknown";

  // Extract sticker URLs from preview images
  const stickerUrls = [];
  $(".mdCMN09Image, .FnStickerPreviewItem img").each((i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.includes("stickershop")) {
      // Get higher quality version
      stickerUrls.push(src);
    }
  });

  // Fallback: construct sticker URLs from product ID
  if (stickerUrls.length === 0) {
    // LINE sticker preview pattern: https://stickershop.line-scdn.net/stickershop/v1/product/{id}/iPhone/base/sticker{num}.png
    for (let i = 1; i <= 40; i++) {
      stickerUrls.push(`https://stickershop.line-scdn.net/stickershop/v1/product/${productId}/iPhone/base/sticker${i}.png`);
    }
  }

  // Try to get animated stickers
  const isAnimated = url.includes("animation") || data.includes("animation");

  return { title, author, stickerUrls: stickerUrls.slice(0, 20), isAnimated };
}

async function handler(m, { sock }) {
  const url = m.args?.[0]?.trim();

  if (!url || !url.includes("store.line.me")) {
    return m.reply(raraWrap("linesticker", `Download LINE sticker pack!\n\nContoh: ${m.prefix}linesticker https://store.line.me/stickershop/product/9801/en`, "guide"));
  }

  try {
    await m.react("🕒");
    const data = await scrapeLineStickers(url);

    if (!data.stickerUrls.length) {
      await m.react("❌");
      return m.reply(raraError("LineSticker", "Tidak ada sticker ditemukan di URL tersebut!"));
    }

    // Send info
    await m.reply(raraWrap("LINE Sticker", [
      `Title: ${data.title}`,
      `Author: ${data.author}`,
      `Animated: ${data.isAnimated ? "Ya" : "Tidak"}`,
      `Total: ${data.stickerUrls.length} sticker`,
      "",
      "Mengirim sticker...",
    ].join("\n")));

    // Send stickers (max 10 to avoid spam)
    const maxStickers = Math.min(data.stickerUrls.length, 10);
    let sent = 0;

    for (let i = 0; i < maxStickers; i++) {
      try {
        const response = await axios.get(data.stickerUrls[i], {
          responseType: "arraybuffer",
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const buffer = Buffer.from(response.data);
        if (buffer.length < 100) continue;

        await sock.sendImageAsSticker(m.chat, buffer, m, {
          packname: data.title,
          author: data.author,
        });
        sent++;
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        console.error("[LineSticker] sticker", e.message);
      }
    }

    if (sent > 0) {
      await m.react("🐣");
      let card = "";
      try {
        card = mediaResultCard({
          header: "linesticker",
          platform: "LINE",
          title: data.title,
          request: [
            ["Paket", data.title || "LINE sticker"],
            ["Terjirim", `${sent}/${data.stickerUrls.length} stiker`],
          ],
        });
      } catch { /* best-effort */ }
      await m.reply(card || raraWrap("Linesticker", `Berhasil kirim ${sent}/${data.stickerUrls.length} sticker`));
    } else {
      await m.react("❌");
      m.reply(raraGagal("LineSticker"));
    }
  } catch (err) {
    console.error("[LineSticker]", err);
    await m.react("❌");
    m.reply(raraWrap("linesticker", "Gagal download sticker LINE. Pastikan URL valid!", "error"));
  }
}

export { pluginConfig as config, handler };
