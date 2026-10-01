// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import * as _tesseract from "tesseract.js";
import te from "../../src/lib/rara-error.js";
import { sendToolsPreview } from "../../src/lib/rara-context.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

function getTesseract() {
  return _tesseract;
}
const pluginConfig = {
  name: "ocrtool",
  alias: ["ocrtool", "ocr"],
  category: "tools",
  description: "Extract teks dari gambar (Offline/Local)",
  usage: ".ocr (reply gambar)",
  example: ".ocr",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  if (!isImage) {
    return m.reply(raraWrap("ocr", [
      `📌 Format: reply gambar dengan ${m.prefix}ocr`,,
      `Media yang didukung:`,
      `JPG, PNG, GIF, WEBP`
    ]));
  }
  { const __navText = `🕕 *memproses...*\n\nMengekstrak teks dari gambar...`; await m.reply(__navText); };
  try {
    await m.react("🕒");
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }
    if (!buffer || buffer.length === 0) {
      return m.reply(raraWrap("Ocr", `❌ *gagal*\n\nTidak dapat download gambar`));
    }
    const Tesseract = await getTesseract();
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {});
    const extractedText = text ? text.trim() : "";
    if (!extractedText || extractedText.length === 0) {
      await m.react("🐣");
      return m.reply(raraWrap("Ocr", `❌ *tidak ada teks*\n\nTidak ada teks yang terdeteksi di gambar`));
    }
    const responseText =
      `📖 *ocr result*\n\n` +
      "" +
      `${extractedText
        .split("\n")
        .map((l) => `${l}`)
        .join("\n")}\n` +
      `---\n\n` +
      `Total: ${extractedText.length} karakter`;
    await sendToolsPreview(
      sock,
      m.chat,
      responseText,
      "📖 *ocr*",
      `${extractedText.length} chars`,
      { quoted: m },
    );
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("ocr", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
