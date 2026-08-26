// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
const execAsync = promisify(exec);
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `aivoice_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const ENDPOINTS = [
  "https://api.zeks.xyz/api/tts",
  "https://api.miaou.xyz/api/tts",
];

const pluginConfig = {
  name: "aivoice",
  alias: ["aivoice"],
  category: "ai",
  description: "Ubah teks menjadi suara dengan AI/TTS",
  usage: ".aivoice <teks>",
  example: ".aivoice Halo, ini suara AI.",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim();

    if (!text) {
      const out =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}aivoice <teks>*`,
          `│ ❏ Contoh: *${prefix}aivoice Halo dunia*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    let buffer = null;
    for (const baseUrl of ENDPOINTS) {
      try {
        const res = await axios.get(baseUrl, {
          params: { text },
          responseType: "arraybuffer",
          timeout: 60000,
        });
        if (res.status === 200 && res.data && res.data.length > 1000) {
          buffer = Buffer.from(res.data);
          break;
        }
      } catch (e) { console.error('[aivoice.js]:', e.message); }
    }

    // Fallback: edge-tts (free, local, verified working)
    if (!buffer) {
      try {
        const tmpPath = path.join(process.cwd(), "tmp", `aivoice_${Date.now()}.mp3`);
        const tmpDir = path.dirname(tmpPath);
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        await execAsync(`edge-tts --voice "id-ID-GadisNeural" --text "${text.replace(/"/g, '\"')}" --write-media "${tmpPath}"`, { timeout: 30000 });
        const fs2 = await import("fs");
        const audioBuf = fs2.readFileSync(tmpPath);
        buffer = await toVoiceNote(audioBuf);
        try { fs2.unlinkSync(tmpPath); } catch {}
      } catch (e) {
        console.error('[aivoice.js] edge-tts fallback:', e.message);
      }
    }

    if (!buffer) throw new Error("Gagal generate suara dari semua endpoint (Zeks/Miaou/edge-tts semua gagal).");

    const filePath = tempPath(".mp3");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      audio: fs.readFileSync(filePath),
      mimetype: "audio/mpeg",
      ptt: false,
    }, { quoted: m });

    const out =
      claraWrap("AI Voice", [`│ ❏ Teks: *${text.slice(0, 100)}${text.length > 100 ? "..." : ""}*`,
        "│ ❏ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aivoice <teks> untuk suara lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *Gagal*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
