// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Auto Interaction VN — bicara dengan AI via voice note ATAU teks,
// AI bisa balas pakai suara (VN) atau teks — sesuai mode (18 Sep 2026).
// Toggle: .aiautointeractionvn on/off  (owner only, default OFF)
// Alias pendek: .aiv
//
// UPGRADE 18 Sep 2026 (request owner: "buat fitur bicara dgn ai bsa pakai
// teks ataupun vn jika disuruh jawab pakai vn" + "ai jawab pakai teks + vn
// on off"):
//   1. STT → shared nova-stt.js (pipeline Gemini → OpenAI → GROQ Whisper —
//      key Groq valid di pusat apikeys.json, gak lagi pipeline lokal yang
//      cuma andalkan Gemini expired).
//   2. OTAK AI → NOVA AGENT (runAgent nova-agent.js — request owner 18 Sep:
//      "jd ai pakai ai agent kyk nova agent aja jd sekilas sprti ngbrol
//      langsung ke nova agent cm ini ai novaagent jawab pakai suara vn").
//      Bicara via VN/teks = ngobrol sama nova agent, tapi jawabannya
//      DIBACAKAN pakai suara. Memori obrolan SHARING dengan .agent
//      (db agentMemory) — konteks nyambung antara chat teks & VN.
//      Reaksi fase ikut sistem loading: 🧠 plan → 🔍 search → 🛠️ tool → ⚡.
//   3. TTS → npm edge-tts (tts(text,{voice}) → Buffer, TANPA python/
//      edge-tts CLI — dep udah ada di package.json).
//   4. MODE BALAS: .aiv balas vn|teks — AI jawab pakai voice note atau teks.
//   5. LANJUT OBROLAN VIA TEKS: reply pesan AI bot → obrolan lanjut tanpa
//      harus rekam VN lagi (balasan tetap ikut mode vn/teks).
//   6. GUARD: VN > 120 detik ditolak sopan; VN gak jelas → minta rekam ulang.
//
// Anti-telepon (deteksi & tolak telepon + auto balas) ada di .anticall —
// mode info/tolak/off (lihat plugins/owner/anticall.js).
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { runAgent } from "../../src/lib/nova-agent.js";
import { transcribeAudio } from "../../src/lib/nova-stt.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(prefix, ext) {
  ensureTmp();
  return path.join(TMP_DIR, `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const MAX_DURASI_VN_DETIK = 120; // VN lebih panjang ditolak sopan

const pluginConfig = {
  name: "aiautointeractionvn",
  alias: ["aiautointeractionvn", "aiv"],
  category: "owner",
  description: "Bicara dengan AI via voice note atau teks — AI balas pakai suara (VN) atau teks",
  usage: ".aiv on/off — Nyalakan/matikan di chat ini\n.aiv balas vn|teks — Mode balasan AI\n.aiv voice <id> — Pilih suara neural\n.aiv lang <kode> — Set bahasa\n.aiv status — Cek pengaturan",
  example: ".aiv on\n.aiv balas vn\n.aiv balas teks",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

// === NEURAL VOICES (Microsoft Edge TTS — GRATIS, natural) ===
const VOICE_OPTIONS = [
  { id: "gadis",  name: "Gadis (Wanita ID, natural ceria)",  lang: "id-ID-GadisNeural",  type: "edge", gender: "Female" },
  { id: "ardi",   name: "Ardi (Pria ID, natural hangat)",    lang: "id-ID-ArdiNeural",   type: "edge", gender: "Male" },
  { id: "ava",    name: "Ava (Wanita EN, natural modern)",   lang: "en-US-AvaNeural",    type: "edge", gender: "Female" },
  { id: "andrew", name: "Andrew (Pria EN, natural hangat)", lang: "en-US-AndrewNeural", type: "edge", gender: "Male" },
  { id: "emma",   name: "Emma (Wanita EN, natural lembut)",  lang: "en-US-EmmaNeural",   type: "edge", gender: "Female" },
  { id: "brian",  name: "Brian (Pria EN, gaya BBC)",         lang: "en-US-BrianNeural",  type: "edge", gender: "Male" },
  { id: "jenny",  name: "Jenny (Wanita EN, friendly)",      lang: "en-US-JennyNeural",  type: "edge", gender: "Female" },
];

// ═══════════ SEAMS E2E — function = mock; null = error path; undefined = asli ═══════════
let _sttImpl; // (buffer, mime) => teks
export function _setAivSttForTest(fn) { _sttImpl = fn; }
let _brainImpl; // (prompt, opts) => jawaban
export function _setAivBrainForTest(fn) { _brainImpl = fn; }
let _ttsImpl; // (teks, voiceLang) => Buffer mp3
export function _setAivTtsForTest(fn) { _ttsImpl = fn; }
export function _resetAivSeamsForTest() { _sttImpl = undefined; _brainImpl = undefined; _ttsImpl = undefined; }

// ═══════════ TRACKER pesan AI terakhir per chat (buat lanjut obrolan via teks) ═══════════
// Map<gid, Set<msgId>> — id pesan AI yang kita kirim lewat fitur ini.
const _sentByChat = new Map();
function trackSent(gid, msgId) {
  if (!gid || !msgId) return;
  let set = _sentByChat.get(gid);
  if (!set) { set = new Set(); _sentByChat.set(gid, set); }
  set.add(msgId);
  if (set.size > 20) {
    // buang yang paling lama (Set jaga urutan insert)
    const first = set.values().next().value;
    set.delete(first);
  }
}
export function _aivSentIdsForTest(gid) { return _sentByChat.get(gid); }

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) db.db.data.aiAutoVnInteraction = {};
    const cfg = db.db.data.aiAutoVnInteraction;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        replyMode: cfg[gid]?.replyMode || "vn",
        voice: cfg[gid]?.voice || "gadis",
        lang: cfg[gid]?.lang || "id",
      };
      db.db.write();
      const text = claraWrap("AIV — Bicara dengan AI", [
        "Status: ON di chat ini",
        "Balasan: " + (cfg[gid].replyMode === "vn" ? "Voice Note (suara AI)" : "Teks"),
        "Voice: " + (cfg[gid].voice === "ardi" ? "Ardi (Pria ID)" : "Gadis (Wanita ID)"),
        "",
        "Cara pakai:",
        "1. Kirim voice note ke bot — AI jawab pakai suara/teks",
        "2. Atau reply pesan AI dengan teks — obrolan lanjut",
        "",
        "Kirim VN pertamamu sekarang, atau reply pesan ini dengan teks.",
      ]) + "\n" + tipText("Matikan: " + prefix + "aiv off — Ganti mode balasan: " + prefix + "aiv balas vn|teks");
      const sentOn = await m.reply(text);
      // pesan konfirmasi ini ikut di-track — reply pesan ini = mulai ngobrol
      trackSent(gid, sentOn?.key?.id);
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("AIV — Bicara dengan AI", [
        "Status: OFF",
        "Fitur bicara AI dimatikan di chat ini",
      ]);
      await m.reply(text);
    } else if (args[0] === "balas" || args[0] === "jawab" || args[0] === "reply") {
      const mode = args[1] || "";
      if (mode !== "vn" && mode !== "teks" && mode !== "voice" && mode !== "text") {
        const text = claraWrap("AIV — Bicara dengan AI", [
          "Mode balasan tidak valid!",
          "vn — AI jawab pakai voice note (suara)",
          "teks — AI jawab pakai teks biasa",
          "",
          "Contoh: " + prefix + "aiv balas vn",
        ]);
        await m.reply(text);
        return { handled: true };
      }
      const replyMode = (mode === "vn" || mode === "voice") ? "vn" : "teks";
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].replyMode = replyMode;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const text = claraWrap("AIV — Bicara dengan AI", [
        "Balasan AI diubah: " + (replyMode === "vn" ? "VOICE NOTE (suara AI)" : "TEKS"),
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ]);
      await m.reply(text);
    } else if (args[0] === "voice") {
      if (!args[1]) {
        const lines = ["Neural voices tersedia:", ""];
        VOICE_OPTIONS.forEach((v, i) => {
          lines.push((i + 1) + ". " + v.id + " — " + v.name);
        });
        lines.push("");
        lines.push("Ketik: " + prefix + "aiv voice <id>");
        await m.reply(claraWrap("AIV — Bicara dengan AI", lines));
        return { handled: true };
      }
      const voice = VOICE_OPTIONS.find(v => v.id === args[1]);
      if (!voice) {
        await m.reply(claraWrap("AIV — Bicara dengan AI", [
          "Voice tidak ditemukan!",
          "Ketik " + prefix + "aiv voice untuk lihat daftar",
        ], "error"));
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].voice = voice.id;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      await m.reply(claraWrap("AIV — Bicara dengan AI", [
        "Voice diubah: " + voice.id,
        "Nama: " + voice.name,
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ]));
    } else if (args[0] === "lang") {
      const lang = args[1] || "id";
      const supported = ["id", "en", "su", "jv", "ar", "ja", "ko", "zh"];
      if (!supported.includes(lang)) {
        await m.reply(claraWrap("AIV — Bicara dengan AI", [
          "Bahasa tidak didukung!",
          "Tersedia: " + supported.join(", "),
        ], "error"));
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].lang = lang;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      await m.reply(claraWrap("AIV — Bicara dengan AI", [
        "Bahasa diubah: " + lang,
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ]));
    } else {
      // status / panduan
      const enabled = cfg[gid]?.enabled ? "ON" : "OFF";
      const replyMode = cfg[gid]?.replyMode || "vn";
      const voiceId = cfg[gid]?.voice || "gadis";
      const voiceInfo = VOICE_OPTIONS.find(v => v.id === voiceId);
      const lang = cfg[gid]?.lang || "id";
      const text = claraWrap("AIV — Bicara dengan AI", [
        "Status: " + enabled,
        "Balasan AI: " + (replyMode === "vn" ? "Voice Note (suara neural, gratis)" : "Teks"),
        "Voice: " + (voiceInfo ? voiceInfo.name : voiceId),
        "Bahasa: " + lang,
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "aiv on/off — Nyalakan/matikan di chat ini",
        prefix + "aiv balas vn|teks — Mode balasan AI",
        prefix + "aiv voice <id> — Pilih suara neural",
        prefix + "aiv lang <kode> — Set bahasa",
        "",
        "Cara bicara dengan AI:",
        "1. Kirim voice note — AI transkripsi lalu jawab",
        "2. Reply pesan AI dengan teks — obrolan lanjut",
        "",
        "Telepon masuk? Atur di " + prefix + "anticall (tolak/info/off)",
      ]);
      await m.reply(text);
    }
  } catch (e) {
    console.error("[AIV] handler error:", e?.message || e);
    await m.reply(claraWrap("AIV — Bicara dengan AI", "Gagal proses perintah. Coba lagi.", "error"));
  }
  return { handled: true };
}

// ═══════════ TTS — Edge Neural via npm msedge-tts (GRATIS, tanpa python) ═══════════
async function edgeTTSBuffer(text, voiceLang) {
  // seam: function = mock; null = gagal; undefined = asli
  if (_ttsImpl !== undefined) {
    if (_ttsImpl === null) return null;
    return _ttsImpl(text, voiceLang);
  }
  try {
    // 🔹 FIX 18 Sep 2026: paket "edge-tts" GAK JALAN — Microsoft wajibin
    // header Sec-MS-GEC (anti-abuse token) sejak medio 2024, tanpa itu
    // balikin 403. "msedge-tts" v2.0.7+ udah implementasi
    // generateSecMsGec() — INI YANG BENERAN NYAMBUNG (verified live).
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const clean = text.replace(/["`']/g, "").replace(/\n/g, " ").slice(0, 500);
    const tts = new MsEdgeTTS({});
    // FIX 19 Sep 2026: 48kbps → 96kbps (sama kyk nova-voice-reply — suara neural HD)
    await tts.setMetadata(voiceLang, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(clean);
    const buf = await new Promise((resolve, reject) => {
      const chunks = [];
      audioStream.on("data", (c) => chunks.push(c));
      audioStream.on("end", () => resolve(Buffer.concat(chunks)));
      audioStream.on("error", reject);
    });
    return buf && buf.length > 500 ? buf : null;
  } catch (e) {
    console.error("[AIV] Edge TTS error:", e?.message || e);
    return null;
  }
}

