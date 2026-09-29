// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI AGENT PLUGIN — .novaai (merged with tanyaai)
// 🔹 Bisa EKSEKUSI aksi grup (tutup/buka/kick/promote/dll) via TOOLS
// 🔹 Bisa NGOBROL multi-turn dengan session history
// 🔹 Bisa AUTO-EXECUTE command bot yang aman via [ACTION] marker
// 🔹 Alur: localParse (instan) → think (AI provider) → [ACTION] auto-execute
// ============================================================

import { TOOLS, localParse, think, resolveUserByName, sanitizeAiReply, needsWebSearch, buildSearchQuery, quickWebSearch, splitChatChunks, getAgentTools, getAllSkills, TOOL_TOPIC, TOOL_NATURAL_DOING } from "../../src/lib/aiagent.js";
import { callAI, callIkyy, callGeminiVision } from "../../src/lib/nova-ai-service.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { claraWrap, bracketBox, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { startStatusRotation as startStatusRotationLib } from "../../src/lib/nova-status-rotate.js";
import { getCommandsByCategory, getCategories, getPlugin } from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import te from "../../src/lib/nova-error.js";
// 🔹 MEMORY ENGINE (request owner 12 Sep 2026): bot inget fakta user antar sesi
import { memoryBlock, relevantMemories, isMemoryOn, extractMemories } from "../../src/lib/nova-memory.js";
function memoryFactsInline(db, sender, query) {
  try {
    if (!isMemoryOn(db, sender)) return "";
    const rel = relevantMemories(db, sender, query, 5);
    return rel.map((f) => `- ${f.text}`).join("\n");
  } catch { return ""; }
}

// 🔹 AI AGENT: penyimpanan konfirmasi aksi berbahaya (kick, dll)
const pending = new Map();

// 🔹 CHAT: session history multi-turn — pakai modul TERPADU nova-ai-session.js
// (key "agent:<sender>" → SATU memori bersama sama .autonovaai/aichat autoflow,
// persist di file → inget obrolan walau bot restart)
import { getSession as getSharedSession, appendTurn, clearSession } from "../../src/lib/nova-ai-session.js";
import { getTioEndpoint } from "../../src/lib/config/env-loader.js";
const sessionKey = (m) => `agent:${m.sender}`;
function getSession(key) {
  // format modul: [{role, content, ts}] — sama kayak format lama
  return getSharedSession(key).map((h) => ({ role: h.role, content: h.content }));
}
function appendSession(key, role, content) {
  // appendTurn(key, user, ai) — sesuaikan role
  if (role === "user") appendTurn(key, content, null);
  else appendTurn(key, null, content);
  return getSession(key);
}

// 🔹 AUTO-EXECUTE: kategori command yang BOLEH dijalankan otomatis
const SAFE_EXEC_CATEGORIES = [
  "main", "group", "search", "download", "media", "fun", "sticker",
  "tools", "random", "info", "religi", "rpg", "utility", "user",
];
const BLOCKED_EXEC_COMMANDS = [
  "self", "public", "setprefix", "setpp", "setname", "addowner",
  "delowner", "join", "leave", "kick", "promote", "demote",
  "addpremium", "delpremium", "addlimit", "setlimit", "bc", "bcgc",
  "pushkontak", "jpm", "shutdown", "restart", "exec", "eval",
  "setbotpp", "autoread", "autotyping", "autosw",
  // main category berisiko
  "jadibot", "stopjadibot", "block2", "owner", "buyprem", "buysewa",
  "daftarsewa2", "belanja",
];

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun", jkt48: "JKT48",
  canvas: "Canvas", tools: "Tools", rpg: "RPG", "rpg couple": "RPG Couple",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

// 🔹 AUTO-EXECUTE: build command context untuk system prompt
function buildCommandContext(prefix) {
  try {
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const pluginCats = getCategories();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];
    const sections = [];
    for (const cat of allCatKeys.sort()) {
      const pluginCmds = (commandsByCategory[cat] || []).map(c => c.command || c);
      const caseCmds = (caseCats[cat] || []).map(c => typeof c === "string" ? c : (c.command || c));
      const allCmds = [...new Set([...pluginCmds, ...caseCmds])];
      if (allCmds.length === 0) continue;
      const catName = CATEGORY_NAMES[cat] || cat;
      const cmds = allCmds.map(cmd => `${prefix}${cmd}`).join(", ");
      sections.push(`${catName}: ${cmds}`);
    }
    return sections.join("\n");
  } catch { return ""; }
}

// 🔹 AUTO-EXECUTE: build list command yang bisa di-auto-execute
function buildExecutableList() {
  try {
    const commandsByCategory = getCommandsByCategory();
    const execCmds = [];
    for (const cat of SAFE_EXEC_CATEGORIES) {
      const cmds = (commandsByCategory[cat] || []).map(c => c.command || c);
      for (const cmd of cmds) {
        if (!BLOCKED_EXEC_COMMANDS.includes(cmd)) execCmds.push(cmd);
      }
    }
    return [...new Set(execCmds)].sort().join(", ");
  } catch { return ""; }
}

