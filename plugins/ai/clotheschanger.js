// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// clotheschanger — Keluarga fitur edit foto AI 1 command:
// .aiclotheschanger (ganti baju — prompt/preset/gambar baju)
// .aiclotheschangerfaceswap (tukar wajah 2 foto)
// .aiclotheschangerage (ubah umur) | .aiclotheschangerhair (ubah rambut)
// .aiclotheschangergender (ganti gender) | .aiclotheschangerbg (ganti background)
// .aiclotheschangerhapus (hapus objek)
// Engine: nano-banana chain (live3d → kuroneko → FGSI) + flag hd.
import { Img2Img } from "../../src/scraper/img2img.js";
import { live3d } from "../../src/scraper/seaart.js";
import { nanoBananaEdit, uploadToUguu } from "../../src/scraper/kuroneko.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { polishImage, upscaleImage } from "../../src/lib/nova-remini-ffmpeg.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aiclotheschanger",
  alias: [
    "aiclotheschanger",
    "aiclotheschangerfaceswap",
    "aiclotheschangerage",
    "aiclotheschangerhair",
    "aiclotheschangergender",
    "aiclotheschangerbg",
    "aiclotheschangerhapus",
  ],
  category: "ai image",
  description: "Keluarga edit foto AI: ganti baju, face swap, umur, rambut, gender, background, hapus objek",
  usage:
    ".aiclotheschanger <prompt/preset> (reply foto) — ganti baju\n" +
    ".aiclotheschangerfaceswap (reply foto target + kirim foto wajah)\n" +
    ".aiclotheschangerage <tua|muda|anak|bayi|1-100> (reply foto)\n" +
    ".aiclotheschangerhair <prompt/preset rambut> (reply foto)\n" +
    ".aiclotheschangergender <cewek|cowok> (reply foto)\n" +
    ".aiclotheschangerbg <prompt background> (reply foto)\n" +
    ".aiclotheschangerhapus <objek> (reply foto)\n" +
    "tambah hd (jernih) / hd2 (2x) di semua fitur",
  example:
    ".aiclotheschanger hd formal (reply foto)\n" +
    ".aiclotheschangerfaceswap (reply foto + kirim foto wajah)\n" +
    ".aiclotheschangerage tua\n" +
    ".aiclotheschangerhair pakis\n" +
    ".aiclotheschangergender cewek\n" +
    ".aiclotheschangerbg pantai bali\n" +
    ".aiclotheschangerhapus kursi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

// ══════════════════════ GANTI BAJU (base) ══════════════════════

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
  batik: "an elegant Indonesian batik outfit: a long-sleeved batik shirt with traditional parang pattern paired with neat dark trousers",
  kebaya: "a traditional Indonesian kebaya outfit: an ornate lace kebaya blouse with a batik wrap skirt (kain), elegant and graceful",
  beskap: "a traditional Javanese beskap outfit: a fitted traditional beskap jacket with batik motif, worn with a blangkon headdress and a keris",
  koko: "a neat Muslim men's outfit: a white koko shirt (baju koko) with dark trousers and a peci cap",
  muslim: "a neat Muslim men's outfit: a white koko shirt (baju koko) with dark trousers and a peci cap",
  gamis: "a graceful Muslim women's outfit: a flowing modest gamis dress in soft pastel color with a matching hijab",
  hijab: "a graceful Muslim women's outfit: a flowing modest gamis dress in soft pastel color with a matching hijab",
  muslimah: "a graceful Muslim women's outfit: a flowing modest gamis dress in soft pastel color with a matching hijab",
  preppy: "a preppy outfit: a collared polo shirt with a light knit sweater vest, tailored shorts and loafers",
  vintage: "a vintage retro outfit: a 70s-style brown corduroy jacket with flared jeans and a patterned shirt",
  dandy: "a dandy outfit: a three-piece tweed suit with a pocket watch chain, brogues and a flat cap",
  punk: "an edgy punk outfit: a black leather biker jacket with ripped jeans, band tee and combat boots",
  sekolah: "an Indonesian school uniform: a crisp white short-sleeve shirt with a red tie, grey shorts or a navy skirt and black shoes",
  pramuka: "an Indonesian scout (Pramuka) uniform: a brown short-sleeve shirt with scout badges, a brown scarf with a woggle, and dark shorts",
  pengantin: "elegant Indonesian wedding attire: a luxurious white wedding outfit with intricate embroidery and a veil, formal and radiant",
  wedding: "elegant Indonesian wedding attire: a luxurious white wedding outfit with intricate embroidery and a veil, formal and radiant",
  halloween: "a spooky Halloween outfit: a dark witch robe with a pointed hat, or a vampire cape with Victorian gothic clothing",
  kimono: "a traditional Japanese kimono: an elegant silk kimono with a floral pattern and a wide obi belt",
  hanbok: "a traditional Korean hanbok: a vibrant jeogori jacket with a high-waisted chima skirt, elegant and colorful",
  ninja: "a ninja outfit: an all-black shinobi suit with a face mask and a utility belt, stealthy and sleek",
  cowboy: "a cowboy western outfit: a denim shirt with a leather vest, blue jeans, cowboy boots and a wide-brim hat",
  "90s": "a 90s retro outfit: a baggy flannel plaid shirt over a graphic band tee with wide-leg jeans and chunky sneakers",
  "y2k": "a Y2K early-2000s outfit: a baby tee with low-rise flared jeans, a mini shoulder bag and tinted sunglasses",
  army: "a military outfit: camouflaged combat fatigues with a utility vest and lace-up combat boots",
  militer: "a military outfit: camouflaged combat fatigues with a utility vest and lace-up combat boots",
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
  if (flag === "4k") return { hd: "2x", prompt: clean };
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

