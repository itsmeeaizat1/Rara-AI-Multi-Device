// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// clotheschanger — Ganti baju via AI (prompt ATAU gambar baju referensi)
// + preset gaya 1 kata (formal/casual/street/dll) + opsi HD (hd/hd2).
// Engine: nano-banana chain (live3d → kuroneko → FGSI) — pola .editimg,
// dengan prompt engineering khusus ganti baju + jaga wajah/pose/background.
import { Img2Img } from "../../src/scraper/img2img.js";
import { live3d } from "../../src/scraper/seaart.js";
import { nanoBananaEdit, uploadToUguu } from "../../src/scraper/kuroneko.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { polishImage, upscaleImage } from "../../src/lib/nova-remini-ffmpeg.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aiclotheschanger",
  alias: ["aiclotheschanger"],
  category: 'ai image',
  description: "Ganti baju di foto pakai AI — prompt, preset gaya, atau gambar baju",
  usage: ".aiclotheschanger <prompt/preset> (reply foto orang)\n.aiclotheschanger hd <preset/prompt> (hasil jernih)\n.aiclotheschanger hd2 <preset/prompt> (hasil 2x lebih besar)\n.aiclotheschanger (reply foto orang + kirim gambar baju)",
  example: ".aiclotheschanger change the shirt to red (reply foto)\n.aiclotheschanger formal (reply foto)\n.aiclotheschanger hd street (reply foto)\n.aiclotheschanger (reply foto orang, sambil kirim gambar baju)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

// ── Preset gaya 1 kata → prompt outfit lengkap (ID + EN) ──
export const PRESET_STYLES = {
  formal: "an elegant formal outfit: a tailored dark suit with a crisp white dress shirt and a matching tie",
  resmi: "an elegant formal outfit: a tailored dark suit with a crisp white dress shirt and a matching tie",
  business: "smart business attire: a navy blazer over a light blue button-up shirt with slim-fit chinos",
  kantoran: "smart business attire: a navy blazer over a light blue button-up shirt with slim-fit chinos",
  kerja: "smart business attire: a navy blazer over a light blue button-up shirt with slim-fit chinos",
  casual: "a casual everyday outfit: a fitted t-shirt with classic denim jeans and clean white sneakers",
  santai: "a casual everyday outfit: a fitted t-shirt with classic denim jeans and clean white sneakers",
  party: "a glamorous party outfit: stylish evening wear with bold details and a polished, fashionable look",
  pesta: "a glamorous party outfit: stylish evening wear with bold details and a polished, fashionable look",
  glam: "a glamorous party outfit: stylish evening wear with bold details and a polished, fashionable look",
  street: "urban streetwear: an oversized graphic hoodie with cargo pants and chunky sneakers",
  streetwear: "urban streetwear: an oversized graphic hoodie with cargo pants and chunky sneakers",
  sport: "athletic wear: a quick-dry sports t-shirt with joggers and running shoes",
  olahraga: "athletic wear: a quick-dry sports t-shirt with joggers and running shoes",
  gym: "athletic wear: a quick-dry sports t-shirt with joggers and running shoes",
  vacation: "a vacation beach outfit: a floral Hawaiian shirt with shorts and sunglasses",
  liburan: "a vacation beach outfit: a floral Hawaiian shirt with shorts and sunglasses",
  pantai: "a vacation beach outfit: a floral Hawaiian shirt with shorts and sunglasses",
  winter: "a winter outfit: a warm knit sweater with a padded parka jacket and dark jeans",
  dingin: "a winter outfit: a warm knit sweater with a padded parka jacket and dark jeans",
  korea: "trendy Korean K-fashion: a layered oversized jacket over a turtleneck with wide-leg trousers",
  kpop: "trendy Korean K-fashion: a layered oversized jacket over a turtleneck with wide-leg trousers",
};

