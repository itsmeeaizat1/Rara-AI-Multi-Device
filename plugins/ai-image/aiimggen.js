// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `aiimg_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const ENDPOINTS = [
  "https://image.pollinations.ai/prompt/",
  "https://api.miaou.xyz/api/txt2img",
  "https://api.zeks.xyz/api/txt2img",
];

const pluginConfig = {
  name: "aiimggen2",
  alias: ["aiimggen2", "aiimggen"],
  category: 'ai image',
  description: "Generate gambar dari teks",
  usage: ".aiimggen <prompt>",
  example: ".aiimggen sunset over mountains",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "aiimggen2",
  description: "Generate gambar dari teks",
  usage: `${prefix}aiimggen <prompt>`,
  example: `${prefix}aiimggen sunset over mountains`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "aiimggen");
      return { handled: true };
    }

    let buffer = null;
    for (const baseUrl of ENDPOINTS) {
      try {
        const res = await axios.get(baseUrl, {
          params: { prompt },
          responseType: "arraybuffer",
          timeout: 60000,
        });
        if (res.status === 200 && res.data && res.data.length > 1000) {
          buffer = Buffer.from(res.data);
          break;
        }
      } catch (e) { console.error('[aiimggen.js]:', e.message); }
    }

    if (!buffer) throw new Error("Gagal generate gambar nih");

    const filePath = tempPath(".png");
    fs.writeFileSync(filePath, buffer);

    const imgBuf = fs.readFileSync(filePath);
    const c = await dlCard("gambar", { buffer: imgBuf }, [["Prompt", String(prompt).slice(0, 40)], ["Engine", "Miaou AI"]]);
    const oldCap = raraWrap("AI Image", [`Prompt: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`, "Status: *Berhasil*"].join("\n"));
    await sock.sendMessage(m.chat, {
      image: imgBuf,
      caption: c || oldCap,
    }, { quoted: m });
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIImgGen", "Gagal nih, coba lagi ya");

    await m.reply(text, "aiimggen");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
