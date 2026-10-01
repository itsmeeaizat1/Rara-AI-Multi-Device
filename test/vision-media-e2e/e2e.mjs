// E2E: fitur vision-family reply media — request owner 10 Sep 2026
// "cek fitur vision knp klo reply media ga bsa".
//
// AKAR BUG: 7 plugin AI pake template lama `m.msg?.imageMessage` /
// `m.quoted?.msg?.imageMessage` + `sock.downloadMediaMessage()` —
// di serializer rara-serialize.js gak ada property m.msg / quoted.msg,
// dan download bener = .download() method → deteksi media SELALU gagal
// (attach + reply) → selalu muncul guide padahal user reply foto.
//
// STRATEGI: mock download() yang THROW — kalau deteksi media lolos,
// download pasti kepanggil → error khas ke-catch di reply.
// Gak perlu network/AI call sama sekali.

import assert from "node:assert";

// DB eksplisit (gotcha: raraWrap lookup contacts butuh DB aktif, tanpa path → TypeError senyap)
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase("/tmp/vision-media-e2e-db/rara.json");

// ocrsolve/automeme doOcrAnalysis import config.js ASLI (dynamic) — set apiKey
// in-memory biar lewat guard apiKey dan sampai ke media detection.
const realCfg = (await import("../../config.js")).default;
realCfg.aiHelp = realCfg.aiHelp || {};
realCfg.aiHelp.apiKey = "test-key";
realCfg.aiHelp.apiEndpoint = "https://api.openai.com/v1/chat/completions";
realCfg.aiHelp.model = "gpt-4o-mini";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra ? "→ " + extra : ""}`); }
}

const BOT_CONFIG = { command: { prefix: "." }, aiHelp: { apiKey: "test-key", apiEndpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" } };

function makeM({ quotedImage = false, attachImage = false, text = "" } = {}) {
  const m = {
    isImage: attachImage,
    isVideo: false,
    isMedia: attachImage,
    message: attachImage ? { imageMessage: { caption: text } } : { conversation: ".x" },
    msg: undefined, // HARUS undefined — inilah akar bugnya (m.msg gak pernah ada)
    text,
    args: text.split(" ").filter(Boolean),
    sender: "u@s.whatsapp.net",
    chat: "c@g.us",
    key: { remoteJid: "c@g.us", id: "k1" },
    command: "vision",
    prefix: ".",
    react: async () => true,
    reply: async (t) => { m._replies.push(String(t)); return { key: {} }; },
    _replies: [],
  };
  m.download = async () => { m._downloadCalled = true; throw new Error("boom-download"); }; // marker: download attach kepanggil
  if (quotedImage) {
    m.quoted = {
      isImage: true, isMedia: true, type: "imageMessage",
      message: { imageMessage: {} },
      download: async () => { m._downloadCalled = true; throw new Error("boom-download"); }, // marker
    };
  }
  return m;
}

const plugins = [
  ["vision", "../../plugins/ai/vision.js"],
  ["ai-ocr", "../../plugins/ai/ai-ocr.js"],
  ["9router", "../../plugins/ai/9router.js"],
  ["aianalyze", "../../plugins/ai/aianalyze.js"],
  ["enhance", "../../plugins/ai-image/enhance.js"],
  ["ocrsolve", "../../plugins/ai/ocrsolve.js"],
  ["automeme", "../../plugins/ai/automemegenerator.js"],
];

// m.text di framework = TANPA nama command (parseCommand nge-strip). ocrsolve/
// automeme emang one-shot bare (reply foto, tanpa prompt bebas — prompt bebas
// = unknown sub-command → help, itu behavior bener).
const BARE = new Set(["ocrsolve", "automeme"]);
for (const [label, path] of plugins) {
  console.log(`— ${label} —`);
  const { config, handler } = await import(path);
  const ctx = { sock: null, config: BOT_CONFIG, botConfig: BOT_CONFIG, args: [] };

  // 1. Reply foto → download HARUS kepanggil (deteksi lolos) → error khas ke-catch
  const mReply = makeM({ quotedImage: true, text: BARE.has(label) ? "" : "apa ini" });
  try { await handler(mReply, ctx); } catch (e) { /* download throw boleh lolos kalau gak di-catch */ }
  const r1 = mReply._replies.join("\n");
  check("reply foto: deteksi media lolos (download kepanggil, BUKAN guide)", !!mReply._downloadCalled, "reply: " + r1.slice(0, 80).replace(/\n/g, " | "));
  check("reply foto: gak muncul guide/cara pakai lagi", !/ᴄᴀʀᴀ ᴘᴀᴋᴀɪ|Cara pakai|Tidak ada foto|reply\/attach foto/i.test(r1), r1.slice(0, 80));

  // 2. Tanpa media → guide/error "belum ada media" (behavior lama bener tetap)
  const mNone = makeM({ text: BARE.has(label) ? "" : "apa ini" });
  try { await handler(mNone, ctx); } catch (e) {}
  const r2 = mNone._replies.join("\n");
  check("tanpa media: masih ditolak (guide/error)", !r2.includes("boom-download") && r2.length > 0, r2.slice(0, 60).replace(/\n/g, " | "));
}

// 3. Attach foto langsung (caption) — vision
console.log("— vision attach —");
{
  const { handler } = await import("../../plugins/ai/vision.js");
  const mAttach = makeM({ attachImage: true, text: "apa ini" });
  try { await handler(mAttach, { sock: null, config: BOT_CONFIG }); } catch (e) {}
  const r = mAttach._replies.join("\n");
  check("attach foto: deteksi lolos (download kepanggil)", !!mAttach._downloadCalled, r.slice(0, 60));
}

// 4. Attach foto + caption → 9router harus pakai caption sebagai prompt (vision native)
console.log("— 9router caption —");
{
  const src = (await import("node:fs")).readFileSync(new URL("../../plugins/ai/9router.js", import.meta.url), "utf8");
  check("9router: caption dibaca dari m.message?.imageMessage?.caption (bukan m.msg)", src.includes("m.message?.imageMessage?.caption?.trim()"), "masih m.msg");
  check("9router: foto dikirim multimodal ke 9router (bukan Gemini external)", src.includes("image_url") && !src.includes("GeminiVision"), "masih eksternal");
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