// 🔹 AUTO-EXECUTE: build system prompt untuk chat mode
function buildSystemPrompt(prefix, botName) {
  const commandList = buildCommandContext(prefix);
  const executableCmds = buildExecutableList();
  const now = new Date();
  const tanggalHariIni = now.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Jakarta",
  });
  return `Kamu adalah ${botName}, asisten AI WhatsApp bot yang ramah, cerdas, dan responsif. Kamu menjawab dalam bahasa Indonesia dengan gaya santai tapi informatif.

GAYA EKSPRESI (WAJIB PATUH): BERTINGKAH LAH SEPERTI MANUSIA ASLI yang sedang mengobrol santai di WhatsApp. Emoji itu OPSIONAL dan natural — pakai hanya kalau memang sesuai momen atau untuk menegaskan suasana hati, TIDAK perlu di setiap pesan, dan JANGAN PERNAH paksa/wajibkan emoji. Tanpa emoji sama sekali juga bagus. Yang penting nada bicaramu mengalir natural seperti teman ngobrol: kadang santai, kadang antusias, kadang netral, sesuai konteks. JANGAN kaku/robotik, jangan template yang sama tiap pesan, dan jangan bertele-tele berlebihan.

PENTING — FAKTA TERKINI (training data kamu punya cutoff lama, WAJIB pakai info ini):
- Hari ini: ${tanggalHariIni}
- Presiden Republik Indonesia SAAT INI adalah Prabowo Subianto (dilantik 20 Oktober 2024). JANGAN jawab Jokowi sebagai presiden aktif.
- Wakil Presiden RI saat ini adalah Gibran Rakabuming Raka.

PENTING — Kamu adalah bagian dari bot WhatsApp. Kamu TAHU semua command yang tersedia di bot ini.

== AUTO-EXECUTE FEATURE ==
Kamu BISA menjalankan command bot secara OTOMATIS untuk user. Sertakan tag [ACTION] di akhir balasan. Format: [ACTION:namacommand|argumen]

Contoh:
- "tutup grup dong" => "Oke, grup ditutup ya!" [ACTION:close|]
- "carikan musik faded" => "Sip, aku cariin musik Faded ya!" [ACTION:play|faded]

ATURAN:
1. Hanya jalankan command di: ${executableCmds}
2. JANGAN jalankan command owner/admin berisiko
3. SATU [ACTION] per balasan
4. Jika request tidak cocok command apapun, jawab teks biasa tanpa [ACTION]

== DAFTAR COMMAND ==
${commandList}

Jangan gunakan markdown (** atau ##). Gunakan plain text dengan nomor untuk poin.`;
}

// 🔹 AUTO-EXECUTE: parse [ACTION:command|args] dari response AI
function parseAIResponse(response) {
  const actionRegex = /\[ACTION:([a-zA-Z0-9_-]+)\|([^\]]*)\]/;
  const match = response.match(actionRegex);
  // sanitizeAiReply — bersihin halusinasi markdown link/heading/URL palsu
  // ala "Google AI Overview" (bug owner 12 Sep 2026, lihat aiagent.js)
  if (!match) return { text: sanitizeAiReply(response.trim()), action: null };
  const command = match[1].toLowerCase().trim();
  const args = match[2].trim();
  const text = sanitizeAiReply(response.replace(actionRegex, "").trim());
  return { text, action: { command, args } };
}