// ══════════════════════ PROMPT BUILDER FITUR KELUARGA ══════════════════════

/** .aiclotheschangerage — ubah umur */
export function buildAgePrompt(arg) {
  const a = (arg || "").toLowerCase().trim();
  let target;
  if (/^tua|^lansia|^old/.test(a)) target = "a 70-year-old elderly version";
  else if (/^muda|^young|^remaja/.test(a)) target = "a 20-year-old young adult version";
  else if (/^anak|^child|^kid/.test(a)) target = "an 8-year-old child version";
  else if (/^bayi|^baby/.test(a)) target = "a 1-year-old baby version";
  else {
    const n = parseInt(a, 10);
    if (!n || n < 1 || n > 100) return null;
    target = `a ${n}-year-old version`;
  }
  return `Transform the person in the photo into ${target} of themselves. It must clearly be the SAME PERSON — keep their recognizable facial features, identity and skin tone, just aged appropriately. Keep the clothing, pose, lighting and background exactly the same. Only the age changes. Photorealistic, high quality photo.`;
}

/** .aiclotheschangerhair — ubah rambut (preset cepat + bebas) */
export const HAIR_PRESETS = {
  botak: "a completely bald head, smooth and natural",
  cepak: "a short buzz cut hairstyle, neat and clean",
  panjang: "long flowing hair down to the shoulders",
  ikal: "curly hair, natural voluminous curls",
  pakis: "the iconic Korean-style two-block mullet haircut (pakis), trendy and fluffy with flowing middle-parted bangs",
  undercut: "a sharp undercut with slicked-back top hair",
  dread: "dreadlocks, long natural locs",
  mohawk: "a bold mohawk with shaved sides",
  pirang: "blonde hair, natural color",
  hitam: "natural jet black hair",
};

export function buildHairPrompt(arg) {
  if (!arg) return null;
  const words = arg.trim().split(/\s+/);
  const key = words[0].toLowerCase();
  const rest = words.slice(1).join(" ").trim();
  const style = HAIR_PRESETS[key] ? HAIR_PRESETS[key] + (rest ? `, ${rest}` : "") : arg;
  return `Change the person's hairstyle to: ${style}. Keep the same person — face, identity, skin tone and body shape must stay exactly the same, along with the clothing, pose and background. Only the hair changes. The new hairstyle must blend naturally with realistic hair texture. Photorealistic, high quality photo.`;
}

/** .aiclotheschangergender — ganti tampilan gender */
export function buildGenderPrompt(arg) {
  const a = (arg || "").toLowerCase().trim();
  let target;
  if (/^cewek|^wanita|^perempuan|^cewe|^girl|^woman|^female/.test(a)) target = "a woman";
  else if (/^cowok|^cowo|^pria|^laki|^guy|^man|^male|^boy/.test(a)) target = "a man";
  else return null;
  return `Transform the person in the photo to look like ${target} — the opposite gender version of themselves. Keep it clearly the SAME PERSON: same facial identity vibe, same skin tone, same pose and background. Adjust the facial features, hairstyle and body shape naturally to the new gender, and adapt the outfit accordingly so it looks natural. Photorealistic, high quality photo.`;
}

