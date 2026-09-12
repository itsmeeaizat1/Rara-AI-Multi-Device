// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// clotheschanger — Ganti baju via AI (prompt ATAU gambar baju referensi)
// Engine: nano-banana chain (live3d → kuroneko → FGSI) — pola .editimg,
// dengan prompt engineering khusus ganti baju + jaga wajah/pose/background.
import { Img2Img } from "../../src/scraper/img2img.js";
import { live3d } from "../../src/scraper/seaart.js";
import { nanoBananaEdit, uploadToUguu } from "../../src/scraper/kuroneko.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aiclotheschanger",
  alias: ["aiclotheschanger"],
  category: 'ai image',
  description: "Ganti baju di foto pakai AI — ketik mau pakai baju apa, atau kirim gambar bajunya",
  usage: ".aiclotheschanger <prompt baju> (reply foto orang)\n.aiclotheschanger (reply foto orang + kirim gambar baju)",
  example: ".aiclotheschanger change the shirt to red (reply foto)\n.aiclotheschanger pakai jas hitam formal (reply foto)\n.aiclotheschanger (reply foto orang, sambil kirim gambar baju)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

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
  const clean = t.replace(/```(json|text)?/gi, "").trim().replace(/^['"]|['"]$/g, "").trim();
  return clean.length >= 8 ? clean.slice(0, 600) : null;
}

// ── Seam e2e: dependency bisa di-inject biar tes gak nyamber API live ──
let depVision = visionScan;
let depLive3d = live3d;
let depNanoBananaEdit = nanoBananaEdit;
let depUploadToUguu = uploadToUguu;
let depImg2Img = Img2Img;
export function _setClothesDepsForTest({ vision, live3d: l3, nanoBanana, uguu, img2img } = {}) {
  if (vision) depVision = vision;
  if (l3) depLive3d = l3;
  if (nanoBanana) depNanoBananaEdit = nanoBanana;
  if (uguu) depUploadToUguu = uguu;
  if (img2img) depImg2Img = img2img;
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
    const prompt = (m.text || m.args?.join(" ") || "").trim();

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
      await m.reply(
        `👕 *${toSC("ganti baju ai")}*\n\n` +
        `${toSC("kirim/reply foto orangnya dulu")}!\n\n` +
        `1. ${prefix}${cmd} <${toSC("prompt baju")}> — ${toSC("reply foto orang")}\n` +
        `2. ${prefix}${cmd} — ${toSC("reply foto orang, sambil kirim gambar bajunya")}\n\n` +
        `${toSC("contoh")}: ${prefix}${cmd} change the shirt to red`
      );
      return;
    }

    if (!prompt && !clothesBuf) {
      await m.react("❌");
      return m.reply(
        claraWrap(cmd,
          `Kasih *${toSC("prompt baju")}* ATAU *${toSC("kirim gambar bajunya")}*!\n\n` +
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

    await m.react("🐣");

    // ── Caption hasil ──
    const short = clothesDesc
      ? clothesDesc.replace(/\s+/g, " ").slice(0, 90)
      : prompt.slice(0, 90);
    let caption = "";
    caption += `👕 *${toSC("ganti baju ai")}*\n`;
    caption += `🎯 ${toSC("sumber")}: *${toSC(clothesDesc ? "gambar baju" : "prompt")}*\n`;
    if (short) caption += `✨ ${toSC("model baju")}: *${short}*\n`;
    caption += `⚙️ ${toSC("engine")}: *${usedApi}*`;

    if (Buffer.isBuffer(result)) {
      await sock.sendMedia(m.chat, result, null, m, { type: "image", caption });
    } else {
      try {
        const axios = (await import("axios")).default;
        const imgRes = await axios.get(result, { responseType: "arraybuffer", timeout: 30000 });
        const imgBuf = Buffer.from(imgRes.data);
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