/** Expand preset di awal prompt → outfit lengkap + detail sisa tetap nempel. */
export function expandPreset(prompt) {
  if (!prompt) return { expanded: "", preset: "" };
  const words = prompt.trim().split(/\s+/);
  const key = words[0].toLowerCase();
  if (PRESET_STYLES[key]) {
    const rest = words.slice(1).join(" ").trim();
    return { expanded: PRESET_STYLES[key] + (rest ? `, ${rest}` : ""), preset: key };
  }
  return { expanded: prompt, preset: "" };
}

/** Pisahin flag HD (hd / hd2 / 2k / 4k) dari prompt. */
export function parseHdFlag(prompt) {
  if (!prompt) return { hd: "", prompt: "" };
  const m = prompt.match(/\b(hd2|2k|hd|4k)\b/i);
  if (!m) return { hd: "", prompt: prompt.trim() };
  const flag = m[1].toLowerCase();
  const clean = prompt.replace(m[0], " ").replace(/\s+/g, " ").trim();
  if (flag === "4k") return { hd: "2x", prompt: clean }; // 2x dari hasil AI (aman, gak lempar 16000px)
  if (flag === "2k" || flag === "hd2") return { hd: "2x", prompt: clean };
  return { hd: "polish", prompt: clean };
}

// ── Prompt engineering ganti baju — wajib jaga wajah/pose/background ──
export function buildEditPrompt(userPrompt, clothesDesc) {
  let target;
  if (clothesDesc) {
    target = `Change the person's outfit to match this reference: ${clothesDesc}`;
    if (userPrompt) target += `. Additional detail from user: ${userPrompt}`;
  } else {
    target = `Change the person's outfit to: ${userPrompt}`;
  }
  return `${target}. Keep the same person — face, identity, skin tone, hairstyle, body shape, pose, and the background must stay EXACTLY the same. Only the clothing changes. The new outfit must fit naturally with realistic fabric, folds and shadows. Photorealistic, high quality photo.`;
}

// ── Deteksi baju dari gambar referensi (vision chain) ──
const CLOTHES_Q =
  "Describe ONLY the clothing/outfit shown in this image, for use in an AI photo editor. " +
  "Include: garment type (shirt/dress/jacket/etc), colors, material, pattern, style, and fit. " +
  "Answer in English, maximum 80 words, plain text only. " +
  "If there is absolutely no clothing visible in the image, reply with only the word: BUKAN_BAJU";

