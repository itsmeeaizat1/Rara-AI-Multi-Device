// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI AGENT PLUGIN — .novaai (merged with tanyaai)
// 🔹 Bisa EKSEKUSI aksi grup (tutup/buka/kick/promote/dll) via TOOLS
// 🔹 Bisa NGOBROL multi-turn dengan session history
// 🔹 Bisa AUTO-EXECUTE command bot yang aman via [ACTION] marker
// 🔹 Alur: localParse (instan) → think (AI provider) → [ACTION] auto-execute
// ============================================================

import { TOOLS, localParse, think, resolveUserByName } from "../../src/lib/aiagent.js";
import { callAI, callIkyy, callGeminiVision } from "../../src/lib/nova-ai-service.js";
import { claraWrap, bracketBox } from "../../src/lib/nova-menu-style.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { getCommandsByCategory, getCategories, getPlugin } from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import te from "../../src/lib/nova-error.js";

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
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
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
  if (!match) return { text: response.trim(), action: null };
  const command = match[1].toLowerCase().trim();
  const args = match[2].trim();
  const text = response.replace(actionRegex, "").trim();
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
  alias: ["novaagent", "novaai", "tanyaai", "nova-ai", "nova", "tanya"],
  category: "ai",
  description: "Nova Agent — ngatur grup, ngobrol multi-turn nyambung, scan gambar, & jalanin command bot via bahasa natural",
  usage: ".novaagent <perintah/pertanyaan>\n.novaagent (reply/kirim gambar) — scan gambar: selesaikan tugas, baca foto, dll\n.novaagent reset — hapus sesi chat",
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
    m.text?.replace(/^\.novaagent\s+/i, "").replace(/^\.novaai\s+/i, "").replace(/^\.tanyaai\s+/i, "").replace(/^\.nova-ai\s+/i, "").trim();

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
      genimage: '.novaagent buatkan gambar kucing astronot'
    };
    const lines = [];
    lines.push(`🧠 AI Agent — ${Object.keys(TOOLS).length} perintah grup`);
    lines.push(`💬 Ngobrol & auto-execute command bot`);
    lines.push("");
    for (const [cat, tools] of Object.entries(categories)) {
      lines.push({ subHeader: toSC(cat) });
      for (const tool of tools) {
        if (TOOLS[tool]) lines.push(examples[tool] || tool);
      }
    }
    lines.push("");
    lines.push(`📸 Scan gambar: kirim foto + caption .novaagent <tanya>`);
    lines.push(`💡 Reset sesi chat: .novaagent reset`);
    lines.push(`💡 Tanya apa saja, atau suruh aku ngapa`);
    return m.reply(claraWrap("novaagent", lines));
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
      await setStatus("👀 " + smallcapsText("novaagent membaca gambar..."));
      appendSession(key, "user", `(mengirim gambar) ${question}`);
      const buffer = await (directImage ? m.download() : m.quoted.download());
      const answer = await callGeminiVision(question, buffer, {
        systemPrompt: buildSystemPrompt(config?.command?.prefix || ".", config?.bot?.name || "Nova AI"),
        senderJid: m.sender,
      });
      appendSession(key, "assistant", answer);
      const { text: visibleText, action } = parseAIResponse(answer);
      if (action) {
        await setStatus("⚡ " + smallcapsText("novaagent menjalankan: " + action.command));
        if (db) config.__db = db;
        const result = await executeCommand(action, m, sock, config);
        if (!result.success && result.message) {
          await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
        }
      }
      if (visibleText) await editFinal(visibleText);
      await m.react("🐣");
      return;
    } catch (e) {
      console.error("[novaai] vision gagal:", e.message);
      await m.react("❌");
      return editFinal(claraWrap("novaagent", `Gagal menganalisis gambar: ${e.message}`, "error"));
    }
  }

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
  const editFinal = async (text) => {
    if (typeof text !== "string" || !text.trim()) return;
    const clipped = text.length > 4096 ? text.slice(0, 4096) + "..." : text;
    let ok = false;
    if (novaStatusKey) { try { await sock.sendMessage(m.chat, { text: clipped, edit: novaStatusKey }); ok = true; } catch {} }
    if (!ok) await m.reply(clipped);
  };

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
    await setStatus("🧠 " + smallcapsText("novaagent sedang berpikir..."));
    try {
      const prefixForThink = config?.command?.prefix || ".";
      decision = await think(textForAi, {
        botname: config?.bot?.name || "Nova AI",
        mentions: (m.mentionedJid || []).map(j => j.split("@")[0]).join(", "),
        executableCmds: buildExecutableList(),
        commandList: buildCommandContext(prefixForThink),
        history: histSnapshot.slice(-12),
      });
    } catch (e) {
      // 🔹 CHAT FALLBACK: coba callIkyy/callAI sebelum menyerah
      try {
        const prefix = config?.command?.prefix || ".";
        const botName = config?.bot?.name || "Nova AI";
        const systemPrompt = buildSystemPrompt(prefix, botName);
        const key = sessionKey(m);
        // user text sudah di-append di atas (jalur utama) — pakai snapshot-nya
        const history = [...getSession(key)];
        const messages = [...history.slice(-20).map(i => ({ role: i.role, content: i.content }))];
        const aiConfig = config?.aiHelp || {};
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
        const { text: visibleText, action } = parseAIResponse(reply);
        if (action) {
          await setStatus("⚡ " + smallcapsText("novaagent menjalankan: " + action.command));
          if (db) config.__db = db;
          const result = await executeCommand(action, m, sock, config);
          if (!result.success && result.message) await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
        }
        if (visibleText) await editFinal(visibleText);
        await m.react("🐣");
        return;
      } catch (e2) {
        await m.react("❌");
        return editFinal(claraWrap("novaagent", `Gagal ke otak AI: ${e2.message}`, "error"));
      }
    }
  }

  // 🔹 CHAT: tool null = user ngobrol atau minta execCommand (dari think() JSON langsung)
  if (!decision?.tool || !TOOLS[decision.tool]) {
    if (decision?.reply) {
      // catat jawaban AI ke sesi — biar turn berikutnya tetap nyambung
      appendSession(sessionKeyNow, "assistant", decision.reply);
      const { text: visibleText, action } = parseAIResponse(decision.reply);
      // 🔹 AUTO-EXECUTE: dari field execCommand (think() JSON) ATAU tag [ACTION] di teks reply
      const execFromJson = decision.execCommand ? { command: decision.execCommand, args: decision.execArgs || "" } : null;
      const finalAction = execFromJson || action;
      if (finalAction) {
        await m.react("⚡");
        await setStatus("⚡ " + smallcapsText("novaagent menjalankan: " + finalAction.command));
        if (db) config.__db = db;
        const result = await executeCommand(finalAction, m, sock, config);
        if (!result.success && result.message) await editFinal(claraWrap("Info", `⚠️ ${result.message}`));
      }
      if (visibleText) await editFinal(visibleText);
      await m.react("🐣");
      return;
    }
    await m.react("❌");
    return editFinal(claraWrap("novaagent", "Tidak ada respons yang cocok", "error"));
  }

  const tool = TOOLS[decision.tool];

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
    await setStatus("⚡ " + smallcapsText("novaagent menjalankan: " + decision.tool + "..."));
    await tool.run(sock, m, finalArgs);
    await editFinal(decision.reply || tool.done);
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
    try { TOOLS[p.tool].run(sock, m, p.args); m.reply(TOOLS[p.tool].done); }
    catch (e) { m.reply(claraWrap("novaagent", `Gagal: ${e.message}`, "error")); }
  } else { m.reply(claraWrap("novaagent", "Dibatalkan")); }
  return true;
}

export { pluginConfig as config, handler };
