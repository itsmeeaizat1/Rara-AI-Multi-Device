// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `wanted_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

function extractImage(m) {
  const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const msg = quoted || m.message;
  const img = msg?.imageMessage;
  if (!img) return null;
  const mime = img.mimetype || "";
  if (!mime.startsWith("image")) return null;
  return { mediaMessage: img, mime };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const media = extractImage(m);
    if (!media) {
      const text =
        claraWrap("Cara Pakai", ["│ ❏ Kirim gambar + caption .wanted",
          "│ ❏ Atau reply gambar dengan .wanted",
          "│ ❏ Format: JPG, PNG, WEBP"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "wanted");
      return { handled: true };
    }

    const buffer = await sock.downloadMediaMessage(media.mediaMessage);
    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal mengunduh gambar");
    }

    const ext = ".png";
    const filePath = tempPath(ext);
    fs.writeFileSync(filePath, buffer);

    const text =
      claraWrap("Wanted", ["│ ❏ Efek: *ᴡᴀɴᴛᴇᴅ ᴘᴏꜱᴛᴇʀ*",
        "│ ❏ Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: text,
    });
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "wanted");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "wanted",
  alias: ["wanted", "wantedposter", "buronan", "poster"],
  category: "canvas",
  description: "Buat wanted poster dari gambar",
  usage: ".wanted",
  example: ".wanted (kirim/reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
