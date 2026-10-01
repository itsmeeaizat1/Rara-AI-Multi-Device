// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// onephoto.js — Onepunya API: UPSCALE_IMAGE (GFPGAN/RestoreFormer) + REMOVE_BG.
// .oneupscale <reply foto> [model] [rescale] — perbaiki/enhance wajah & foto lama
//   model: GFPGANv1.2 | GFPGANv1.3 | GFPGANv1.4 (default) | RestoreFormer
//   rescale: 1-4 (default 2)
// .onenobg <reply foto> — hapus background foto
// Alur: foto WA di-download → di-upload ke host publik (nova-uploader) → URL dikirim ke API
// (API Onepunya cuma terima image URL, bukan buffer/base64).
import axios from "axios";
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { upscaleImage, removeBg } from "../../src/lib/nova-onepunya.js";
import { uploadImage } from "../../src/lib/nova-uploader.js";

const pluginConfig = {
  name: "onephoto",
  alias: ["oneupscale", "onenobg", "onerestore", "onebgremove"],
  category: "tools",
  description: "Enhance foto (GFPGAN) & hapus background via Onepunya API",
  usage: ".oneupscale <reply foto> [model] · .onenobg <reply foto>",
  example: "reply foto → .oneupscale GFPGANv1.4 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 4,
  isEnabled: true,
};

const MODELS = ["GFPGANv1.2", "GFPGANv1.3", "GFPGANv1.4", "RestoreFormer"];

async function getQuotedImageUrl(m) {
  if (!m.quoted || !(m.quoted.isMedia || m.quoted.isImage)) return null;
  const buf = await m.quoted.download();
  if (!buf || !buf.length) return null;
  return uploadImage(Buffer.from(buf), "onepunya-input.jpg");
}

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const args = m.args || [];
  const apiKey = getApiKey("onepunya");

  try {
    const imgUrl = await getQuotedImageUrl(m);
    if (!imgUrl) {
      return m.reply(claraWrap("Onepunya Photo", `Reply/kutip sebuah foto dengan command ini!\n\nContoh: reply foto → .${cmd === "onenobg" || cmd === "onebgremove" ? "onenobg" : "oneupscale"}`));
    }

    // ── Hapus background ──
    if (cmd === "onenobg" || cmd === "onebgremove") {
      const res = await removeBg(apiKey, imgUrl);
      const out = res?.url || "";
      if (!out) throw new Error("Server gak balikin hasil.");
      const dl = await axios.get(out, { responseType: "arraybuffer", timeout: 120_000 });
      await sock.sendMessage(m.chat, { image: Buffer.from(dl.data), caption: "✨ Background dihapus — Onepunya API" }, { quoted: m });
      return;
    }

    // ── Upscale / restore ──
    let model = (args[0] || "GFPGANv1.4");
    let rescale = 2;
    const args2 = [...args];
    if (MODELS.includes(args2[0]?.toUpperCase?.() || "")) { model = args2.shift().toUpperCase(); }
    if (/^[1-4]$/.test(args2[0] || "")) { rescale = parseInt(args2.shift(), 10); }
    if (!MODELS.includes(model)) {
      return m.reply(claraWrap("Onepunya Photo", `Model gak valid: ${model}\n\nYang tersedia: ${MODELS.join(" | ")}`));
    }
    const res = await upscaleImage(apiKey, imgUrl, model, rescale);
    const out = res?.url || "";
    if (!out) throw new Error("Server gak balikin hasil.");
    const dl = await axios.get(out, { responseType: "arraybuffer", timeout: 120_000 });
    await sock.sendMessage(m.chat, { image: Buffer.from(dl.data), caption: `🪄 ${model} · rescale ${rescale}x — Onepunya API` }, { quoted: m });
  } catch (e) {
    return m.reply(claraWrap("Onepunya Photo", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
