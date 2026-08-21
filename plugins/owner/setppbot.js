// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `ppbot_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
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
        claraWrap("Set PP Bot", ["  ┊  ➶ Cara 1: *Kirim gambar + caption .setppbot*",
          "  ┊  ➶ Cara 2: *Reply gambar dengan .setppbot*",
          "  ┊  ➶ Format: *JPG, PNG, WEBP*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "setppbot");
      return { handled: true };
    }

    const buffer = await sock.downloadMediaMessage(media.mediaMessage);
    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal mengunduh gambar");
    }

    await sock.updateProfilePicture(buffer);

    const text =
      claraWrap("Set PP Bot", ["  ┊  ➶ Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setppbot", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "setppbot");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "setppbot",
  alias: ["setppbot", "setppbot2", "setppmain"],
  category: "owner",
  description: "Ganti foto profil bot (owner only)",
  usage: ".setppbot",
  example: ".setppbot (kirim gambar dengan caption .setppbot)",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