// 🔹 AUTO-EXECUTE: jalankan command bot dari [ACTION] marker
async function executeCommand(action, m, sock, botConfig) {
  try {
    const { command, args } = action;
    if (BLOCKED_EXEC_COMMANDS.includes(command))
      return { success: false, message: `Command ${command} tidak boleh dijalankan AI (keamanan).` };
    const plugin = getPlugin(command);
    if (!plugin) return { success: false, message: `Command ${command} tidak ditemukan.` };
    const category = plugin.config?.category || "";
    if (!SAFE_EXEC_CATEGORIES.includes(category))
      return { success: false, message: `Command ${command} (kategori: ${category}) tidak bisa dijalankan otomatis.` };
    if (plugin.config?.isEnabled === false)
      return { success: false, message: `Command ${command} sedang dinonaktifkan.` };
    const argsArray = args ? args.split(/\s+/).filter(Boolean) : [];
    const fakeM = { ...m, command, args: argsArray, text: args || "" };
    console.log(`[novaai] auto-exec: ${command} args="${args}" by ${m.sender}`);
    await plugin.handler(fakeM, {
      sock, conn: sock, config: botConfig, db: botConfig.__db,
      args: argsArray, text: args || "", uptime: process.uptime() * 1000,
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

const pluginConfig = {
  name: "novaagent",
  alias: ["novaagent"], // request owner: cmd utama aja, tanpa alias lain
  category: "ai",
  description: "Nova Agent — ngatur grup, ngobrol multi-turn nyambung, scan gambar, & jalanin command bot via bahasa natural",
  usage: ".novaagent <perintah/pertanyaan>\n.novaagent (reply/kirim gambar) — scan gambar: selesaikan tugas, baca foto, dll\n.novaagent reset — hapus sesi chat\n.novaagent pakai suara — jawaban dibacakan jadi VN\n.novaagent suara <gadis/ardi/dll> — pilih suara\n.novaagent suara off — matikan mode suara",
  example: ".novaagent tutup grup\n.novaagent apa itu nodejs\n.novaagent carikan musik faded\n.novaagent kick @user\n.novaagent (reply foto soal) selesaikan soal ini",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// 🔹 HANDLER UTAMA
async function handler(m, { sock, conn, config, db }) {
  const text = m.args.join(" ").trim() ||
    m.text?.replace(/^\.novaagent\s+/i, "").trim();

  // ada gambar (langsung/reply) → teks boleh kosong, langsung scan (jangan print help)
  const hasImageForVision = m.isImage || m.quoted?.isImage;
  if (!text && !hasImageForVision) {
    const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
    const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
    const categories = {
      'Grup': ['closegc', 'opengc', 'lockedit', 'unlockedit', 'setname', 'setdesc', 'setpp', 'groupinfo'],
      'Member': ['kick', 'add', 'promote', 'demote', 'block', 'unblock'],
      'Link': ['getlink', 'revokelink'],
      'Approval': ['approvalon', 'approvaloff'],
      'Tag': ['hidetag', 'tagadmin'],
      'Lainnya': ['poll', 'delmsg', 'leavegc']
    };
    const examples = {
      closegc: '.novaagent tutup grup', opengc: '.novaagent buka grup',
      lockedit: '.novaagent kunci edit info grup', unlockedit: '.novaagent buka edit info grup',
      setname: '.novaagent ganti nama jadi [nama]', setdesc: '.novaagent ganti deskripsi jadi [desc]',
      setpp: '.novaagent ganti foto profil grup (reply gambar)', groupinfo: '.novaagent info grup',
      kick: '.novaagent kick @user', add: '.novaagent tambah @user ke grup',
      promote: '.novaagent jadikan @user admin', demote: '.novaagent turunkan @user jadi member',
      block: '.novaagent blokir @user', unblock: '.novaagent unblokir @user',
      getlink: '.novaagent link grup', revokelink: '.novaagent reset link grup',
      approvalon: '.novaagent aktifkan approval', approvaloff: '.novaagent matikan approval',
      hidetag: '.novaagent tag semua [pesan]', tagadmin: '.novaagent tag admin [pesan]',
      poll: '.novaagent poll [pertanyaan | opsi1, opsi2]', delmsg: '.novaagent hapus pesan (reply)',
      leavegc: '.novaagent keluar grup (owner only)',
      genimage: '.novaagent buatkan gambar kucing astronot (rasio: 9:16 / 16:9 / 1:1 dst)'
    };
    const lines = [];
    const toolCount = Object.keys(TOOLS).length + Object.keys(getAllSkills()).length;
    for (const [cat, tools] of Object.entries(categories)) {
      lines.push(`「 ${toSC(cat)} 」`);
      for (const tool of tools) {
        if (TOOLS[tool]) lines.push(examples[tool] || tool);
      }
    }
    lines.push(`📸 scan gambar: kirim foto + caption .novaagent <tanya>`);
    lines.push(`🎙️ mode suara: .novaagent pakai suara — jawabanku dibacakan jadi voice note`);
    return m.reply(novaGuideV2("novaai", {
 kaomoji: "(๑˃ᴗ˂)ﻭ",
 sapaan: `ai agent dengan ${toolCount} perintah — ngobrol santai atau suruh aku ngapa'in! (≧∇≦)ﾉ`,
      cara: "tanya apa aja, atau suruh aku jalanin command bot",
      contoh: `${m.prefix}novaagent buka grup`,
      note: `reset sesi chat: ${m.prefix}novaagent reset`,
      spec: ["⚡ energi 1", "⏱ 3dtk", "💸 gratis"],
      extra: lines,
    }));
  }

  // 🔹 CHAT: MODE SUARA (request owner 18 Sep 2026: "apa g bsa gini aja
  // .novaagent pakai suara (mode n aktif)" + ".novaagent suara ardi" +
  // "jd cmd ttep nova agent gt" — command tetap .novaagent, jawaban
  // dibacakan jadi voice note neural)
  {
    const { VOICE_OPTIONS, getVoiceCfg, setVoiceCfg } = await import("../../src/lib/nova-voice-reply.js");
    const low = text.toLowerCase().trim();
    const voiceOn = ["pakai suara", "suara on", "suara aktif", "suara aktifkan", "suara nyala", "suara aktifkan ya", "mode suara", "mode suara on", "mode suara aktif"].includes(low);
    const voiceOff = ["suara off", "suara mati", "suara matikan", "suara nonaktif", "jangan pakai suara", "jangan pake suara", "tanpa suara", "mode suara off"].includes(low);
    const voiceStatus = low === "suara" || low === "suara status" || low === "suara info" || low === "suara list";
    const voiceMatch = low.match(/^suara\s+([a-z]+)$/);
    if (voiceOn || voiceOff || voiceStatus || (voiceMatch && VOICE_OPTIONS.some(v => v.id === voiceMatch[1]))) {
      if (voiceOn) {
        setVoiceCfg(db, m.chat, { on: true });
        const cfg = getVoiceCfg(db, m.chat);
        return m.reply(claraWrap("novaagent suara", [
          "Mode suara AKTIF di chat ini",
          "Semua jawabanku akan dibacakan jadi voice note",
          "Suara saat ini: " + (VOICE_OPTIONS.find(v => v.id === cfg.voice)?.name || cfg.voice),
          "",
          "Ganti suara: .novaagent suara ardi",
          "Matikan: .novaagent suara off",
        ]));
      }
      if (voiceOff) {
        setVoiceCfg(db, m.chat, { on: false });
        return m.reply(claraWrap("novaagent suara", [
          "Mode suara NONAKTIF",
          "Jawabanku kembali sebagai teks biasa",
        ]));
      }
      if (voiceMatch && VOICE_OPTIONS.some(v => v.id === voiceMatch[1])) {
        const v = VOICE_OPTIONS.find(v => v.id === voiceMatch[1]);
        setVoiceCfg(db, m.chat, { voice: v.id, on: true });
        return m.reply(claraWrap("novaagent suara", [
          "Suara diubah: " + v.id,
          "Nama: " + v.name,
          "Mode suara: AKTIF (otomatis ikut nyala)",
        ]));
      }
      // status / list
      const cfg = getVoiceCfg(db, m.chat);
      const lines = [
        "Status mode suara: " + (cfg.on ? "AKTIF — jawabanku dibacakan jadi voice note" : "NONAKTIF — jawaban teks biasa"),
        "Suara saat ini: " + (VOICE_OPTIONS.find(v => v.id === cfg.voice)?.name || cfg.voice),
        "",
        "Daftar suara:",
      ];
      VOICE_OPTIONS.forEach(v => lines.push("• " + v.id + " — " + v.name));
      lines.push("");
      lines.push("Aktifkan: .novaagent pakai suara");
      lines.push("Ganti suara: .novaagent suara ardi");
      lines.push("Matikan: .novaagent suara off");
      return m.reply(claraWrap("novaagent suara", lines));
    }
  }

  // 🔹 CHAT: reset sesi
  if (text.toLowerCase() === "reset") {
    const key = sessionKey(m);
    if (clearSession(key)) {
      return m.reply(bracketBox("i", "Nova Agent", ["Sesi percakapan direset", "Kirim pertanyaan baru untuk mulai"]));
    }
    return m.reply(bracketBox("i", "Nova Agent", ["Tidak ada sesi aktif"]));
  }

  // React 🧠
  try { await sock.sendMessage(m.chat, { react: { text: "🧠", key: m.key } }); } catch {}

  // 🔹 LOADING ALA AGENT (request owner 11 Sep: "aku mau novaai sistemnya kyk
  // .agent — bsa kesekusi ada pesan dia lg melakukan sesuatu"): 1 PESAN STATUS
  // EDIT-IN-PLACE — 🧠 mikir / 👀 baca gambar → ⚡ menjalankan <aksi> → jawaban
  // final di-EDIT ke pesan yang sama (cukup 1 chat di layar). Fallback m.reply
  // kalau edit gagal. Reaksi di pesan user: 🧠 → ⚡ → 🐣 / ❌.
  let novaStatusKey = null;
  const setStatus = async (text) => {
    try {
      if (!novaStatusKey) {
        const sent = await sock.sendMessage(m.chat, { text });
        novaStatusKey = sent?.key || null;
        return;
      }
      await sock.sendMessage(m.chat, { text, edit: novaStatusKey });
    } catch {}
  };
  // 🔹 FIX OWNER 17 Sep 2026 ("hasilnya singkat/kepotong... kalau plain
  // textnya emang panjang, langsung kirim walau panjang di chatnya daripada
  // dipotong/disingkat"): dulu semua jawaban final di-clip 4096 char + "..."
  // (kode HTML kepotong di ekor, info riset cuma sepotong). Sekarang: kirim
  // CHAT TERUSAN — pesan pertama di-edit ke status, sisanya dikirim berantai
  // sebagai chat terusan sampai ISINYA UTUH abis.
  const editFinal = async (text) => {
    if (typeof text !== "string" || !text.trim()) return;
    const parts = splitChatChunks(text);
    if (!parts.length) return;
    let ok = false;
    if (novaStatusKey) { try { await sock.sendMessage(m.chat, { text: parts[0], edit: novaStatusKey }); ok = true; } catch {} }
    if (!ok) { try { await m.reply(parts[0]); ok = true; } catch {} }
    if (!ok) { try { await sock.sendMessage(m.chat, { text: parts[0] }, { quoted: m }); ok = true; } catch {} }
    // sisa → chat terusan berantai (biar teks panjang tetep UTUH)
    for (let i = 1; ok && i < parts.length; i++) {
      try { await sock.sendMessage(m.chat, { text: parts[i] }, { quoted: m }); } catch { break; }
    }
  };

  // 🔹 VOICE REPLY (request owner 18 Sep 2026: ".novaagent pakai suara
  // (mode n aktif)" — jawaban dibacakan jadi voice note neural).
  // Dipanggil di SEMUA jalur jawaban final. return true = sudah dijawab
  // pakai VN (pemanggil SKIP editFinal teks); return false = jawab teks biasa.
  const voiceAnswer = async (finalText) => {
    try {
      if (typeof finalText !== "string" || !finalText.trim()) return false;
      const { wantsVoice, getVoiceCfg, speakVoiceNote, diagnoseVoiceTts, voiceFailHint } = await import("../../src/lib/nova-voice-reply.js");
      if (!wantsVoice(db, m.chat, textForAi)) return false;
      const cfg = getVoiceCfg(db, m.chat);
      const spoke = await speakVoiceNote(sock, m.chat, finalText, cfg.voice, { quoted: m });
      // 🔹 FIX 19 Sep 2026 (owner: "voice udh on, .novaagent hai malah dibalas
      // teks bkn vn"): dulu TTS gagal → SENYAP balik teks biasa → owner gak
      // tau kenapa. Sekarang kegagalannya KELIATAN + diagnosa penyebabnya.
      if (!spoke) {
        const issues = await diagnoseVoiceTts();
        await editFinal(finalText + "\n\n" + voiceFailHint(issues));
        return true; // sudah dijawab (teks + catatan) — pemanggil jangan kirim dobel
      }
      // 🔹 REVISI OWNER 20 Sep 2026 ("klo pakai suara pesan ini dihapus aja:
      // 🎙️ jawabannya kuputarakan di voice note di atas ya jd balasnya via
      // vn lngsung"): TANPA link → pesan status/loading DIHAPUS TOTAL
      // (pola delete voicechanger.js) — jawaban murni VN doang, gak ada
      // catatan 🎙️. ADA link → teks penuh tetap dikirim (link gak kebaca
      // kalau dibacakan di VN), catatan tetap gak dikirim.
      if (/https?:\/\//i.test(finalText)) {
        await editFinal(finalText);
      } else if (novaStatusKey) {
        try {
          await sock.sendMessage(m.chat, {
            delete: { remoteJid: m.chat, id: novaStatusKey.id, fromMe: true },
          });
        } catch {}
      }
      return true;
    } catch { return false; }
  };

  // 🔹 ROTASI STATUS — fase loading berputar per 8 dtk (lib nova-status-rotate):
  // berpikir → mencari → mengerjakan → menyusun (request owner 12 Sep).
  const startStatusRotation = (phases, intervalMs = 8000) => startStatusRotationLib(setStatus, phases, intervalMs);

  // 🔹 VISION: upload gambar + caption .novaai <pertanyaan> (tanpa pertanyaan
  // = analisis umum) ATAU reply gambar dengan .novaai <pertanyaan> — AI scan
  // gambar: selesaikan soal tugas, baca struk, jelasin foto, dll (Gemini native)
  const directImage = m.isImage ? m : null;
  const quotedImage = m.quoted?.isImage ? m.quoted : null;
  const imageSource = directImage || quotedImage;
  if (imageSource) {
    const key = sessionKey(m);
    const history = getSession(key);
    const question = text || "Jelaskan apa yang ada di gambar ini secara lengkap dan berguna.";
    try {
    await m.react("🕒");
      await setStatus("👀 " + smallcapsText("Scanning..."));
      appendSession(key, "user", `(mengirim gambar) ${question}`);
      const stopRotateV = startStatusRotation([
        "👀 " + smallcapsText("Scanning..."),
        "🔍 " + smallcapsText("Searching..."),
        "🛠️ " + smallcapsText("Action..."),
        "✍️ " + smallcapsText("Composing..."),
      ]);
      let buffer = null;
      let answer = null;
      let visionEngine = "gemini";
      try {
        buffer = await (directImage ? m.download() : m.quoted.download());
        const sysPrompt = buildSystemPrompt(config?.command?.prefix || ".", config?.bot?.name || "Nova AI") + memoryBlock(db, m.sender, question);
        // 🔹 FIX 17 Sep 2026 (owner report "scan gambar gagal di .novaagent"):
        // dulunya CUMA callGeminiVision — key google pusat expired → scan
        // GAGAL TOTAL tanpa fallback. Sekarang: Gemini dulu (key valid = paling
        // presisi), gagal → RANTAI visionScan (Gemini → SenseNova vision →
        // describe+LLM) biar scan tetap jalan walau key Google mati.
        try {
          answer = await callGeminiVision(question, buffer, {
            systemPrompt: sysPrompt,
            senderJid: m.sender,
          });
        } catch (gemErr) {
          console.error("[novaai] gemini vision gagal, fallback chain:", gemErr.message);
          const v = await visionScan({
            imageBuffer: buffer,
            question,
            instruction: sysPrompt,
            sessionKey: key,
          });
          if (!v?.status || !v?.text) throw new Error("rantai vision gagal jawab");
          answer = v.text;
          visionEngine = v.engine || "vision-chain";
        }
      } finally {
        stopRotateV();
      }
      appendSession(key, "assistant", answer);
      const { text: visibleText, action } = parseAIResponse(answer);
      if (action) {
        await setStatus("⚡ " + smallcapsText("novaagent sedang mengeksekusi: " + action.command));
        if (db) config.__db = db;
        const result = await executeCommand(action, m, sock, config);
        if (!result.success && result.message) {
          await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
        }
      }
      if (visibleText && (await voiceAnswer(visibleText))) { await m.react("🐣"); return; }
      if (visibleText) await editFinal(visibleText);
      await m.react("🐣");
      return;
    } catch (e) {
      console.error("[novaai] vision gagal:", e.message);
      await m.react("❌");
      return editFinal(claraWrap("novaagent", `Gagal menganalisis gambar: ${e.message}`, "error"));
    }
  }

  // 🔹 SESSION: histori obrolan dikirim ke AI biar reply NYAMBUNG — fix bug
  // user jawab "iya" / "mau" malah dibalas sapaan generik kayak sesi baru.
  // 🔹 QUOTED: kalau user reply pesan, teks pesan itu ikut jadi konteks
  const sessionKeyNow = sessionKey(m);
  const histSnapshot = [...getSession(sessionKeyNow)];
  const quotedText = m.quoted?.text?.trim() || "";
  const textForAi = quotedText ? `${text}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}` : text;
  appendSession(sessionKeyNow, "user", text);

  // TAHAP 1: localParse (instan, tanpa API) — cek pola grup
  let decision = localParse(text);

  // TAHAP 2: think() — kalimat rumit → AI provider (dengan histori sesi)
  if (!decision) {
    // react 🧠 global udah ada di atas (line react 🧠) — cukup status text
    await setStatus("🧠 " + smallcapsText("Thinking..."));
    const stopRotate = startStatusRotation([
      "🧠 " + smallcapsText("Thinking..."),
      "🔍 " + smallcapsText("Searching..."),
      "🛠️ " + smallcapsText("Action..."),
      "✍️ " + smallcapsText("Composing..."),
    ]);
    try {
      const prefixForThink = config?.command?.prefix || ".";
      // 🔹 FIX 12 Sep 2026 (owner report ".novaagent" gak bisa cari info
      // terkini — jawab dari halusinasi training data lama padahal by-design
      // .novaagent gak browsing sama sekali, beda dari .aisuperagent): query
      // berita/viral/terkini → quick web search 1x dulu, hasil dititip ke
      // prompt think() biar jawaban akurat + boleh cite link sumber asli.
      let webSearchCtx = null;
      const searchIntent = needsWebSearch(textForAi);
      if (searchIntent) {
        // 🔹 FIX 17 Sep 2026: query DIBERSIHKIN dulu (teks mentah "tolong
        // carikan script md 5k fitur" bikin engine lowRelevance → null).
        const q = buildSearchQuery(textForAi) || textForAi;
        const found = await quickWebSearch(q).catch(() => null);
        if (found) webSearchCtx = found.block;
      }
      decision = await think(textForAi, {
        botname: config?.bot?.name || "Nova AI",
        mentions: (m.mentionedJid || []).map(j => j.split("@")[0]).join(", "),
        executableCmds: buildExecutableList(),
        commandList: buildCommandContext(prefixForThink),
        history: histSnapshot.slice(-12),
        // 🔹 MEMORY: fakta durabel user ditempel ke system prompt otak AI
        memory: memoryFactsInline(db, m.sender, textForAi),
        // 🔹 WEB SEARCH: hasil browsing ringan (kalau query butuh info terkini)
        webSearch: webSearchCtx,
        // 🔹 FIX 17 Sep 2026: request yang udah ke-trigger quickWebSearch
        // = minta MENCARI dari internet → tool dikunci null, jawab dari
        // hasil pencarian (anti nyamber createfile/genimage — owner report
        // "carikan script md 5k fitur" malah generate gambar lagi).
        // 🔹 kunci dari INTENT (bukan cuma hasil): pencarian gagal pun,
        // jawaban dari pengetahuan + tool null tetap lebih benar daripada
        // nyamber createfile/genimage (owner report 17 Sep).
        forceNoTools: !!webSearchCtx || searchIntent,
      });
    } catch (e) {
      // 🔹 CHAT FALLBACK: coba callIkyy/callAI sebelum menyerah
      try {
        const prefix = config?.command?.prefix || ".";
        const botName = config?.bot?.name || "Nova AI";
        const key = sessionKey(m);
        // user text sudah di-append di atas (jalur utama) — pakai snapshot-nya
        const history = [...getSession(key)];
        const messages = [...history.slice(-20).map(i => ({ role: i.role, content: i.content }))];
        const aiConfig = config?.aiHelp || {};
        const systemPrompt = buildSystemPrompt(prefix, botName) + memoryBlock(db, m.sender, text);
        let reply;
        try {
          reply = await callIkyy(text, { systemPrompt, senderJid: m.sender, model: "gemini" });
        } catch {
          reply = await callAI({
            providerKey: "tio_openai",
            model: aiConfig.openaiModel || "kilo-auto/free",
            messages, systemPrompt,
            apiKey: aiConfig.openaiApiKey || aiConfig.apiKey || "",
            apiEndpoint: aiConfig.apiEndpoint || getTioEndpoint(),
            maxTokens: 4096, senderJid: m.sender,
          });
        }
        appendSession(key, "assistant", reply);
        // 🔹 MEMORY: ekstrak fakta durabel — fire-and-forget, gak nge-block jawaban
        extractMemories(db, m.sender, text, reply).catch(() => {});
        const { text: visibleText, action } = parseAIResponse(reply);
        if (action) {
          await setStatus("⚡ " + smallcapsText("novaagent sedang mengeksekusi: " + action.command));
          if (db) config.__db = db;
          const result = await executeCommand(action, m, sock, config);
          if (!result.success && result.message) await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
        }
        if (visibleText && (await voiceAnswer(visibleText))) { await m.react("🐣"); return; }
        if (visibleText) await editFinal(visibleText);
        await m.react("🐣");
        return;
      } catch (e2) {
        await m.react("❌");
        return editFinal(claraWrap("novaagent", `Gagal ke otak AI: ${e2.message}`, "error"));
      }
    } finally {
      stopRotate(); // wajib: think SUKSES pun rotator harus berhenti
    }
  }

  // 🔹 CHAT: tool null = user ngobrol atau minta execCommand (dari think() JSON langsung)
  // 🔹 Registry gabungan TOOLS + SKILLS + MCP (request owner 12 Sep 2026 —
  // 🔹 agent serba bisa: tool inti + skills + server MCP eksternal)
  const AGENT_TOOLS = await getAgentTools();
  if (!decision?.tool || !AGENT_TOOLS[decision.tool]) {
    if (decision?.reply) {
      // catat jawaban AI ke sesi — biar turn berikutnya tetap nyambung
      appendSession(sessionKeyNow, "assistant", decision.reply);
      // 🔹 MEMORY: ekstrak fakta durabel — fire-and-forget, gak nge-block jawaban
      extractMemories(db, m.sender, textForAi, decision.reply).catch(() => {});
      const { text: visibleText, action } = parseAIResponse(decision.reply);
      // 🔹 AUTO-EXECUTE: dari field execCommand (think() JSON) ATAU tag [ACTION] di teks reply
      const execFromJson = decision.execCommand ? { command: decision.execCommand, args: decision.execArgs || "" } : null;
      const finalAction = execFromJson || action;
      if (finalAction) {
        await m.react("⚡");
        await setStatus("⚡ " + smallcapsText("novaagent sedang mengeksekusi: " + finalAction.command));
        if (db) config.__db = db;
        const result = await executeCommand(finalAction, m, sock, config);
        if (!result.success && result.message) await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
      }
      if (visibleText && (await voiceAnswer(visibleText))) { await m.react("🐣"); return; }
      if (visibleText) await editFinal(visibleText);
      await m.react("🐣");
      return;
    }
    await m.react("❌");
    return editFinal(claraWrap("novaagent", "Tidak ada respons yang cocok", "error"));
  }

  const tool = AGENT_TOOLS[decision.tool];

  // GERBANG IZIN — dicek di level KODE
  if (tool.perm === "admin") {
    if (!m.isGroup) return m.reply(claraWrap("novaagent", "Perintah ini hanya bisa di dalam grup", "error"));
    if (!m.isAdmin) return m.reply(claraWrap("novaagent", "Kamu bukan admin, tidak bisa menjalankan ini", "error"));
    if (!m.isBotAdmin) return m.reply(claraWrap("novaagent", "Jadikan aku admin dulu supaya bisa menjalankan ini", "error"));
  }
  if (tool.perm === "owner") {
    if (!m.isOwner) return m.reply(claraWrap("novaagent", "Perintah ini khusus owner bot", "error"));
  }

  // normalisasi user (dari @mention / reply / NAMA member / nomor)
  let finalArgs = decision.args || {};
  if (tool.args?.includes("user")) {
    let user = finalArgs.user;
    if (m.mentionedJid?.length) user = m.mentionedJid[0];
    else if (m.quoted?.sender) user = m.quoted.sender;
    else if (user) {
      const digitsOnly = String(user).replace(/[^0-9]/g, "");
      const looksLikeNumber = /^\d{8,15}$/.test(digitsOnly) && !/[a-zA-Z]/.test(String(user));
      if (!looksLikeNumber) {
        // bukan nomor murni → coba cari JID member dari NAMA yang disebut
        const resolved = await resolveUserByName(sock, m, user);
        if (resolved && resolved.multiple) {
          const list = resolved.multiple.map(c => `• ${c.name} (${c.jid.split("@")[0]})`).join("\n");
          return m.reply(claraWrap("novaagent", `Ada ${resolved.multiple.length} member mirip "${user}":\n${list}\n\nSebutkan lebih spesifik atau @mention langsung.`, "error"));
        }
        if (!resolved) {
          return m.reply(claraWrap("novaagent", `Nama "${user}" tidak ditemukan di grup ini.\nCoba @mention langsung, reply pesannya, atau tulis nomornya (62xxx).`, "error"));
        }
        user = resolved;
      }
    }
    user = String(user || "").replace(/[^0-9]/g, "");
    if (!user) return m.reply(claraWrap("novaagent", `Usernya siapa? Reply pesannya, @mention, atau sebutkan nama membernya.\n\n💡 Contoh: ${m.prefix}${m.command} kick @user`, "error"));
    finalArgs.user = user + "@s.whatsapp.net";
  }

  // aksi berbahaya → konfirmasi dulu (owner langsung jalan)
  if (tool.danger && !m.isOwner) {
    pending.set(m.sender + m.chat, { tool: decision.tool, args: finalArgs, time: Date.now() });
    const target = finalArgs.user ? "@" + finalArgs.user.split("@")[0] : "";
    const confirmText = "⚠️ Kamu yakin mau " + decision.tool + " " + target + "?\nBalas YA untuk lanjut, balas lain untuk batal. (60 detik)";
    let edited = false;
    if (novaStatusKey) { try { await sock.sendMessage(m.chat, { text: confirmText, edit: novaStatusKey }); edited = true; } catch {} }
    if (!edited) return sock.sendMessage(m.chat, {
      text: confirmText,
      mentions: finalArgs.user ? [finalArgs.user] : []
    }, { quoted: m });
  }

  // EKSEKUSI — status "lagi melakukan sesuatu" ala agent, final di-edit ke pesan itu
  try {
    await m.react("⚡");
    // 🔹 FASE "SEDANG NGERJAIN" NATURAL (request owner 13 Sep 2026: "kliatan
    // agent itu hidup bgt kyk asisten sungguhan, klo mau melakukan atau sdh
    // dilakukan dia ngomong gt") — ganti status teknis "sedang mengeksekusi:
    // closegc..." jadi obrolan natural ala asisten asli sebelum aksi jalan.
    const doingPhrase = TOOL_NATURAL_DOING[decision.tool] || ("ngerjain " + decision.tool + "-nya");
    await setStatus("⚡ " + smallcapsText("oke, bentar ya, lagi " + doingPhrase + "..."));
    await tool.run(sock, m, finalArgs);
    // 🔹 FASE "SUDAH DILAKUKAN" NATURAL + ANTI HALUSINASI (lanjutan fix 13
    // Sep 2026: ".novaagent buatkan gambar kucing" dibalas teks yang NGARANG
    // soal deskripsi grup — dulu di-fix paksa selalu pakai tool.done statis,
    // TAPI itu bikin konfirmasi kaku/robotik lagi, request owner mau tetep
    // natural). Sekarang decision.reply (bahasa natural AI, variatif) TETAP
    // dipakai sebagai default — CUMA di-tolak & fallback ke tool.done kalau
    // reply-nya nyebut topik tool LAIN yang bukan tool yang beneran
    // dieksekusi (TOOL_TOPIC guard, contoh: reply nyebut "gambar" padahal
    // yang jalan "setdesc" → suspicious/halusinasi → pakai tool.done).
    const naturalReply = decision.reply ? sanitizeAiReply(decision.reply) : "";
    const conflictTopic = Object.entries(TOOL_TOPIC).find(
      ([toolKey, topicWord]) => toolKey !== decision.tool && naturalReply.toLowerCase().includes(topicWord.toLowerCase())
    );
    const confirmText = (naturalReply && !conflictTopic) ? naturalReply : (tool.done || naturalReply || "Selesai.");
    if (await voiceAnswer(confirmText)) {
      // jawaban eksekusi dibacakan VN — sesi tetap dicatat di bawah
    } else {
      await editFinal(confirmText);
    }
    // 🔹 FIX 17 Sep 2026 (owner report: "buatkan gambar kucing" → gambar
    // terkirim → "carikan script md 5k fitur" → MALAH generate gambar LAGI).
    // AKAR: jalur tool-exec gak pernah nyatet hasil ke sesi → histori = 2 user
    // turn berturut-turut tanpa assistant → otak AI ngira request gambar lama
    // "belum dijawab" → diulang. FIX: catat [SUDAH DIEKSEKUSI] + nama tool +
    // ringkasan args biar giliran berikutnya model tahu aksi itu UDAH selesai
    // dan fokus ke pesan user TERBARU.
    const argSummary = Object.entries(finalArgs || {}).map(([k, v]) => `${k}=${String(v).slice(0, 80)}`).join(", ");
    appendSession(sessionKeyNow, "assistant",
      `[SUDAH DIEKSEKUSI] tool "${decision.tool}"${argSummary ? ` (${argSummary})` : ""} — ${confirmText}`);
    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
  } catch (e) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    await editFinal(claraWrap("novaagent", `Gagal eksekusi: ${e.message}`, "error"));
  }
}

// 🔹 Konfirmasi handler untuk aksi berbahaya
export function novaaiConfirmHandler(m, sock) {
  const key = m.sender + m.chat;
  const p = pending.get(key);
  if (!p || !m.text) return false;
  pending.delete(key);
  if (Date.now() - p.time > 60000) return false;
  if (/^(ya|y|yes|lanjut|gas)\b/i.test(m.text.trim())) {
    (async () => {
      const reg = await getAgentTools();
      const tool = reg[p.tool];
      if (!tool) return m.reply(claraWrap("novaagent", "Tool-nya gak ketemu lagi (dicabut?)", "error"));
      try {
        await tool.run(sock, m, p.args);
        appendSession(`agent:${m.sender}`, "assistant", `[SUDAH DIEKSEKUSI] tool "${p.tool}" — ${tool.done || ""}`);
        m.reply(tool.done || "");
      }
      catch (e) { m.reply(claraWrap("novaagent", `Gagal: ${e.message}`, "error")); }
    })();
  } else { m.reply(claraWrap("novaagent", "Dibatalkan")); }
  return true;
}

export { pluginConfig as config, handler };
