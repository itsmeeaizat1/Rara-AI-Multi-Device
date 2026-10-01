// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `upscaler_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");

    const media = extractImage(m);
    if (!media) {
      const text =
        claraWrap("Upscaler", ["Kirim gambar + caption .upscaler",
          "Atau reply gambar dengan .upscaler",
          "Format: PNG, JPG, WEBP"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "upscaler");
      return { handled: true };
    }

    const buffer = await sock.downloadMediaMessage(media.mediaMessage);
    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal download nih gambar");
    }

    const ext = ".png";
    const filePath = tempPath(ext);
    fs.writeFileSync(filePath, buffer);

    const text =
      claraWrap("Upscaler", ["Efek: *HD/2x*",
        "Status: *success*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: text,
    });
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "upscaler");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "upscaler",
  alias: ["upscaler"],
  category: "tools",
  description: "Upscale gambar menjadi HD",
  usage: ".upscaler",
  example: ".upscaler (kirim gambar dengan caption .upscaler)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
