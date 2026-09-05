// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/owner/autonovaai.js — .autonovaai: bikin rule automation pakai bahasa manusia
// Gabungan ai-agent (askAI) + autoflow engine — user ketik kalimat → AI terjemahin jadi JSON rule → validasi → simpan → langsung aktif

import fs from "fs";
import { askAI } from "../../src/lib/aiagent.js";
import { load, save, clearAichatMemory } from "../../src/lib/autoflow.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const DB = "./src/data/autoflow.json";

// ===== daftar resmi (validasi di KODE, bukan percaya AI mentah-mentah) =====
const TRIGGERS = ["keyword", "schedule", "join", "leave", "media", "any"];
const MEDIA = ["image", "video", "sticker", "audio"];
const ACTIONS = ["reply", "react", "image", "audio", "kick", "closegc", "opengc", "aichat", "aiimage"];
const SCOPES = ["all", "group", "private"];

const nextId = (rules) => {
  const nums = rules.map((r) => parseInt((r.id || "").replace("AF-", "")) || 0);
  return "AF-" + String(Math.max(0, ...nums) + 1).padStart(3, "0");
};

// ===== prompt buat AI: terjemahin kalimat → JSON rule =====
const SYS = `Kamu menerjemahkan kalimat bahasa manusia menjadi SATU objek JSON rule automation bot WhatsApp.

Format WAJIB:
{"trigger":{"type":"keyword|schedule|join|leave|media","value":"...","match":"contains|exact|start"},"action":{"type":"reply|react|image|audio|kick|closegc|opengc","value":"...","caption":"..."},"scope":"all|group|private","cooldown":10}

Aturan:
- trigger.keyword: value = kata/frasa pemicu huruf kecil. match "contains" jika boleh di tengah kalimat, "exact" jika pesan harus sama persis, "start" jika di awal
- trigger.schedule: value = jam "HH:MM" contoh "05:00"
- trigger.join/leave: tanpa value
- trigger.media: value = "image"|"video"|"sticker"|"audio"
- trigger.any: SEMUA pesan teks jadi pemicu, TANPA kata kunci tertentu. Pakai ini kalau user minta bot ikut ngobrol/nimbrung/respon SEMUA chat tanpa nyebut kata pemicu spesifik (contoh: "kalau ada yang chat ikut ngobrol", "balas semua orang yang ngetik", "jadi asisten yang selalu jawab"). Tanpa value.
- action.reply: value = teks balasan TETAP/statis (sama setiap kali). @user otomatis diganti nama pengirim
- action.aichat: balasan digenerate AI SETIAP KALI (dinamis, beda-beda, natural kayak ngobrol asli) — BUKAN teks statis. value = deskripsi gaya bicara/persona/instruksi bebas (boleh kosong = default ramah santai). WAJIB dipasangkan sama trigger.any (atau keyword kalau mau AI cuma jawab pas kata tertentu disebut, tapi jawabannya tetap dinamis).
- action.aiimage: bot BIKIN GAMBAR hasil generate AI (dinamis, beda-beda tiap kali) — value = deskripsi/prompt gambar (WAJIB diisi, contoh "meme lucu tentang kopi"). @user diganti nama pengirim. Pakai kalau user minta bot bikin/menggambar sesuatu
- action.react: value = SATU emoji
- action.image: value = path gambar di folder assets, contoh "./assets/image/menu/menuthumbnail.jpg". Jika user tidak menyebut file spesifik, pakai itu
- action.audio: value = path audio, contoh "./assets/audio/menu.mp3". Jika tidak disebut, pakai itu
- action.kick/closegc/opengc: tanpa value
- scope: "group" jika hanya grup, "private" jika chat pribadi, "all" jika keduanya
- cooldown: detik jeda anti-spam per chat (default 10, isi 0 jika harus selalu jalan). Untuk trigger.any WAJIB minimal 5 (jangan 0, terlalu boros & spam)
- Balas HANYA JSON mentah, tanpa \`\`\` dan tanpa teks lain

Contoh khusus free-chat:
"kalau ada orang chat ikut ngobrol" => {"trigger":{"type":"any"},"action":{"type":"aichat","value":""},"scope":"all","cooldown":10}
"kalau ada yg chat di grup ikut jawab ya bebas, gaya santai kayak temen" => {"trigger":{"type":"any"},"action":{"type":"aichat","value":"Balas santai kayak ngobrol sama temen dekat, singkat dan natural"},"scope":"group","cooldown":10}`;