// Convert mp3 → OGG Opus untuk WhatsApp VN
async function convertToOgg(inputBuffer) {
  const inFile = tempPath("vnin", ".mp3");
  const outFile = tempPath("vnout", ".ogg");
  try {
    fs.writeFileSync(inFile, inputBuffer);
    // opus 32k → 64k (FIX 19 Sep: biar gak pecah pas diputar WA)
    await execAsync("ffmpeg -y -i " + inFile + " -codec:a libopus -b:a 64k -ar 48000 " + outFile + " 2>/dev/null", { timeout: 30000 });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      return fs.readFileSync(outFile);
    }
    return null;
  } catch (e) {
    console.error("[AIV] Convert ogg error:", e?.message || e);
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

// ═══════════ MEMORI SHARING dengan .agent (format identik agent.js) ═══════════
function readAgentHistory(db, chat) {
  try {
    const cur = db?.setting?.("agentMemory") || {};
    return (cur[chat] || []).slice(-5).map(e => `- [${e.mode || "?"}] tugas: ${e.task} → hasil: ${e.summary}`);
  } catch { return []; }
}
function writeAgentMemory(db, chat, task, mode, answer) {
  try {
    if (!db?.setting) return;
    const cur = db.setting("agentMemory") || {};
    const list = cur[chat] || [];
    list.push({
      t: Date.now(),
      task: String(task || "").slice(0, 200),
      mode: mode || "-",
      summary: String(answer || "").replace(/\s+/g, " ").slice(0, 200),
    });
    cur[chat] = list.slice(-20);
    db.setting("agentMemory", cur);
  } catch {}
}

// ═══════════ OTAK AI — NOVA AGENT (bicara lewat VN = ngobrol sama agent) ═══════════
// Reaksi fase: 🧠 plan, 🔍 search, 🛠️ tool, ⚡ compose (aturan sistem loading)
const PHASE_REACT = { plan: "🧠", search: "🔍", tool: "🛠️", act: "⚡", compose: "⚡" };
async function aivBrain(userText, gid, sock, userKey) {
  if (_brainImpl !== undefined) {
    if (_brainImpl === null) throw new Error("brain down");
    return _brainImpl(userText, { gid });
  }
  const db = getDatabase();
  const history = readAgentHistory(db, gid);
  const res = await runAgent(userText, {
    history,
    context: { isGroup: gid.endsWith("@g.us"), chat: gid, mediaAttached: false },
    onPhase: (phase) => {
      const react = PHASE_REACT[phase] || "🧠";
      try { sock.sendReaction(gid, react, userKey); } catch {}
    },
  });
  if (res?.error) throw new Error(res.error);
  const answer = String(res?.answer || "").trim();
  if (!answer) throw new Error("agent tidak menjawab");
  writeAgentMemory(db, gid, userText, res.mode || "persona", answer);
  return { answer, sources: res.sources || [], mode: res.mode || "persona" };
}

// ═══════════ KIRIM BALASAN (ikuti mode vn/teks) + catat id pesan AI ═══════════
async function sendAivReply(sock, gid, cfg, aiReply, quotedMsg) {
  const replyMode = cfg.replyMode || "vn";
  const opts = quotedMsg ? { quoted: quotedMsg } : {};

  if (replyMode === "teks") {
    const sent = await sock.sendMessage(gid, { text: aiReply }, opts);
    trackSent(gid, sent?.key?.id);
    return "teks";
  }

  // mode VN — TTS → ogg → ptt
  const voice = VOICE_OPTIONS.find(v => v.id === (cfg.voice || "gadis")) || VOICE_OPTIONS[0];
  let mp3 = await edgeTTSBuffer(aiReply, voice.lang);
  if (!mp3) mp3 = await edgeTTSBuffer(aiReply, "id-ID-ArdiNeural"); // fallback voice
  if (!mp3) {
    // TTS total gagal → balas teks biar user gak ditinggal
    const sent = await sock.sendMessage(gid, { text: aiReply }, opts);
    trackSent(gid, sent?.key?.id);
    return "teks-fallback";
  }
  const ogg = await convertToOgg(mp3);
  const sent = ogg
    ? await sock.sendMessage(gid, { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true }, opts)
    : await sock.sendMessage(gid, { audio: mp3, mimetype: "audio/mpeg" }, opts);
  trackSent(gid, sent?.key?.id);
  return "vn";
}

// ═══════════ REAL-TIME DETECTION (dipanggil dari handler.js) ═══════════
export async function handleAiAutoVnInteraction(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.aiAutoVnInteraction[gid];
    if (!cfg || !cfg.enabled) return false;

    const msg = m.message || {};
    const audioMsg = msg.audioMessage || msg.voiceMessage || msg.pttMessage;
    if (!audioMsg && !msg.extendedTextMessage) return false;
    if (m.fromMe || m.isCommand) return false;

    let userText = null;

    if (audioMsg) {
      // ── jalur VN ──
      const durasi = Math.round(audioMsg.seconds || 0);
      if (durasi > MAX_DURASI_VN_DETIK) {
        await sock.sendMessage(gid, {
          text: claraWrap("AIV — Bicara dengan AI", [
            "Pesan suaranya " + durasi + " detik — terlalu panjang.",
            "Maksimal " + MAX_DURASI_VN_DETIK + " detik ya, atau ketik pertanyaannya saja.",
          ]),
        }, { quoted: m });
        return true;
      }

      try { await sock.sendPresenceUpdate("recording", gid); } catch {}
      try { await sock.sendReaction(gid, "🕒", m.key); } catch {}

      const buffer = await sock.downloadMediaMessage(m);
      if (!buffer || buffer.length < 500) return false;
      const mimeType = audioMsg.mimetype || "audio/ogg; codecs=opus";

      // STT — seam: function = mock; null = gagal; undefined = pipeline asli
      let transcribed = null;
      if (_sttImpl !== undefined) {
        transcribed = _sttImpl === null ? null : await _sttImpl(buffer, mimeType);
      } else {
        transcribed = await transcribeAudio(buffer, mimeType);
      }

      if (!transcribed || !transcribed.trim()) {
        try { await sock.sendReaction(gid, "❌", m.key); } catch {}
        await sock.sendMessage(gid, {
          text: claraWrap("AIV — Bicara dengan AI", [
            "Suaranya belum jelas terdengar.",
            "Coba rekam ulang lebih dekat ke mikrofon, atau ketik saja pertanyaannya.",
          ]),
        }, { quoted: m });
        return true;
      }
      userText = transcribed;
    } else {
      // ── jalur TEKS — lanjut obrolan: reply ke pesan AI terakhir ──
      const ctx = msg.extendedTextMessage?.contextInfo || {};
      const tracked = _sentByChat.get(gid);
      if (!tracked || !ctx.stanzaId || !tracked.has(ctx.stanzaId)) return false;
      userText = (m.text || "").trim();
      if (!userText) return false;
      try { await sock.sendReaction(gid, "🕒", m.key); } catch {}
    }

    // ── AI berpikir (otak nova agent — reaksi fase 🧠🔍🛠️⚡) ──
    let brainRes;
    try {
      brainRes = await aivBrain(userText, gid, sock, m.key);
    } catch (e) {
      console.error("[AIV] brain error:", e?.message || e);
      try { await sock.sendReaction(gid, "❌", m.key); } catch {}
      await sock.sendMessage(gid, {
        text: claraWrap("AIV — Bicara dengan AI", "Maaf, saya gagal memproses pesannya. Coba kirim ulang ya."),
      }, { quoted: m });
      return true;
    }
    let aiReply = brainRes?.answer || "";
    if (!aiReply) {
      try { await sock.sendReaction(gid, "❌", m.key); } catch {}
      return true;
    }

    // bersihkan buat suara: buang markdown/emoji berlebih/simbol box
    const spoken = aiReply
      .replace(/[*#_~`]/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/[╭╰│├└─「」✦]/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim()
      .slice(0, 500);

    const jalur = await sendAivReply(sock, gid, cfg, spoken, m);

    // sumber web (mode research) → kirim ringkas sebagai TEKS setelah balasan
    // biar link tetap kebaca (suara gak bisa ngucap URL enak)
    const sources = (brainRes?.sources || []).slice(0, 3);
    if (sources.length) {
      try {
        const srcTxt = claraWrap("AIV — Sumber", sources.map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`));
        await sock.sendMessage(gid, { text: srcTxt }, { quoted: m });
      } catch {}
    }

    try { await sock.sendReaction(gid, "🐣", m.key); } catch {}
    console.log("[AIV] balasan terkirim (" + jalur + "): " + spoken.slice(0, 60));
    return true;
  } catch (e) {
    console.error("[AIV] Hook error:", e?.message || e);
    try { await sock.sendReaction(m.key?.remoteJid, "❌", m.key); } catch {}
    return false;
  }
}

export function isAiAutoVnEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.aiAutoVnInteraction[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
