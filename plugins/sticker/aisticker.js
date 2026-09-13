// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: AI Sticker Generator
 * Fitur: .aisticker <prompt> — AI (nano-banana) bikin gambar dari teks
 *        → otomatis dikirim jadi sticker webp. First-ever sticker
 *        generator AI di bot. Opsi: hd / 2k / 4k (upscale sebelum
 *        dijadiin sticker).
 */
import { callImageGenChain } from "../../src/lib/nova-ai-service.js";
import { upscaleImage, polishImage } from "../../src/lib/nova-remini-ffmpeg.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aisticker",
  alias: ["aisticker", "stickergen", "stikerai"],
  category: "sticker",
  description: "Bikin sticker dari teks pakai AI (nano-banana)",
  usage: ".aisticker <deskripsi>",
  example: ".aisticker kucing astronot lucu\n.aisticker hd pepaya ngedance",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

/** Pisahin flag HD (hd / hd2 / 2k / 4k) dari prompt — pola aiclotheschanger. */
export function parseHdFlag(prompt) {
  if (!prompt) return { hd: "", prompt: "" };
  const m = prompt.match(/\b(hd2|2k|hd|4k)\b/i);
  if (!m) return { hd: "", prompt: prompt.trim() };
  const flag = m[1].toLowerCase();
  const clean = prompt.replace(m[0], " ").replace(/\s+/g, " ").trim();
  if (flag === "4k" || flag === "2k" || flag === "hd2") return { hd: "2x", prompt: clean };
  return { hd: "polish", prompt: clean };
}

/** Prompt engineering biar hasilnya BENERAN kayak sticker:
 *  die-cut, outline tebal, background bersih, square, tanpa teks. */
export function buildStickerPrompt(userPrompt) {
  const p = String(userPrompt || "").trim() || "kucing lucu";
  return (
    `Cute die-cut sticker illustration of: ${p}. ` +
    "Chibi style, bold clean outlines, vibrant colors, simple flat pastel background, " +
    "centered composition filling the frame, high quality, detailed, no text, square format."
  );
}

// seam e2e: ganti fungsi gen biar gak perlu jaringan beneran
let _genFn = (prompt, opts) => callImageGenChain(prompt, opts);
export function _setAiStickerGenForTest(fn) { _genFn = fn; }
export function _resetAiStickerGenForTest() { _genFn = (prompt, opts) => callImageGenChain(prompt, opts); }
let _upscaleFn = upscaleImage;
let _polishFn = polishImage;
export function _setAiStickerHdForTest(up, po) { _upscaleFn = up || _upscaleFn; _polishFn = po || _polishFn; }

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const rawPrompt = (args || []).join(" ").trim();

  if (!rawPrompt) {
    return m.reply(
      claraWrap("AI Sticker", [
        "Bikin sticker dari teks pakai AI — langsung jadi sticker, gak perlu foto!",
        "",
        "Cara pakai:",
        `${prefix}aisticker kucing astronot lucu`,
        `${prefix}aisticker hd pepaya ngedance`,
        "",
        "Flag: hd (dipoles) | hd2 / 2k / 4k (2x lebih tajam)",
        "Semakin detail deskripsinya, semakin bagus hasilnya ✨",
      ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}aisticker kucing astronot lucu`)
    );
  }

  const { hd: hdMode, prompt: cleanPrompt } = parseHdFlag(rawPrompt);
  const stickerPrompt = buildStickerPrompt(cleanPrompt);

  await m.react("🧠");
  try {
    const img = await _genFn(stickerPrompt, { ratio: "1:1" }); // sticker selalu square
    if (!img?.base64) throw new Error("hasil generasi kosong");
    let buf = Buffer.from(img.base64, "base64");

    await m.react("🛠️");

    // opsi HD — polis/upscale SEBELUM dijadiin sticker
    let hdNote = "";
    if (hdMode === "polish") {
      try {
        buf = await _polishFn(buf);
        hdNote = " (HD: dipoles)";
      } catch (e) { console.error("[aisticker] polish:", e.message); }
    } else if (hdMode === "2x") {
      try {
        buf = await _upscaleFn(buf, 2);
        hdNote = " (HD 2x)";
      } catch (e) { console.error("[aisticker] upscale:", e.message); }
    }

    const packname = botConfig?.sticker?.packname || botConfig?.bot?.name || "Nova-AI";
    const author = botConfig?.sticker?.author || botConfig?.owner?.name || "Bot";

    await sock.sendImageAsSticker(m.chat, buf, m, { packname, author });
    await m.react("🐣");
    await m.reply(
      claraWrap("AI Sticker", [
        "✅ Sticker AI jadi!",
        `🎨 Prompt: ${cleanPrompt}`,
        `⚡ Engine: ${img.via || "nano-banana"}${hdNote}`,
      ].join("\n"))
    );
  } catch (e) {
    console.error("[aisticker]", e.message || e);
    await m.react("❌");
    await m.reply(
      claraWrap("AI Sticker", [
        "❌ Gagal bikin sticker AI.",
        "",
        "Engine AI lagi sibuk/down — coba lagi bentar lagi ya.",
      ].join("\n"))
    );
  }
}

export { pluginConfig as config, handler };