// ===== cek & rapikan rule buatan AI =====
function validate(r) {
  if (!r || typeof r !== "object") return "format tidak valid";
  r.trigger ??= {};
  r.action ??= {};
  if (!TRIGGERS.includes(r.trigger.type)) return `pemicu "${r.trigger.type}" tidak dikenal`;
  if (!ACTIONS.includes(r.action.type)) return `aksi "${r.action.type}" tidak dikenal`;
  if (r.trigger.type === "keyword") {
    if (!r.trigger.value) return "keyword butuh kata pemicunya";
    if (!["contains", "exact", "start"].includes(r.trigger.match)) r.trigger.match = "contains";
    r.trigger.value = String(r.trigger.value).toLowerCase();
  }
  if (r.trigger.type === "schedule" && !/^\d{1,2}:\d{2}$/.test(r.trigger.value || ""))
    return "jadwal harus format HH:MM (contoh 05:00)";
  if (r.trigger.type === "media" && !MEDIA.includes(r.trigger.value))
    return "media harus image/video/sticker/audio";
  // trigger "any" TANPA value — respon semua pesan, gak butuh kata pemicu
  if (["reply", "react", "aiimage"].includes(r.action.type) && !r.action.value)
    return `aksi ${r.action.type} butuh isian`;
  if (["image", "audio"].includes(r.action.type) && !r.action.value)
    return `aksi ${r.action.type} butuh path file`;
  // action "aichat" — value BOLEH kosong (default persona ramah santai)
  if (r.action.type === "aichat" && typeof r.action.value !== "string") r.action.value = "";
  if (!SCOPES.includes(r.scope)) r.scope = "all";
  if (typeof r.cooldown !== "number" || r.cooldown < 0 || r.cooldown > 3600) r.cooldown = 10;
  // trigger "any" minimal cooldown 5s — biar gak spam/boros API di chat ramai
  if (r.trigger.type === "any" && r.cooldown < 5) r.cooldown = 5;
  return null;
}

// ===== ekstrak JSON dari balasan AI — tahan banting =====
// Provider fallback (ikyy/haidar/dll) sering jawab ngobrol/kurung markdown/
// nambahin kalimat pembuka. Fungsi ini:
// 1. buang fence ```json
// 2. cari objek {} BERKESEIMBANGAN pertama (bukan sekadar brace pertama-terakhir)
// 3. benerin trailing comma + kutip pintar (" " ' ') sebelum parse
export function extractJson(text) {
  if (!text) return null;
  const clean = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i];
    if (esc) { esc = false; continue; }
    if (inStr && ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const raw = clean.slice(start, end + 1)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(raw); } catch { return null; }
}