/** .aiclotheschangerbg — ganti background */
export function buildBgPrompt(arg) {
  if (!arg || !arg.trim()) return null;
  return `Replace the background of the photo with: ${arg.trim()}. The person (or main subject) must stay EXACTLY the same — face, identity, clothing, pose, body shape, all untouched. Blend the subject naturally into the new background with matching lighting, shadows and perspective. Photorealistic, high quality photo.`;
}

/** .aiclotheschangerhapus — hapus objek */
export function buildRemovePrompt(arg) {
  if (!arg || !arg.trim()) return null;
  return `Remove the following from the photo completely: ${arg.trim()}. Fill in the area where it was with natural, realistic surroundings that match the rest of the scene. Everything else must stay exactly the same — do not change any other part of the photo. Photorealistic, seamless result.`;
}

/** .aiclotheschangerfaceswap — tukar wajah dari deskripsi wajah sumber */
export function buildFaceSwapPrompt(faceDesc, userPrompt) {
  let p = `Replace the person's face in the photo with this face: ${faceDesc}. Keep everything else exactly the same — hairstyle, clothing, pose, body shape and background. The new face must blend naturally with matching skin tone, lighting and perspective.`;
  if (userPrompt) p += ` Additional detail from user: ${userPrompt}.`;
  return p + " Photorealistic, high quality photo.";
}

// ══════════════════════ VISION ══════════════════════

// ── Deteksi baju dari gambar referensi (vision chain) ──
const CLOTHES_Q =
  "Describe ONLY the clothing/outfit shown in this image, for use in an AI photo editor. " +
  "Include: garment type (shirt/dress/jacket/etc), colors, material, pattern, style, and fit. " +
  "Answer in English, maximum 80 words, plain text only. " +
  "If there is absolutely no clothing visible in the image, reply with only the word: BUKAN_BAJU";

// ── Deteksi wajah dari foto sumber (face swap) ──
const FACE_Q =
  "Describe ONLY the face of the person shown in this image, for use in an AI face swap. " +
  "Include: gender, approximate age, face shape, eyes, eyebrows, nose, mouth, skin tone, and any distinctive features. " +
  "Answer in English, maximum 80 words, plain text only. " +
  "If there is no human face visible in the image, reply with only the word: BUKAN_WAJAH";

