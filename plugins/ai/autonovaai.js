// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/owner/autonovaai.js — .autonovaai: bikin rule automation pakai bahasa manusia
// Gabungan ai-agent (askAI) + autoflow engine — user ketik kalimat → AI terjemahin jadi JSON rule → validasi → simpan → langsung aktif

import fs from "fs";
import { askAI } from "../../src/lib/aiagent.js";
import { load, save } from "../../src/lib/autoflow.js";

const DB = "./src/data/autoflow.json";

// ===== daftar resmi (validasi di KODE, bukan percaya AI mentah-mentah) =====
const TRIGGERS = ["keyword", "schedule", "join", "leave", "media"];
const MEDIA = ["image", "video", "sticker", "audio"];
const ACTIONS = ["reply", "react", "image", "audio", "kick", "closegc", "opengc"];
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
- action.reply: value = teks balasan. @user otomatis diganti nama pengirim
- action.react: value = SATU emoji
- action.image: value = path gambar di folder assets, contoh "./assets/image/menu/menuthumbnail.jpg". Jika user tidak menyebut file spesifik, pakai itu
- action.audio: value = path audio, contoh "./assets/audio/menu.mp3". Jika tidak disebut, pakai itu
- action.kick/closegc/opengc: tanpa value
- scope: "group" jika hanya grup, "private" jika chat pribadi, "all" jika keduanya
- cooldown: detik jeda anti-spam per chat (default 10, isi 0 jika harus selalu jalan)
- Balas HANYA JSON mentah, tanpa \`\`\` dan tanpa teks lain`;

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
  if (["reply", "react"].includes(r.action.type) && !r.action.value)
    return `aksi ${r.action.type} butuh isian`;
  if (["image", "audio"].includes(r.action.type) && !r.action.value)
    return `aksi ${r.action.type} butuh path file`;
  if (!SCOPES.includes(r.scope)) r.scope = "all";
  if (typeof r.cooldown !== "number" || r.cooldown < 0 || r.cooldown > 3600) r.cooldown = 10;
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
  let ac = "";
  if (a.type === "reply") ac = `bot balas: "${a.value}"`;
  else if (a.type === "react") ac = `bot react ${a.value}`;
  else if (a.type === "image") ac = `bot kirim gambar ${a.value}`;
  else if (a.type === "audio") ac = `bot kirim audio ${a.value}`;
  else ac = `bot jalankan ${a.type}`;
  return `${tr} → ${ac}`;
}

const pluginConfig = {
  name: "autonovaai",
  alias: ["autonovaai", "setautonovaai"],
  category: "ai",
  description: "Bikin rule automation pakai bahasa manusia — AI terjemahin jadi aturan",
  usage: ".autonovaai <kalimat bebas>",
  example: ".autonovaai kalau ada yang bilang assalamualaikum, balas waalaikumsalam\n.autonovaai setiap jam 05:00 ingatin sholat subuh\n.autonovaai kalau ada yang kirim sticker, react 🔥\n.autonovaai list / del AF-1 / on AF-1 / off AF-1",
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
        return m.reply("Belum ada rule.\nBikin: .autonovaai <kalimat bebas>", "autonovaai");
      }
      const text = rules
        .map((r) => `${r.enabled ? "🟢" : "🔴"} ${r.id} [${r.hits || 0}x]\n${describe(r)}`)
        .join("\n\n");
      return m.reply(text, "autonovaai");
    }

    // ---- .autonovaai del AF-1 ----
    if (sub === "del") {
      const id = (parts[1] || "").toUpperCase();
      if (!id) return m.reply("Contoh: .autonovaai del AF-001", "autonovaai");
      const rules = load();
      const sisa = rules.filter((r) => r.id !== id);
      if (sisa.length === rules.length)
        return m.reply(`❌ Rule ${id} tidak ketemu. Cek: .autonovaai list`, "autonovaai");
      save(sisa);
      return m.reply(`✅ Rule ${id} dihapus`, "autonovaai");
    }

    // ---- .autonovaai on AF-1 / .autonovaai off AF-1 ----
    if (sub === "on" || sub === "off") {
      const id = (parts[1] || "").toUpperCase();
      if (!id) return m.reply(`Contoh: .autonovaai ${sub} AF-001`, "autonovaai");
      const rules = load();
      const r = rules.find((x) => x.id === id);
      if (!r) return m.reply(`❌ Rule ${id} tidak ketemu. Cek: .autonovaai list`, "autonovaai");
      r.enabled = sub === "on";
      save(rules);
      return m.reply(
        `${r.enabled ? "🟢" : "🔴"} Rule ${id} ${r.enabled ? "dinyalakan" : "dimatikan"}`,
        "autonovaai",
      );
    }

    // ---- default: bikin rule dari kalimat bebas ----
    if (!body) {
      return m.reply(
        `🕒 Contoh:\n` +
        `.autonovaai kalau ada yang bilang assalamualaikum, balas waalaikumsalam\n` +
        `.autonovaai setiap jam 05:00 ingatin sholat subuh\n` +
        `.autonovaai kalau ada yang kirim sticker, react 🔥\n` +
        `.autonovaai kalau ada yang masuk grup, kasih sambutan hangat\n\n` +
        `.autonovaai list / del AF-1 / on AF-1 / off AF-1`,
        "autonovaai",
      );
    }

    try { await m.react("🕒"); } catch {}

    // 1) minta AI nerjemahin
    let rule;
    try {
      const aiResult = await askAI(SYS, body);
      const clean = aiResult.replace(/```json|```/g, "").trim();
      const s = clean.indexOf("{");
      const e = clean.lastIndexOf("}");
      if (s === -1 || e === -1) throw new Error("AI tidak mengembalikan JSON");
      rule = JSON.parse(clean.slice(s, e + 1));
    } catch (e) {
      try { await m.react("🐣"); } catch {}
      return m.reply(`❌ Gagal bikin rule: ${e.message}`, "autonovaai");
    }

    // 2) VALIDASI di level kode — AI ngaco = ditolak
    const err = validate(rule);
    if (err) {
      try { await m.react("🐣"); } catch {}
      return m.reply(`❌ Rule ditolak: ${err}\nCoba tulis kalimatnya lebih jelas.`, "autonovaai");
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
      `Kelola: .autonovaai list | .autonovaai del ${rule.id} | .autonovaai off ${rule.id}`,
      "autonovaai",
    );
  } catch (e) {
    console.error("[autonovaai] error:", e.message);
    try { await m.react("🐣"); } catch {}
    return m.reply(`❌ Error: ${e.message}`, "autonovaai");
  }
}

export { pluginConfig as config, handler };
