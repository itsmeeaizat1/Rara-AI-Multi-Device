// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { mconverter } from "../../src/scraper/mconverter.js";
import { downloadContentFromMessage } from "rara";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
const pluginConfig = {
  name: "converter",
  alias: ["converter"],
  category: "tools",
  description: "Convert file ke format lain",
  usage: ".converter <format> (reply file)",
  example: ".converter mp3",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const targetFormat = m.text?.trim()?.toLowerCase();

  if (!m.quoted && !m.isMedia) {
    return m.reply(raraWrap("converter", [
      `🔄 *converter*`,
      `Reply file dengan format tujuan`,
      `\`${m.prefix}converter <format>\``,
      ``,
      `📌 Format:`,
      `1. Reply file yang mau diconvert`,
      `2. Ketik \`${m.prefix}converter <format>\`❌ Masukkan format tujuan!`,
      `💡 *Contoh:* \`${m.prefix}converter mp3`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}converter mp3`,
      `${m.prefix}converter mp4`,
      `${m.prefix}converter png`
    ]));
  }

  const quoted = m.quoted;
  let mediaMessage = null;
  let filename = "file";

  if (quoted?.isMedia) {
    mediaMessage = quoted;
    filename = quoted.message?.[quoted.type]?.fileName || `file_${Date.now()}`;
  } else if (m.isMedia) {
    mediaMessage = m;
    filename = m.message?.[m.type]?.fileName || `file_${Date.now()}`;
  }

  if (!mediaMessage) {
    return m.reply(raraWrap("Converter", `❌ Reply file yang mau diconvert!`));
  }
  await m.reply(raraWrap("Converter", `🕕 *MENGUNDUH ғILE...*`));

  try {
    await m.react("🕒");
    const stream = await downloadContentFromMessage(
      mediaMessage.message[mediaMessage.type],
      mediaMessage.type.replace("Message", ""),
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ext = filename.split(".").pop() || "bin";
    const tempFile = path.join(tempDir, `convert_${Date.now()}.${ext}`);
    fs.writeFileSync(tempFile, buffer);

    { const __navText = `🔄 *converting...*\n\n${ext} → ${targetFormat}`; await m.reply(__navText); };

    const result = await mconverter.convert(tempFile, targetFormat);

    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    if (result.error) {
      return m.reply(raraWrap("converter", `❌ *gagal convert*\n\n${result.error}`));
    }

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    await m.react("🐣");
    let card = "";
    try {
      const info = await probeBuffer(buffer);
      card = mediaResultCard({
        header: "converter",
        type: "dokumen",
        request: [
          ["Input", String(ext).toUpperCase()],
          ["Output", String(targetFormat).toUpperCase()],
        ],
        size: info.size, mime: `application/${targetFormat}`,
      });
    } catch { /* best-effort */ }
    await sock.sendMessage(
      m.chat,
      {
        document: { url: result.url },
        fileName: `converted_${Date.now()}.${targetFormat}`,
        mimetype: `application/${targetFormat}`,
        caption: card,
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false,
        },
      },
      { quoted: m },
    );
  } catch (err) {
    await m.react("❌");
    console.error("[Converter] Error:", err.message);
    return m.reply(raraWrap("converter", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
