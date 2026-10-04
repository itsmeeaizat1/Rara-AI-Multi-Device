// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ocr2.js — OCR v2 (ocr.space API, cloud-based, multi-language)
import axios from "axios";
import FormData from "form-data";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ocr2",
  alias: ["ocr2", "ocronline", "textextract"],
  category: "tools",
  description: "Extract teks dari gambar v2 (ocr.space cloud, multi-bahasa)",
  usage: ".ocr2 (reply gambar) [lang: eng/ind/ara/chi/jpn/kor]",
  example: ".ocr2 (reply gambar)\n.ocr2 ind (reply gambar)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.message?.imageMessage || (m.quoted && (m.quoted.type === "imageMessage" || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage));
    if (!isImage) {
      return m.reply(raraWrap("ocr2", `Reply gambar dengan caption ${m.prefix}ocr2\n\nBahasa: eng, ind, ara, chi, jpn, kor, rus\nDefault: eng`, "guide"));
    }

    await m.react("🕒");

    let buffer;
    try {
      buffer = m.quoted ? await m.quoted.download() : await m.download();
    } catch (e) {
      await m.react("❌");
      return m.reply(raraWrap("ocr2", "Gagal download gambar.", "error"));
    }
    if (!buffer) {
      await m.react("❌");
      return m.reply(raraWrap("ocr2", "Gambar tidak ditemukan.", "error"));
    }

    const lang = m.args[0]?.trim() || "eng";
    const form = new FormData();
    form.append("file", buffer, "image.jpg");
    form.append("language", lang);
    form.append("apikey", process.env.OCR_SPACE_KEY || "K82996569088957"); // free demo key

    const { data } = await axios.post("https://api.ocr.space/parse/image", form, {
      headers: form.getHeaders(), timeout: 30000,
    });

    if (!data || data.IsErroredOnProcessing || !data.ParsedResults?.length) {
      await m.react("❌");
      return m.reply(raraWrap("ocr2", "Gagal extract teks. Coba gambar yang lebih jelas.", "error"));
    }

    const extracted = data.ParsedResults[0].ParsedText?.trim();
    if (!extracted) {
      await m.react("❌");
      return m.reply(raraWrap("ocr2", "Tidak ada teks terdeteksi.", "error"));
    }

    await m.react("🐣");
    let msg = "";
    msg += `Bahasa: *${lang}*\n`;
    msg += `Engine: ocr.space cloud\n`;
    msg += `
`;
    msg += `Teks:\n${extracted}\n`;
        return m.reply(msg, { raw: true });
  } catch (err) {
    console.error("ocr2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ocr2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
