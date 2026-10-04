// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import { toVoiceNote } from "../../src/lib/rara-ffmpeg.js";
const execAsync = promisify(exec);
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

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
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const text = m.text?.trim();

    if (!text) {
      const out =
        raraCaption({
  emoji: "🤖",
  name: "aivoice",
  description: "Ubah teks menjadi suara dengan AI/TTS",
  usage: `${prefix}aivoice <teks>`,
  example: `${prefix}aivoice Halo, ini suara AI.`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
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

    if (!buffer) throw new Error("Gagal generate suara nih");

    const filePath = tempPath(".mp3");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      audio: fs.readFileSync(filePath),
      mimetype: "audio/mpeg",
      ptt: false,
    }, { quoted: m });

    let voiceCard = raraWrap("AI Voice", [`Teks: *${text.slice(0, 100)}${text.length > 100 ? "..." : ""}*`,
      "Status: *Berhasil*"].join("\n"));
    try {
      const info = await probeBuffer(fs.readFileSync(filePath), { mime: "audio/mpeg" });
      const card = mediaResultCard({
        header: "aivoice",
        request: [["Model", "AI Voice"], ["Teks", String(text).slice(0, 80)]],
        size: info.size, mime: info.mime, duration: info.duration,
      });
      if (card) voiceCard = card;
    } catch {}
    const out =
      voiceCard +
      "\n" +
      tipText(`Ketik ${prefix}aivoice <teks> untuk suara lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIVoice", "Gagal nih, coba lagi ya");

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