// ===== parser LOKAL (tanpa AI) — jaring pengaman kalau AI ngaco/mati =====
// Cakup pola kalimat automation paling umum. AI tetap jadi jalur utama buat
// kalimat kompleks — ini cumal nyelametin fitur pas rantai AI balas ngawur
// (contoh: key deepseek expired → fallback jawab ngobrol tanpa JSON).
export function localParse(t) {
  const s = (t || "").toLowerCase().trim();
  if (!s) return null;
  const rule = { trigger: {}, action: {}, scope: "all", cooldown: 10 };

  // scope
  if (/\b(grup|group|gc)\b/.test(s) && !/pribadi|private|\bpc\b/.test(s)) rule.scope = "group";
  else if (/pribadi|private|\bpc\b/.test(s)) rule.scope = "private";

  // 1) ikut ngobrol / balas semua chat → trigger.any + aichat
  const freeChat =
    /(ada\s+)?(orang|yang|yg|siapapun|siapa\s?saja|user|member).*(chat|ngobrol|bicara|ngetik|mengetik|nimbrung|ajak|sapa)/.test(s) ||
    /ikut\s+(ngobrol|nimbrung|balas|balesin|jawab|bicara)/.test(s) ||
    /(balas|jawab|balesin|respon)\s+(semua|semuanya| semua orang|orang)/.test(s) ||
    /(jadi|pantesan|pokoknya).*(asisten|temen ngobrol)/.test(s);
  if (freeChat) {
    rule.trigger = { type: "any" };
    const gaya = t.match(/gaya\s+([\w\s]+?)(?:[,.]|$)/i);
    rule.action = { type: "aichat", value: gaya ? gaya[1].trim() : "" };
    return rule;
  }

  // 2) jadwal "setiap/tiap jam HH:MM"
  const jam = s.match(/(\d{1,2})[:.](\d{2})/);
  if (jam && /(setiap|tiap|pukul|jam)/.test(s)) {
    const hh = String(Math.min(23, parseInt(jam[1], 10))).padStart(2, "0");
    rule.trigger = { type: "schedule", value: `${hh}:${jam[2]}` };
    const balasan = t.match(/(?:ingetin|ingatkan|kirim|bilang|pesan|ngomong)\s+["']?(.+?)(?:["']|$)/i);
    rule.action = { type: "reply", value: balasan ? balasan[1].trim() : `⏰ ${hh}:${jam[2]} WIB — waktunya!` };
    return rule;
  }

  // 3) masuk/keluar grup
  if (/(masuk|join|member baru|new member)/.test(s)) {
    rule.trigger = { type: "join" };
    const sambutan = t.match(/(?:sambutan|bilang|balas|kasih|ucapin|ucapkan)\s+["']?(.+?)(?:["']|$)/i);
    rule.action = { type: "reply", value: sambutan ? sambutan[1].trim() : "Selamat datang @user di grup! 🎉" };
    return rule;
  }
  if (/(keluar|left|kabur|minggat)/.test(s)) {
    rule.trigger = { type: "leave" };
    rule.action = { type: "reply", value: "Dadah @user, hati-hati di jalan ya! 👋" };
    return rule;
  }

  // 4) media → react (atau reply)
  const med = s.match(/\b(gambar|image|foto|video|sticker|stiker|audio|vn|voice note)\b/);
  if (med) {
    const mv = { gambar: "image", image: "image", foto: "image", video: "video", sticker: "sticker", stiker: "sticker", audio: "audio", "voice note": "audio", vn: "audio" }[med[1]];
    rule.trigger = { type: "media", value: mv };
    const emoji = t.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u);
    rule.action = { type: "react", value: emoji ? emoji[0] : "🔥" };
    return rule;
  }

  // 5) keyword → reply: "kalau ada yang bilang X balas Y"
  const kw = t.match(/(?:bilang|kata(?:kan)?|ngetik|sebut|tulis|ngomong)\s+["']?([^"',;]+?)["']?\s*(?:,|lalu|terus|maka)?\s*(?:balas|balesin|jawab|dibalas|dibales)\s+["']?(.+)$/i);
  if (kw) {
    rule.trigger = { type: "keyword", value: kw[1].trim().toLowerCase(), match: "contains" };
    rule.action = { type: "reply", value: kw[2].replace(/["']/g, "").trim() };
    return rule;
  }

  return null;
}

// ===== ubah JSON jadi kalimat manusia (buat laporannya) =====
function describe(r) {
  const t = r.trigger, a = r.action;
  let tr = "";
  if (t.type === "keyword") tr = `kalau pesan ${t.match === "exact" ? "sama dengan" : t.match === "start" ? "diawali" : "mengandung"} "${t.value}"`;
  else if (t.type === "schedule") tr = `setiap jam ${t.value}`;
  else if (t.type === "join") tr = "kalau ada yang masuk grup";
  else if (t.type === "leave") tr = "kalau ada yang keluar grup";
  else if (t.type === "media") tr = `kalau ada yang kirim ${t.value}`;
  else if (t.type === "any") tr = "kalau ada SIAPAPUN chat (semua pesan)";
  let ac = "";
  if (a.type === "reply") ac = `bot balas: "${a.value}"`;
  else if (a.type === "react") ac = `bot react ${a.value}`;
  else if (a.type === "image") ac = `bot kirim gambar ${a.value}`;
  else if (a.type === "audio") ac = `bot kirim audio ${a.value}`;
  else if (a.type === "aichat") ac = `bot ikut ngobrol pakai AI${a.value ? " (gaya: " + a.value + ")" : " (gaya default)"}`;
  else if (a.type === "aiimage") ac = `bot bikin gambar AI: ${a.value}`;
  else ac = `bot jalankan ${a.type}`;
  return `${tr} → ${ac}`;
}

const pluginConfig = {
  name: "autonovaai",
  alias: ["autonovaai", "setautonovaai"],
  category: "ai",
  description: "Bikin rule automation pakai bahasa manusia — AI terjemahin jadi aturan",
  usage: ".autonovaai <kalimat bebas>",
  example: ".autonovaai kalau ada yang bilang assalamualaikum, balas waalaikumsalam\n.autonovaai setiap jam 05:00 ingatin sholat subuh\n.autonovaai kalau ada yang kirim sticker, react 🔥\n.autonovaai list / del AF-1 / on AF-1 / off AF-1 / reset [AF-1]",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, conn }) {
  const sockRef = conn || sock;
  try {
    const raw = m.text?.trim() || "";
    const body = raw
      .replace(/^\.autonovaai\s+/i, "")
      .replace(/^\.setautonovaai\s+/i, "")
      .trim();

    const parts = body.split(/[ \t]+/).filter(Boolean);
    const sub = (parts[0] || "").toLowerCase();

    // ---- .autonovaai list ----
    if (sub === "list") {
      const rules = load();
      if (!rules.length) {
        return m.reply(claraWrap("autonovaai", "Belum ada rule.\n\n💡 Bikin: .autonovaai <kalimat bebas>"));
      }
      const text = rules
        .map((r) => `${r.enabled ? "🟢" : "🔴"} ${r.id} [${r.hits || 0}x]\n${describe(r)}`)
        .join("\n\n");
      return m.reply(text, "autonovaai");
    }

    // ---- .autonovaai reset [AF-1] — bersihin memori obrolan per-user AI ----
    if (sub === "reset") {
      const id = (parts[1] || "").toUpperCase();
      clearAichatMemory(id || null, null, null);
      return m.reply(
        claraWrap("autonovaai", id
          ? `Memori obrolan AI rule ${id} dihapus. AI mulai fresh tanpa konteks lama.`
          : `Semua memori obrolan AI dihapus. Semua rule aichat mulai fresh.`),
      );
    }

    // ---- .autonovaai del AF-1 ----
    if (sub === "del") {
      const id = (parts[1] || "").toUpperCase();
      if (!id) return m.reply(claraWrap("autonovaai", "💡 Contoh: .autonovaai del AF-001"));
      const rules = load();
      const sisa = rules.filter((r) => r.id !== id);
      if (sisa.length === rules.length)
        return m.reply(claraWrap("autonovaai", `Rule ${id} tidak ketemu. Cek: .autonovaai list`, "error"));
      save(sisa);
      return m.reply(claraWrap("autonovaai", `Rule ${id} dihapus`));
    }

    // ---- .autonovaai on AF-1 / .autonovaai off AF-1 ----
    if (sub === "on" || sub === "off") {
      const id = (parts[1] || "").toUpperCase();
      if (!id) return m.reply(claraWrap("autonovaai", `💡 Contoh: .autonovaai ${sub} AF-001`));
      const rules = load();
      const r = rules.find((x) => x.id === id);
      if (!r) return m.reply(claraWrap("autonovaai", `Rule ${id} tidak ketemu. Cek: .autonovaai list`, "error"));
      r.enabled = sub === "on";
      save(rules);
      return m.reply(
        claraWrap("autonovaai", `Rule ${id} ${r.enabled ? "dinyalakan" : "dimatikan"}`),
      );
    }

    // ---- default: bikin rule dari kalimat bebas ----
    if (!body) {
      return m.reply(
        claraWrap("autonovaai", [
          "💡 Contoh:",
          ".autonovaai kalau ada yang bilang assalamualaikum, balas waalaikumsalam",
          ".autonovaai setiap jam 05:00 ingatin sholat subuh",
          ".autonovaai kalau ada yang kirim sticker, react 🔥",
          ".autonovaai kalau ada yang masuk grup, kasih sambutan hangat",
          "",
          ".autonovaai list / del AF-1 / on AF-1 / off AF-1",
        ]),
      );
    }

    try { await m.react("🕒"); } catch {}

    // 1) minta AI nerjemahin — 3 LAPIS:
    //    a. AI utama (deepseek/dll)
    //    b. kalau balasan gak ada JSON-nya (provider fallback suka jawab
    //       ngobrol doang) → RETRY sekali dengan perintah jauh lebih tegas
    //    c. kalau masih gak ada → parser LOKAL tanpa AI (pola kalimat umum)
    let rule = null;
    let viaLocal = false;
    try {
      let aiResult = await askAI(SYS, body);
      rule = extractJson(aiResult);
      if (!rule) {
        console.log("[autonovaai] balasan AI tanpa JSON → retry dengan perintah tegas");
        aiResult = await askAI(
          SYS + "\n\nSANGAT PENTING: Balasan kamu WAJIB objek JSON MURNI — TANPA kalimat pembuka, TANPA penjelasan, TANPA markdown, TANPA sapaan. Karakter PERTAMA balasan harus { dan TERAKHIR harus }",
          body,
        );
        rule = extractJson(aiResult);
      }
    } catch (e) {
      console.log("[autonovaai] rantai AI gagal total:", e.message);
    }
    if (!rule) {
      rule = localParse(body);
      if (rule) viaLocal = true;
    }
    if (!rule) {
      try { await m.react("❌"); } catch {}
      return m.reply(claraWrap("autonovaai", [
        "Gagal bikin rule: AI gak ngembaliin JSON dan kalimatnya belum dikenali.",
        "Coba tulis lebih spesifik, contoh:",
        "• .autonovaai kalau ada yang bilang assalamualaikum, balas waalaikumsalam",
        "• .autonovaai kalau ada orang chat, ikut ngobrol",
      ], "error"));
    }

    // 2) VALIDASI di level kode — AI ngaco = ditolak
    const err = validate(rule);
    if (err) {
      try { await m.react("❌"); } catch {}
      return m.reply(claraWrap("autonovaai", `Rule ditolak: ${err}\nCoba tulis kalimatnya lebih jelas.`, "error"));
    }

    // 3) simpan → langsung aktif
    const rules = load();
    rule.id = nextId(rules);
    rule.enabled = true;
    rule.hits = 0;
    rule.targetChat = m.chat; // tujuan kirim untuk trigger jadwal
    rules.push(rule);
    save(rules);

    try { await m.react("🐣"); } catch {}
    return m.reply(
      `✅ Rule ${rule.id} aktif\n\n` +
      `${describe(rule)}\n` +
      `Scope: ${rule.scope} • Cooldown: ${rule.cooldown}s\n\n` +
      (viaLocal ? "_⚙️ Rule dibikin lokal (AI lagi ngaco) — cek lagi ya hasilnya, kalau kurang pas hapus aja: .autonovaai del " + rule.id + "_\n\n" : "") +
      `Kelola: .autonovaai list | .autonovaai del ${rule.id} | .autonovaai off ${rule.id}`,
      "autonovaai",
    );
  } catch (e) {
    console.error("[autonovaai] error:", e.message);
    try { await m.react("❌"); } catch {}
    return m.reply(claraWrap("autonovaai", e.message || "Ada yang error nih, coba lagi ya", "error"));
  }
}

export { pluginConfig as config, handler };
