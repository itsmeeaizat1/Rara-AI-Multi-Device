// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
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
  return path.join(TMP_DIR, `terabox_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();

    if (!url) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}terabox <link>*`,
          `  ┊  ➶ Contoh: *${prefix}terabox https://terabox.com/s/xxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "terabox");
      return { handled: true };
    }

    const response = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    const ext = ".bin";
    const filePath = tempPath(ext);
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      document: fs.readFileSync(filePath),
      mimetype: "application/octet-stream",
      fileName: `terabox_${Date.now()}${ext}`,
    });

    const text =
      claraWrap("Terabox", [`  ┊  ➶ Link: *${url}*`,
        "  ┊  ➶ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}terabox <link> untuk download file lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("terabox2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "terabox");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "terabox2",
  alias: ["terabox2", "teraboxmain", "tb2"],
  category: "download",
  description: "Download file dari Terabox",
  usage: ".terabox <link>",
  example: ".terabox https://terabox.com/s/xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
