// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, raraWrap, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `grouppp_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
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

    const media = extractImage(m);
    if (!media) {
      await m.reply(raraGuide('SetGroupPP', 'Kirim gambar dengan caption atau reply gambar yang ingin dijadikan foto profil grup!', `${prefix}setgrouppp`));
      return { handled: true };
    }

    const buffer = await sock.downloadMediaMessage(media.mediaMessage);
    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal mengunduh gambar");
    }

    await sock.updateGroupPicture(m.chat, buffer);

    const text =
      raraWrap("Set Group PP", [`Group: *${m.chat}*`,
        "Status: *success*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text);
  } catch (error) {
    await m.reply(raraError('SetGroupPP', `Gagal mengganti foto profil grup: ${error.message}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "setgrouppp",
  alias: ["setgrouppp"],
  category: "group",
  description: "Ganti foto profil grup",
  usage: ".setgrouppp",
  example: ".setgrouppp (kirim gambar dengan caption .setgrouppp)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
