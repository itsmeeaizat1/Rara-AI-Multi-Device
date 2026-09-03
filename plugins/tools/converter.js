// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { mconverter } from "../../src/scraper/mconverter.js";
import { downloadContentFromMessage } from "nova";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
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
    return m.reply(
      `🔄 *ᴄᴏɴᴠᴇʀᴛᴇʀ*\n\n` +
        `Reply file dengan format tujuan\n\n` +
        `*ꜰᴏʀᴍᴀᴛ:*\n` +
        `\`${m.prefix}converter <format>\`\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `\`${m.prefix}converter mp3\`\n` +
        `\`${m.prefix}converter mp4\`\n` +
        `\`${m.prefix}converter png\`\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `1. Reply file yang mau diconvert\n` +
        `2. Ketik \`${m.prefix}converter <format>\``,
    );
  }

  if (!targetFormat) {
    return m.reply( `❌ Masukkan format tujuan!\n\n💡 *Contoh:* \`${m.prefix}converter mp3\``, "converter");
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
    return m.reply(claraWrap("Converter", `❌ Reply file yang mau diconvert!`));
  }
  await m.reply(claraWrap("Converter", `🕕 *MENGUNDUH ғILE...*`));

  try {
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

    { const __navText = `🔄 *ᴄᴏɴᴠᴇʀᴛɪɴɢ...*\n\n${ext} → ${targetFormat}`; await m.reply(__navText); };

    const result = await mconverter.convert(tempFile, targetFormat);

    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    if (result.error) {
      return m.reply(claraWrap("converter", `❌ *ɢᴀɢᴀʟ ᴄᴏɴᴠᴇʀᴛ*\n\n${result.error}`));
    }

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    await sock.sendMessage(
      m.chat,
      {
        document: { url: result.url },
        fileName: `converted_${Date.now()}.${targetFormat}`,
        mimetype: `application/${targetFormat}`,
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false,
        },
      },
      { quoted: m },
    );
  } catch (err) {
    console.error("[Converter] Error:", err.message);
    return m.reply(claraWrap("converter", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