export function parseClothesDesc(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (/BUKAN_BAJU/i.test(t)) return null;
  const clean = t.replace(/```(json|text)?/gi, "").trim().replace(/^["']|["']$/g, "").trim();
  return clean.length >= 8 ? clean.slice(0, 600) : null;
}

export function parseFaceDesc(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (/BUKAN_WAJAH/i.test(t)) return null;
  const clean = t.replace(/```(json|text)?/gi, "").trim().replace(/^["']|["']$/g, "").trim();
  return clean.length >= 8 ? clean.slice(0, 600) : null;
}

// ══════════════════════ ENGINE + SEAM ══════════════════════

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

/** Rantai edit: live3d nano-banana → kuroneko → Img2Img. Throw kalau semua down. */
async function runEditChain(personBuf, editPrompt) {
  let result = null;
  let usedApi = "";
  try {
    const res = await depLive3d(personBuf, editPrompt);
    if (res.image) {
      result = res.image;
      usedApi = "nano-banana";
    }
  } catch (e) {
    console.error("clotheschanger live3d:", e.message);
  }
  if (!result) {
    try {
      result = await kuronekoEdit(personBuf, editPrompt);
      usedApi = "nano-banana (kuronoko)";
    } catch (e) {
      console.error("clotheschanger kuroneko:", e.message);
    }
  }
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
  if (!result) throw new Error("semua engine down");
  return { result, usedApi };
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

// ── Kirim hasil + caption (fail-safe URL → teks) ──
async function sendResult(sock, m, result, caption) {
  if (Buffer.isBuffer(result)) {
    await sock.sendMedia(m.chat, result, null, m, { type: "image", caption });
    return;
  }
  try {
    const imgBuf = await toBuffer(result);
    await sock.sendMedia(m.chat, imgBuf, null, m, { type: "image", caption });
  } catch {
    await m.reply(caption + "\n\n" + result);
  }
}

/** Alur inti bersama: react → chain → hd → caption → kirim. */
async function runFeature(m, sock, personBuf, editPrompt, meta, hdMode, cmd) {
  await m.react("🛠️");
  const { result, usedApi } = await runEditChain(personBuf, editPrompt);

  let finalResult = result;
  let hdNote = "";
  if (hdMode) {
    try {
      const buf = await toBuffer(result);
      const hd = await applyHd(buf, hdMode);
      if (Buffer.isBuffer(hd) && hd.length > 1000) {
        finalResult = hd;
        hdNote = hdMode === "2x" ? "2x HD" : "HD";
      }
    } catch (e) {
      console.error("clotheschanger hd:", e.message);
    }
  }

  await m.react("🐣");
  let caption = `${meta.emoji} *${toSC(meta.title)}*\n`;
  for (const line of meta.lines) {
    if (line) caption += line + "\n";
  }
  caption += `⚙️ ${toSC("engine")}: *${usedApi}*`;
  if (hdNote) caption += ` | ✨ *${toSC(hdNote)}*`;
  await sendResult(sock, m, finalResult, caption);
}

// ══════════════════════ HANDLER + DISPATCHER ══════════════════════

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const typed = (m.command || pluginConfig.name).toLowerCase();
    const suffix = typed.replace(/^aiclotheschanger/, "").toLowerCase();

    // ── Deteksi foto: reply = foto utama, attachment di pesan command = foto kedua ──
    const quotedIsImage = !!(m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.isMedia));
    const msgIsImage = !!(m.isImage || m.isMedia);
    const rawPrompt = (m.text || m.args?.join(" ") || "").trim();
    const { hd: hdMode, prompt: prompt0 } = parseHdFlag(rawPrompt);
    let prompt = prompt0;

    // ═══ .aiclotheschangerfaceswap — reply foto target + kirim foto wajah sumber ═══
    if (suffix === "faceswap") {
      let targetBuf = null;
      let faceBuf = null;
      if (quotedIsImage) {
        targetBuf = await downloadQuoted(m);
        if (msgIsImage) faceBuf = await downloadImage(m);
      } else if (msgIsImage) {
        faceBuf = await downloadImage(m);
      }
      if (!targetBuf || !faceBuf) {
        await m.react("❌");
        return m.reply(claraWrap(typed,
          `Butuh 2 foto!\n\n` +
          `1. ${toSC("reply")} foto *${toSC("target")}* (orang yang mau diganti wajahnya)\n` +
          `2. ${toSC("kirim")} foto *${toSC("sumber wajah")}* sambil ketik ${prefix}${typed}\n\n` +
          `Contoh: ${prefix}${typed} (reply foto target, kirim foto wajah baru)`, "guide"));
      }

      await m.react("🧠");
      const res = await depVision({ imageBuffer: faceBuf, question: FACE_Q, sessionKey: null })
        .catch((e) => ({ status: false, error: e.message }));
      const faceDesc = res?.status ? parseFaceDesc(res.text) : null;
      if (!faceDesc) {
        await m.react("❌");
        return m.reply(claraWrap(typed,
          res?.status
            ? `${toSC("gambarnya gak kedeteksi ada wajah")} — ${toSC("kirim foto yang wajahnya jelas")}.`
            : `${toSC("gagal baca foto wajah, coba lagi")}.`, "error"));
      }

      const editPrompt = buildFaceSwapPrompt(faceDesc, prompt);
      return await runFeature(m, sock, targetBuf, editPrompt, {
        emoji: "🎭",
        title: "face swap ai",
        lines: [`🎯 ${toSC("sumber wajah")}: *${toSC("foto kedua")}*`],
      }, hdMode, typed);
    }

    // ═══ .aiclotheschangerage / hair / gender / bg / hapus ═══
    if (["age", "hair", "gender", "bg", "hapus"].includes(suffix)) {
      const { buf } = await (async () => {
        try {
          if (m.quoted && (m.quoted.isMedia || m.quoted.isImage || m.quoted.type === "imageMessage")) {
            const b = await m.quoted.download();
            if (b && b.length > 500) return { buf: b };
          }
        } catch { /* lanjut */ }
        try {
          if (m.isImage || m.isMedia) {
            const b = await m.download();
            if (b && b.length > 500) return { buf: b };
          }
        } catch { /* lanjut */ }
        return { buf: null };
      })();

      let editPrompt = null;
      let meta = null;
      if (suffix === "age") {
        editPrompt = buildAgePrompt(prompt);
        meta = {
          emoji: "🕒", title: "ubah umur ai",
          lines: [`🎯 ${toSC("umur")}: *${toSC(prompt)}*`],
          guide: `Kasih umur yang bener!\n\nPilihan: tua | muda | anak | bayi | angka 1-100\nContoh: ${prefix}${typed} tua — reply foto orang`,
        };
      } else if (suffix === "hair") {
        editPrompt = buildHairPrompt(prompt);
        meta = {
          emoji: "💇", title: "ubah rambut ai",
          lines: [`✨ ${toSC("model")}: *${toSC((prompt || "").slice(0, 90))}*`],
          guide: `Kasih model rambutnya!\n\nPreset cepat: botak, cepak, panjang, ikal, pakis, undercut, dread, mohawk, pirang, hitam\nContoh: ${prefix}${typed} pakis — reply foto orang`,
        };
      } else if (suffix === "gender") {
        editPrompt = buildGenderPrompt(prompt);
        meta = {
          emoji: "🔄", title: "ganti gender ai",
          lines: [`🎯 ${toSC("jadi")}: *${toSC(prompt)}*`],
          guide: `Pilih dulu: *cewek* atau *cowok*!\n\nContoh: ${prefix}${typed} cewek — reply foto orang`,
        };
      } else if (suffix === "bg") {
        editPrompt = buildBgPrompt(prompt);
        meta = {
          emoji: "🏞️", title: "ganti background ai",
          lines: [`✨ ${toSC("background")}: *${toSC((prompt || "").slice(0, 90))}*`],
          guide: `Kasih background barunya!\n\nContoh: ${prefix}${typed} pantai bali — reply foto\nIde: kota tokyo malam, studio putih, taman bunga, pegunungan bersalju`,
        };
      } else {
        editPrompt = buildRemovePrompt(prompt);
        meta = {
          emoji: "🧹", title: "hapus objek ai",
          lines: [`🗑️ ${toSC("dihapus")}: *${toSC((prompt || "").slice(0, 90))}*`],
          guide: `Kasih objek yang mau dihapus!\n\nContoh: ${prefix}${typed} kursi — reply foto\nContoh lain: ${prefix}${typed} orang di belakang | ${prefix}${typed} tulisan di dinding`,
        };
      }

      if (!editPrompt) {
        await m.react("❌");
        return m.reply(claraWrap(typed, meta.guide, "guide"));
      }
      if (!buf) {
        return m.reply(claraWrap(typed, `Kirim/reply foto orangnya dulu!\n\n${meta.guide.split("\n").filter(l => l.startsWith("Contoh"))[0] || ""}`, "guide"));
      }

      await m.react("🧠");
      return await runFeature(m, sock, buf, editPrompt, meta, hdMode, typed);
    }

    // ── Subcommand: .aiclotheschanger list preset — daftar semua preset gaya ──
    if (/^(list|daftar)\s*(preset|gaya|style)?$|^preset\s+list$/i.test(rawPrompt)) {
      const seen = new Set();
      const groups = {
        "Formal & Kerja": ["formal", "business", "preppy", "dandy"],
        "Kasual & Jalan": ["casual", "street", "vintage", "punk"],
        "Acara & Pesta": ["party", "korea", "pengantin"],
        "Olahraga & Outdoor": ["sport", "vacation", "winter"],
        "Tradisional & Muslim": ["batik", "kebaya", "beskap", "koko", "gamis"],
        "Seragam & Kostum": ["sekolah", "pramuka", "army", "cowboy", "ninja", "halloween"],
        "Era & Budaya": ["90s", "y2k", "kimono", "hanbok"],
      };
      let msg = `👗 *${toSC("daftar preset gaya")}*

`;
      for (const [gaya, items] of Object.entries(groups)) {
        msg += `「 ${toSC(gaya.toLowerCase())} 」
`;
        for (const k of items) {
          if (seen.has(k)) continue;
          seen.add(k);
          const desc = PRESET_STYLES[k].split(":")[0];
          msg += `• *${k}* — ${toSC(desc)}
`;
        }
        msg += "\n";
      }
      msg += `${toSC("alias")}: ${["resmi","kantoran","santai","pesta","glam","streetwear","olahraga","gym","liburan","pantai","dingin","kpop","muslim","muslimah","hijab","wedding","militer"].join(", ")}

`;
      msg += `${toSC("fitur keluarga")}: ${prefix}${typed}faceswap | ${prefix}${typed}age | ${prefix}${typed}hair | ${prefix}${typed}gender | ${prefix}${typed}bg | ${prefix}${typed}hapus

`;
      msg += `${toSC("cara pakai")}: ${prefix}${typed} <${toSC("preset")}> ${toSC("reply foto orang")}
`;
      msg += `${toSC("contoh")}: ${prefix}${typed} hd batik — ${toSC("hasil jernih + outfit batik")}`;
      return m.reply(msg);
    }

    // ═══ BASE: .aiclotheschanger — ganti baju ═══
    const cmd = "aiclotheschanger";

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
      const styleList = Object.keys(PRESET_STYLES).filter((k, i, a) => a.indexOf(k) === i && !["resmi", "kantoran", "kerja", "santai", "pesta", "glam", "streetwear", "olahraga", "gym", "liburan", "pantai", "dingin", "kpop", "muslim", "hijab", "muslimah", "wedding", "militer"].includes(k)).join(", ");
      await m.reply(
        `👕 *${toSC("ganti baju ai")}*\n\n` +
        `${toSC("kirim/reply foto orangnya dulu")}!\n\n` +
        `1. ${prefix}${cmd} <${toSC("prompt baju")}> — ${toSC("reply foto orang")}\n` +
        `2. ${prefix}${cmd} <${toSC("preset")}> — ${toSC("reply foto orang")}\n   ${toSC("preset")}: ${styleList}\n` +
        `3. ${prefix}${cmd} — ${toSC("reply foto orang, sambil kirim gambar bajunya")}\n\n` +
        `✨ hd = ${toSC("hasil jernih")} | hd2/2k = ${toSC("hasil 2x lebih besar")}\n` +
        `🎭 ${toSC("fitur keluarga")}: ${prefix}${cmd}faceswap | ${prefix}${cmd}age | ${prefix}${cmd}hair | ${prefix}${cmd}gender | ${prefix}${cmd}bg | ${prefix}${cmd}hapus\n\n` +
        `${toSC("contoh")}: ${prefix}${cmd} change the shirt to red | ${prefix}${cmd} hd formal`
      );
      return;
    }

    if (!prompt && !clothesBuf) {
      await m.react("❌");
      return m.reply(
        claraWrap(cmd,
          `Kasih *${toSC("prompt baju")}*, *${toSC("preset")}*, ATAU *${toSC("kirim gambar bajunya")}*!\n\n` +
          `${toSC("preset")}: formal, casual, party, street, sport, vacation, winter, korea, batik, kebaya\n` +
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
    return await runFeature(m, sock, personBuf, editPrompt, {
      emoji: "👕",
      title: "ganti baju ai",
      lines: [
        `🎯 ${toSC("sumber")}: *${toSC(clothesDesc ? "gambar baju" : presetUsed ? `preset ${presetUsed}` : "prompt")}*`,
        shortLine(prompt, clothesDesc),
      ],
    }, hdMode, cmd);
  } catch (err) {
    if (err && err.message === "semua engine down") {
      await m.react("❌");
      return m.reply(claraWrap((m.command || "aiclotheschanger").toLowerCase(), "Semua engine edit gambar lagi down. Coba lagi beberapa menit.", "error"));
    }
    console.error("clotheschanger error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aiclotheschanger", (te.novaError && te.novaError(err)) || "Gagal memproses, coba lagi.", "error"));
  }
}

function shortLine(prompt, clothesDesc) {
  const short = clothesDesc
    ? clothesDesc.replace(/\s+/g, " ").slice(0, 90)
    : (prompt || "").slice(0, 90);
  return short ? `✨ ${toSC("model baju")}: *${short}*` : "";
}

export { pluginConfig as config, handler };