export function parseClothesDesc(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (/BUKAN_BAJU/i.test(t)) return null;
  const clean = t.replace(/```(json|text)?/gi, "").trim().replace(/^["']|["']$/g, "").trim();
  return clean.length >= 8 ? clean.slice(0, 600) : null;
}

// ── Seam e2e: dependency bisa di-inject biar tes gak nyamber API live ──
let depVision = visionScan;
let depLive3d = live3d;
let depNanoBananaEdit = nanoBananaEdit;
let depUploadToUguu = uploadToUguu;
let depImg2Img = Img2Img;
let depPolish = polishImage;
let depUpscale = upscaleImage;
export function _setClothesDepsForTest({ vision, live3d: l3, nanoBanana, uguu, img2img, polish, upscale } = {}) {
  if (vision) depVision = vision;
  if (l3) depLive3d = l3;
  if (nanoBanana) depNanoBananaEdit = nanoBanana;
  if (uguu) depUploadToUguu = uguu;
  if (img2img) depImg2Img = img2img;
  if (polish) depPolish = polish;
  if (upscale) depUpscale = upscale;
}

// ── Engine nano-banana kuroneko: upload → edit → download buffer ──
async function kuronekoEdit(buffer, prompt) {
  const imgUrl = await depUploadToUguu(buffer, "img.jpg");
  const editedUrl = await depNanoBananaEdit(imgUrl, prompt);
  const axios = (await import("axios")).default;
  const dl = await axios.get(editedUrl, { responseType: "arraybuffer", timeout: 60000 });
  if (!dl.data || dl.data.length < 5000) throw new Error("hasil edit kosong");
  return Buffer.from(dl.data);
}

// ── Pastikan hasil jadi Buffer (URL → download) ──
async function toBuffer(result) {
  if (Buffer.isBuffer(result)) return result;
  const axios = (await import("axios")).default;
  const res = await axios.get(result, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

// ── Poles/upscale hasil sesuai flag hd ──
async function applyHd(buffer, hdMode) {
  if (hdMode === "polish") return depPolish(buffer);
  if (hdMode === "2x") return depUpscale(buffer, 2);
  return buffer;
}

async function downloadImage(m) {
  try {
    const buf = await m.download();
    return buf && buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

async function downloadQuoted(m) {
  try {
    if (!m.quoted || !m.quoted.isMedia) return null;
    const buf = await m.quoted.download();
    return buf && buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const cmd = "aiclotheschanger";

    // ── Deteksi foto: reply = foto orang, attachment di pesan command = gambar baju ──
    const quotedIsImage = !!(m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.isMedia));
    const msgIsImage = !!(m.isImage || m.isMedia);
    const rawPrompt = (m.text || m.args?.join(" ") || "").trim();
    const { hd: hdMode, prompt: prompt0 } = parseHdFlag(rawPrompt);
    let prompt = prompt0;

    let personBuf = null;
    let clothesBuf = null;

    if (quotedIsImage) {
      personBuf = await downloadQuoted(m);
      if (msgIsImage) clothesBuf = await downloadImage(m);
    } else if (msgIsImage) {
      // tanpa reply → satu gambar = foto orang
      personBuf = await downloadImage(m);
    }

    if (!personBuf) {
      const styleList = Object.keys(PRESET_STYLES).filter((k, i, a) => a.indexOf(k) === i && !["resmi", "kantoran", "kerja", "santai", "pesta", "glam", "streetwear", "olahraga", "gym", "liburan", "pantai", "dingin", "kpop"].includes(k)).join(", ");
      await m.reply(
        `👕 *${toSC("ganti baju ai")}*\n\n` +
        `${toSC("kirim/reply foto orangnya dulu")}!\n\n` +
        `1. ${prefix}${cmd} <${toSC("prompt baju")}> — ${toSC("reply foto orang")}\n` +
        `2. ${prefix}${cmd} <${toSC("preset")}> — ${toSC("reply foto orang")}\n   ${toSC("preset")}: ${styleList}\n` +
        `3. ${prefix}${cmd} — ${toSC("reply foto orang, sambil kirim gambar bajunya")}\n\n` +
        `✨ hd = ${toSC("hasil jernih")} | hd2/2k = ${toSC("hasil 2x lebih besar")}\n\n` +
        `${toSC("contoh")}: ${prefix}${cmd} change the shirt to red | ${prefix}${cmd} hd formal`
      );
      return;
    }

    if (!prompt && !clothesBuf) {
      await m.react("❌");
      return m.reply(
        claraWrap(cmd,
          `Kasih *${toSC("prompt baju")}*, *${toSC("preset")}*, ATAU *${toSC("kirim gambar bajunya")}*!\n\n` +
          `${toSC("preset")}: formal, casual, party, street, sport, vacation, winter, korea\n` +
          `${toSC("contoh prompt")}: ${prefix}${cmd} change the shirt to red\n` +
          `${toSC("contoh gambar")}: ${prefix}${cmd} — ${toSC("reply foto orang + kirim gambar baju, tanpa prompt")}`, "guide")
      );
    }

    await m.react("🧠");

    // ── Deskripsi baju dari gambar referensi (mode gambar) ──
    let clothesDesc = null;
    if (clothesBuf) {
      const res = await depVision({
        imageBuffer: clothesBuf,
        question: CLOTHES_Q,
        sessionKey: null,
      }).catch((e) => ({ status: false, error: e.message }));

      clothesDesc = res?.status ? parseClothesDesc(res.text) : null;
      if (!clothesDesc) {
        await m.react("❌");
        return m.reply(claraWrap(cmd,
          res?.status
            ? `${toSC("gambarnya gak kedeteksi sebagai baju")} — ${toSC("kirim foto baju yang jelas, atau pakai prompt")}.`
            : `${toSC("gagal baca gambar baju")} — ${toSC("pakai prompt aja")}: ${prefix}${cmd} change the shirt to red`, "error"));
      }
    }

    // ── Preset gaya: expand cuma di mode prompt (mode gambar = desc yang ngatur) ──
    let presetUsed = "";
    if (!clothesDesc && prompt) {
      const { expanded, preset } = expandPreset(prompt);
      if (preset) {
        prompt = expanded;
        presetUsed = preset;
      }
    }

    const editPrompt = buildEditPrompt(prompt, clothesDesc);
    await m.react("🛠️");

    // ── Rantai engine edit (pola .editimg): nano-banana duluan ──
    let result = null;
    let usedApi = "";

    // 1. live3d (nano-banana) — paling bagus
    try {
      const res = await depLive3d(personBuf, editPrompt);
      if (res.image) {
        result = res.image;
        usedApi = "nano-banana";
      }
    } catch (e) {
      console.error("clotheschanger live3d:", e.message);
    }

    // 2. nano-banana via KuroNeko (upload uguu dulu)
    if (!result) {
      try {
        result = await kuronekoEdit(personBuf, editPrompt);
        usedApi = "nano-banana (kuronoko)";
      } catch (e) {
        console.error("clotheschanger kuroneko:", e.message);
      }
    }

    // 3. Img2Img (FGSI) — cadangan
    if (!result) {
      try {
        const res = await depImg2Img(editPrompt, personBuf, "edit.png");
        if (res.status && res.result) {
          result = res.result;
          usedApi = "img2img";
        }
      } catch (e) {
        console.error("clotheschanger img2img:", e.message);
      }
    }

    if (!result) {
      await m.react("❌");
      return m.reply(claraWrap(cmd, "Semua engine edit gambar lagi down. Coba lagi beberapa menit.", "error"));
    }

    // ── Opsi HD: poles/upscale hasil (fail-safe — gagal → kirim asli) ──
    let hdNote = "";
    if (hdMode) {
      try {
        const buf = await toBuffer(result);
        const hd = await applyHd(buf, hdMode);
        if (Buffer.isBuffer(hd) && hd.length > 1000) {
          result = hd;
          hdNote = hdMode === "2x" ? "2x HD" : "HD";
        }
      } catch (e) {
        console.error("clotheschanger hd:", e.message);
      }
    }

    await m.react("🐣");

    // ── Caption hasil ──
    const short = clothesDesc
      ? clothesDesc.replace(/\s+/g, " ").slice(0, 90)
      : prompt.slice(0, 90);
    let caption = "";
    caption += `👕 *${toSC("ganti baju ai")}*\n`;
    caption += `🎯 ${toSC("sumber")}: *${toSC(clothesDesc ? "gambar baju" : presetUsed ? `preset ${presetUsed}` : "prompt")}*\n`;
    if (short) caption += `✨ ${toSC("model baju")}: *${short}*\n`;
    caption += `⚙️ ${toSC("engine")}: *${usedApi}*`;
    if (hdNote) caption += ` | ✨ *${hdNote}${toSC("hd")}*`;

    if (Buffer.isBuffer(result)) {
      await sock.sendMedia(m.chat, result, null, m, { type: "image", caption });
    } else {
      try {
        const imgBuf = await toBuffer(result);
        await sock.sendMedia(m.chat, imgBuf, null, m, { type: "image", caption });
      } catch {
        await m.reply(caption + "\n\n" + result);
      }
    }
  } catch (err) {
    console.error("clotheschanger error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aiclotheschanger", (te.novaError && te.novaError(err)) || "Gagal memproses, coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
