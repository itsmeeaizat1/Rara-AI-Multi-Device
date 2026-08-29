// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import * as _tesseract from "tesseract.js";
import te from "../../src/lib/nova-error.js";
import { sendToolsPreview } from "../../src/lib/nova-context.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

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
    return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `Reply gambar dengan \`${m.prefix}ocr\`\n\n` +
        `Media yang didukung:\n` +
        `JPG, PNG, GIF, WEBP`, "ocr");
  }
  await m.react("🕒");
  { const __navText = `🕕 *ᴍᴇᴍᴘʀᴏꜱᴇꜱ...*\n\nMengekstrak teks dari gambar...`; await m.reply(__navText); };
  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }
    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("Ocr", `❌ *ɢᴀɢᴀʟ*\n\nTidak dapat download gambar`));
    }
    const Tesseract = await getTesseract();
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {});
    const extractedText = text ? text.trim() : "";
    if (!extractedText || extractedText.length === 0) {
      return m.reply(claraWrap("Ocr", `❌ *ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴛᴇᴋꜱ*\n\nTidak ada teks yang terdeteksi di gambar`));
    }
    await m.react("🐣");
    const responseText =
      `📖 *ᴏᴄʀ ʀᴇꜱᴜʟᴛ*\n\n` +
      `╭──「 *TEKs* 」\n` +
      `${extractedText
        .split("\n")
        .map((l) => `│ ${l}`)
        .join("\n")}\n` +
      `╰┈┈┈┈┈┈┈┈\n\n` +
      `Total: ${extractedText.length} karakter`;
    await sendToolsPreview(
      sock,
      m.chat,
      responseText,
      "📖 *ᴏᴄʀ*",
      `${extractedText.length} chars`,
      { quoted: m },
    );
  } catch (e) {
    m.reply(claraWrap("ocr", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
