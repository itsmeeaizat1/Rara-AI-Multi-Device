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
  return path.join(TMP_DIR, `canvas_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim();

    if (!text) {
      const out =
        claraWrap("Cara Pakai", [`│ Penggunaan: *${prefix}canvas <teks>*`,
          `│ Contoh: *${prefix}canvas Hello World*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    const apiUrl = `https://api.miaou.xyz/api/canvas?text=${encodeURIComponent(text)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Gagal generate canvas");

    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = tempPath(".png");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: `Canvas: ${text.slice(0, 200)}`,
    });

    const out =
      claraWrap("Canvas", [`│ Teks: *${text.slice(0, 50)}${text.length > 50 ? "..." : ""}*`,
        "│ Ukuran: *1080x1080*",
        "│ Format: *ᴘɴɢ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}canvas <teks> untuk desain lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("canvas", text));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "canvas",
  alias: ["canvas"],
  category: "tools",
  description: "Buat desain/grafis",
  usage: ".canvas <teks>",
  example: ".canvas Hello World",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
