// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// oneimage.js — Onepunya API: IMAGE_GENERATION.
// .oneimg <prompt> — generate gambar AI dari teks
// Sumber: onepunya.qzz.io (key .setkey onepunya) — beda engine dari .img2/.flux
// yang udah ada; upstream-nya kadang lambat (504) → pesan gagal jujur.
import axios from "axios";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { imageGeneration } from "../../src/lib/rara-onepunya.js";

const pluginConfig = {
  name: "oneimg",
  alias: ["oneimg", "oneimage", "onepunyaimg"],
  category: "ai",
  description: "Generate gambar AI via Onepunya API",
  usage: ".oneimg <prompt>",
  example: ".oneimg kucing oren tidur di kasur awan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 4,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = (m.args || []).join(" ").trim();
  if (!prompt) {
    return m.reply(raraWrap("Onepunya Image", `Masukkan deskripsi gambar!\n\nContoh: .oneimg kucing oren tidur di kasur awan`));
  }
  const apiKey = getApiKey("onepunya");
  try {
    const res = await imageGeneration(apiKey, prompt);
    const imgUrl = res?.url || res?.image || res?.result || (typeof res === "string" ? res : "");
    if (!imgUrl) throw new Error("Server gak balikin URL gambar.");
    let buf = null;
    if (/^https?:\/\//.test(imgUrl)) {
      try {
        const dl = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 120_000 });
        buf = Buffer.from(dl.data);
      } catch { buf = null; }
    }
    // Kartu info media (kategori AI, 4 Okt 2026): field hanya kalau datanya nyata.
    let caption = `🎨 ${prompt.slice(0, 100)}`;
    try {
      const info = buf ? await probeBuffer(buf) : await probeMedia(imgUrl);
      const card = mediaResultCard({
        header: "oneimage",
        request: [["Model", "Onepunya Image"], ["Prompt", String(prompt).slice(0, 80)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
      if (card) caption = card;
    } catch { /* best-effort, caption lama dipakai */ }
    const payload = buf
      ? { image: buf, caption }
      : { image: { url: imgUrl }, caption };
    await sock.sendMessage(m.chat, payload, { quoted: m });
  } catch (e) {
    const msg = String(e.message || e);
    const hint = /504|timeout|ETIMEDOUT/i.test(msg) ? "\n\nServer imagenya lagi lambat — coba lagi sebentar lagi." : "";
    return m.reply(raraWrap("Onepunya Image", `Gagal: ${msg.slice(0, 180)}${hint}`));
  }
}

export { pluginConfig as config, handler };
