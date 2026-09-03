// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI AGENT PLUGIN — .novaai (merged with tanyaai)
// 🔹 Bisa EKSEKUSI aksi grup (tutup/buka/kick/promote/dll) via TOOLS
// 🔹 Bisa NGOBROL multi-turn dengan session history
// 🔹 Bisa AUTO-EXECUTE command bot yang aman via [ACTION] marker
// 🔹 Alur: localParse (instan) → think (AI provider) → [ACTION] auto-execute
// ============================================================

import { TOOLS, localParse, think, resolveUserByName } from "../../src/lib/aiagent.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";
import { claraWrap, bracketBox } from "../../src/lib/nova-menu-style.js";
import { getCommandsByCategory, getCategories, getPlugin } from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import te from "../../src/lib/nova-error.js";

// 🔹 AI AGENT: penyimpanan konfirmasi aksi berbahaya (kick, dll)
const pending = new Map();

// 🔹 CHAT: session history untuk multi-turn conversation
const sessions = new Map();
const SESSION_MAX = 10;
const sessionKey = (m) => `${m.sender}`;
function getSession(key) { return sessions.get(key) || []; }
function appendSession(key, role, content) {
  const hist = getSession(key);
  hist.push({ role, content });
  if (hist.length > SESSION_MAX * 2) hist.splice(0, hist.length - SESSION_MAX * 2);
  sessions.set(key, hist);
  return hist;
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
  return `Kamu adalah ${botName}, asisten AI WhatsApp bot yang ramah, cerdas, dan responsif. Kamu menjawab dalam bahasa Indonesia dengan gaya santai tapi informatif. Gunakan emoji secukupnya.

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
  name: "novaai",
  alias: ["novaai", "tanyaai", "nova-ai", "nova", "tanya"],
  category: "ai",
  description: "AI Agent — ngatur grup, ngobrol, & jalanin command bot via bahasa natural",
  usage: ".novaai <perintah/pertanyaan>",
  example: ".novaai tutup grup\n.novaai apa itu nodejs\n.novaai carikan musik faded\n.novaai kick @user",
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
    m.text?.replace(/^\.novaai\s+/i, "").replace(/^\.tanyaai\s+/i, "").replace(/^\.nova-ai\s+/i, "").trim();

  if (!text) {
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
      closegc: '.novaai tutup grup', opengc: '.novaai buka grup',
      lockedit: '.novaai kunci edit info grup', unlockedit: '.novaai buka edit info grup',
      setname: '.novaai ganti nama jadi [nama]', setdesc: '.novaai ganti deskripsi jadi [desc]',
      setpp: '.novaai ganti foto profil grup (reply gambar)', groupinfo: '.novaai info grup',
      kick: '.novaai kick @user', add: '.novaai tambah @user ke grup',
      promote: '.novaai jadikan @user admin', demote: '.novaai turunkan @user jadi member',
      block: '.novaai blokir @user', unblock: '.novaai unblokir @user',
      getlink: '.novaai link grup', revokelink: '.novaai reset link grup',
      approvalon: '.novaai aktifkan approval', approvaloff: '.novaai matikan approval',
      hidetag: '.novaai tag semua [pesan]', tagadmin: '.novaai tag admin [pesan]',
      poll: '.novaai poll [pertanyaan | opsi1, opsi2]', delmsg: '.novaai hapus pesan (reply)',
      leavegc: '.novaai keluar grup (owner only)'
    };
    let out = '╭─「 ✦ ɴᴏᴠᴀ ᴀɪ ✦ 」\n│\n';
    out += '│ 🧠 AI Agent — ' + Object.keys(TOOLS).length + ' perintah grup\n';
    out += '│ 💬 Ngobrol & auto-execute command bot\n│';
    for (const [cat, tools] of Object.entries(categories)) {
      out += '\n│ 📌 ' + toSC(cat) + ':\n';
      for (const tool of tools) {
        if (TOOLS[tool]) out += '│ • ' + (examples[tool] || tool) + '\n';
      }
    }
    out += '\n│\n│ 💡 Reset sesi chat: .novaai reset\n';
    out += '│ 💡 Tanya apa saja, atau suruh aku ngapa\n│';
    return m.reply(out + '\n╰────  •  ────');
  }

  // 🔹 CHAT: reset sesi
  if (text.toLowerCase() === "reset") {
    const key = sessionKey(m);
    if (sessions.has(key)) {
      sessions.delete(key);
      return m.reply(bracketBox("i", "Nova AI", ["Sesi percakapan direset", "Kirim pertanyaan baru untuk mulai"]));
    }
    return m.reply(bracketBox("i", "Nova AI", ["Tidak ada sesi aktif"]));
  }

  // React 🧠
  try { await sock.sendMessage(m.chat, { react: { text: "🧠", key: m.key } }); } catch {}

  // TAHAP 1: localParse (instan, tanpa API) — cek pola grup
  let decision = localParse(text);

  // TAHAP 2: think() — kalimat rumit → AI provider
  if (!decision) {
    try {
      const prefixForThink = config?.command?.prefix || ".";
      decision = await think(text, {
        botname: config?.bot?.name || "Nova AI",
        mentions: (m.mentionedJid || []).map(j => j.split("@")[0]).join(", "),
        executableCmds: buildExecutableList(),
        commandList: buildCommandContext(prefixForThink)
      });
    } catch (e) {
      // 🔹 CHAT FALLBACK: coba callIkyy/callAI sebelum menyerah
      try {
        const prefix = config?.command?.prefix || ".";
        const botName = config?.bot?.name || "Nova AI";
        const systemPrompt = buildSystemPrompt(prefix, botName);
        const key = sessionKey(m);
        const history = getSession(key);
        appendSession(key, "user", text);
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
            apiEndpoint: aiConfig.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
            maxTokens: 4096, senderJid: m.sender,
          });
        }
        appendSession(key, "assistant", reply);
        const { text: visibleText, action } = parseAIResponse(reply);
        if (visibleText) await m.reply(visibleText.length > 4096 ? visibleText.slice(0, 4096) + "..." : visibleText);
        if (action) {
          if (db) config.__db = db;
          const result = await executeCommand(action, m, sock, config);
          if (!result.success && result.message) await m.reply(claraWrap("Info", `⚠️ ${result.message}`));
        }
        return;
      } catch (e2) {
        return m.reply("╭─「 ✦ ɴᴏᴠᴀ ᴀɪ ✦ 」\n│\n│ ❌ Gagal ke otak AI: " + e2.message + "\n│\n╰────  •  ────");
      }
    }
  }

  // 🔹 CHAT: tool null = user ngobrol atau minta execCommand (dari think() JSON langsung)
  if (!decision?.tool || !TOOLS[decision.tool]) {
    if (decision?.reply) {
      const { text: visibleText, action } = parseAIResponse(decision.reply);
      if (visibleText) await m.reply(visibleText.length > 4096 ? visibleText.slice(0, 4096) + "..." : visibleText);
      // 🔹 AUTO-EXECUTE: dari field execCommand (think() JSON) ATAU tag [ACTION] di teks reply
      const execFromJson = decision.execCommand ? { command: decision.execCommand, args: decision.execArgs || "" } : null;
      const finalAction = execFromJson || action;
      if (finalAction) {
        if (db) config.__db = db;
        const result = await executeCommand(finalAction, m, sock, config);
        if (!result.success && result.message) await m.reply(claraWrap("Info", `⚠️ ${result.message}`));
      }
      return;
    }
    return m.reply("❌ Tidak ada respons yang cocok.");
  }

  const tool = TOOLS[decision.tool];

  // GERBANG IZIN — dicek di level KODE
  if (tool.perm === "admin") {
    if (!m.isGroup) return m.reply("❌ Perintah ini hanya bisa di dalam grup.");
    if (!m.isAdmin) return m.reply("❌ Kamu bukan admin, tidak bisa menjalankan ini.");
    if (!m.isBotAdmin) return m.reply("❌ Jadikan aku admin dulu supaya bisa menjalankan ini.");
  }
  if (tool.perm === "owner") {
    if (!m.isOwner) return m.reply("❌ Perintah ini khusus owner bot.");
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
          return m.reply(`❌ Ada ${resolved.multiple.length} member mirip "${user}":\n${list}\n\nSebutkan lebih spesifik atau @mention langsung.`);
        }
        if (!resolved) {
          return m.reply("❌ Nama \"" + user + "\" tidak ditemukan di grup ini.\nCoba @mention langsung, reply pesannya, atau tulis nomornya (62xxx).");
        }
        user = resolved;
      }
    }
    user = String(user || "").replace(/[^0-9]/g, "");
    if (!user) return m.reply("❌ Usernya siapa? Reply pesannya, @mention, atau sebutkan nama membernya.\nContoh: " + m.prefix + m.command + " kick @user");
    finalArgs.user = user + "@s.whatsapp.net";
  }

  // aksi berbahaya → konfirmasi dulu (owner langsung jalan)
  if (tool.danger && !m.isOwner) {
    pending.set(m.sender + m.chat, { tool: decision.tool, args: finalArgs, time: Date.now() });
    const target = finalArgs.user ? "@" + finalArgs.user.split("@")[0] : "";
    return sock.sendMessage(m.chat, {
      text: "⚠️ Kamu yakin mau " + decision.tool + " " + target + "?\nBalas YA untuk lanjut, balas lain untuk batal. (60 detik)",
      mentions: finalArgs.user ? [finalArgs.user] : []
    }, { quoted: m });
  }

  // EKSEKUSI
  try {
    await tool.run(sock, m, finalArgs);
    try { await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } }); } catch {}
    m.reply(decision.reply || tool.done);
  } catch (e) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    m.reply("❌ Gagal eksekusi: " + e.message);
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
    catch (e) { m.reply("❌ Gagal: " + e.message); }
  } else { m.reply("❌ Dibatalkan."); }
  return true;
}

export { pluginConfig as config, handler };
