// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai.js — Chat dengan Nova AI (Tio API, terhubung sistem bot + auto-execute)
import { callAI } from "../../src/lib/nova-ai-service.js";
import { bracketBox } from "../../src/lib/nova-menu-style.js";
import { getCommandsByCategory, getCategories, getAllCommandNames, getPlugin } from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "tanyaai",
  alias: ["tanyaai", "nova-ai", "novaai", "nova", "tanya"],
  category: "ai",
  description: "Chat dengan Nova AI — Asisten bot cerdas yang bisa jalanin command otomatis",
  usage: ".tanyaai <pertanyaan>",
  example: ".tanyaai tolong tutup grup",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Games", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

const CATEGORY_EMOJIS = {
  ai: "🤖", sticker: "🖼️", download: "📥", fun: "🎮",
  canvas: "🎨", tools: "🛠️", game: "🎯", rpg: "🗡️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
};

// Kategori command yang BOLEH di-auto-execute oleh AI
// (yang aman, tidak merusak, tidak owner-only)
const SAFE_EXEC_CATEGORIES = [
  "group", "search", "download", "media", "fun", "sticker",
  "tools", "random", "info", "religi", "game",
];

// Command yang DILARANG di-auto-execute (terlalu berisiko)
const BLOCKED_EXEC_COMMANDS = [
  "self", "public", "setprefix", "setpp", "setname", "addowner",
  "delowner", "join", "leave", "kick", "promote", "demote",
  "addpremium", "delpremium", "addlimit", "setlimit", "bc", "bcgc",
  "pushkontak", "jpm", "shutdown", "restart", "exec", "eval",
  "setbotpp", "autoread", "autotyping", "autosw",
];

/**
 * Build command list untuk system prompt — biar AI tahu command apa aja yang ada
 * dan bisa arahin user ke command yang tepat.
 */
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
  } catch {
    return "";
  }
}

/**
 * Build list command yang bisa di-auto-execute (untuk system prompt)
 */
function buildExecutableList() {
  try {
    const commandsByCategory = getCommandsByCategory();
    const execCmds = [];
    for (const cat of SAFE_EXEC_CATEGORIES) {
      const cmds = (commandsByCategory[cat] || []).map(c => c.command || c);
      for (const cmd of cmds) {
        if (!BLOCKED_EXEC_COMMANDS.includes(cmd)) {
          execCmds.push(cmd);
        }
      }
    }
    return [...new Set(execCmds)].sort().join(", ");
  } catch {
    return "";
  }
}

/**
 * System prompt untuk Nova AI — tahu semua command bot, bisa arahin user,
 * DAN bisa auto-execute command yang aman.
 */
function buildSystemPrompt(prefix, botName) {
  const commandList = buildCommandContext(prefix);
  const executableCmds = buildExecutableList();
  const now = new Date();
  const tanggalHariIni = now.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return `Kamu adalah ${botName}, asisten AI WhatsApp bot yang ramah, cerdas, dan responsif. Kamu menjawab dalam bahasa Indonesia dengan gaya santai tapi informatif. Gunakan emoji secukupnya.

PENTING — FAKTA TERKINI (training data kamu punya cutoff lama, WAJIB pakai info ini, bukan pengetahuan lama kamu):
- Hari ini: ${tanggalHariIni}
- Presiden Republik Indonesia SAAT INI adalah Prabowo Subianto (dilantik 20 Oktober 2024, menggantikan Joko Widodo/Jokowi yang sudah tidak menjabat). JANGAN pernah jawab Jokowi sebagai presiden aktif.
- Wakil Presiden RI saat ini adalah Gibran Rakabuming Raka.
- Jika ditanya soal jabatan/posisi publik lain yang mungkin sudah berubah setelah training data kamu, jujur bilang tidak yakin 100% dan sarankan cek command ${prefix}berita untuk info terkini, daripada asal jawab data lama.

PENTING — Kamu adalah bagian dari bot WhatsApp. Kamu TAHU semua command yang tersedia di bot ini.

== AUTO-EXECUTE FEATURE ==
Kamu BISA menjalankan command bot secara OTOMATIS untuk user. Jika user meminta sesuatu yang bisa kamu lakukan dengan command bot (bukan cuma nanya info), JALANKAN command tersebut!

Cara kerjanya: sertakan tag [ACTION] di akhir balasan kamu. Formatnya:
[ACTION:namacommand|argumen]

💡 *Contoh:*
- User: "tutup grup dong" => Balas: "Oke, grup ditutup ya!" lalu [ACTION:close|]
- User: "carikan musik faded" => Balas: "Sip, aku cariin musik Faded ya!" lalu [ACTION:play|faded]
- User: "bikin sticker dari gambar ini" (ada gambar) => Balas: "Oke, bikin sticker ya!" lalu [ACTION:sticker|]
- User: "download video ini https://youtu.be/xxx" => Balas: "Oke, download videonya!" lalu [ACTION:yt|https://youtu.be/xxx]

ATURAN AUTO-EXECUTE:
1. Hanya jalankan command yang ada di daftar executable: ${executableCmds}
2. JANGAN jalankan command owner/admin yang berisiko (kick, promote, bc, dll)
3. Untuk command yang butuh argumen (play, yt, dll), sertakan argumennya setelah tanda |
4. Untuk command yang tidak butuh argumen (close, open, dll), kosongkan setelah |
5. Hanya SATU [ACTION] per balasan. Jika user minta banyak hal, pilih yang paling relevan.
6. Jika command butuh gambar/video dan user tidak kirim media, beri tahu user untuk kirim gambarnya dulu.
7. Jika request user tidak cocok dengan command manapun, jangan pakai [ACTION], cukup jawab dengan teks biasa.
8. Hanya pakai [ACTION] jika user EXPLISIT meminta kamu melakukan sesuatu ("tutup grup", "carikan musik", "download ini"). Jika user cuma nanya "gimana cara download", cukup arahkan ke command tanpa [ACTION].

== DAFTAR COMMAND ==
Berikut adalah daftar command yang tersedia di bot (prefix: ${prefix}):

${commandList}

Jika user menanyakan command yang TIDAK ada di daftar, bilang dengan jujur bahwa fitur tersebut belum tersedia, dan sarankan command alternatif yang mirip.

Jangan gunakan markdown formatting (jangan pakai ** atau ##). Gunakan format plain text dengan nomor (1. 2. 3.) untuk poin jika perlu.`;
}

/**
 * Parse AI response untuk [ACTION:command|args] marker
 * Returns { text: string, action: { command, args } | null }
 */
function parseAIResponse(response) {
  const actionRegex = /\[ACTION:([a-zA-Z0-9_-]+)\|([^\]]*)\]/;
  const match = response.match(actionRegex);

  if (!match) {
    return { text: response.trim(), action: null };
  }

  const command = match[1].toLowerCase().trim();
  const args = match[2].trim();
  // Remove the action marker from the visible text
  const text = response.replace(actionRegex, "").trim();

  return { text, action: { command, args } };
}

/**
 * Execute a bot command from within nova-ai
 */
async function executeCommand(action, m, sock, botConfig) {
  try {
    const { command, args } = action;

    // Check if command is blocked
    if (BLOCKED_EXEC_COMMANDS.includes(command)) {
      return { success: false, message: `Command ${command} tidak boleh dijalankan oleh AI untuk alasan keamanan.` };
    }

    // Get the plugin
    const plugin = getPlugin(command);
    if (!plugin) {
      return { success: false, message: `Command ${command} tidak ditemukan.` };
    }

    // Check if it's in a safe category
    const category = plugin.config?.category || "";
    if (!SAFE_EXEC_CATEGORIES.includes(category)) {
      return { success: false, message: `Command ${command} (kategori: ${category}) tidak bisa dijalankan otomatis oleh AI.` };
    }

    // Check if plugin is enabled
    if (plugin.config?.isEnabled === false) {
      return { success: false, message: `Command ${command} sedang dinonaktifkan.` };
    }

    // Build a modified message object for the target command
    const argsArray = args ? args.split(/\s+/).filter(Boolean) : [];
    const fakeM = {
      ...m,
      command: command,
      args: argsArray,
      text: args || "",
      // Keep original chat, sender, reply, react, groupMetadata, etc.
    };

    // Execute the command
    console.log(`[nova-ai] auto-executing: ${command} args="${args}" by ${m.sender}`);

    await plugin.handler(fakeM, {
      sock,
      conn: sock,
      config: botConfig,
      db: botConfig.__db,
      args: argsArray,
      text: args || "",
      uptime: process.uptime() * 1000,
    });

    return { success: true, message: null };
  } catch (e) {
    console.error(`[nova-ai] auto-execute error:`, e.message);
    return { success: false, message: `Gagal menjalankan command: ${e.message}` };
  }
}

// Session storage per user (untuk memori percakapan singkat)
const sessions = new Map();
const SESSION_MAX = 10;

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

function getSession(key) {
  return sessions.get(key) || [];
}

function appendSession(key, role, content) {
  const hist = getSession(key);
  hist.push({ role, content });
  if (hist.length > SESSION_MAX * 2) hist.splice(0, hist.length - SESSION_MAX * 2);
  sessions.set(key, hist);
  return hist;
}

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const text = m.args?.join(" ").trim() || m.text?.replace(/^\.nova-ai\s+/i, "").replace(/^\.tanyaai\s+/i, "").trim();

    if (!text) {
      const help = bracketBox("i", "Nova AI", [
        `Asisten cerdas siap membantu`,
        `Bisa jalanin command bot otomatis!`,
        `Tanya apa saja, atau suruh aku ngapa`,
        ``,
        `Cara pakai: ${prefix}tanyaai <pertanyaan>`,
        `Contoh: ${prefix}tanyaai tutup grup`,
        `Contoh: ${prefix}tanyaai carikan musik faded`,
        `Reset sesi: ${prefix}tanyaai reset`,
      ]);
      return m.reply(help, "nova-ai");
    }

    // Reset sesi
    if (text.toLowerCase() === "reset") {
      const key = sessionKey(m);
      if (sessions.has(key)) {
        sessions.delete(key);
        return m.reply(bracketBox("i", "Nova AI", [
          `Sesi percakapan direset`,
          `Kirim pertanyaan baru untuk mulai`,
        ]));
      }
      return m.reply(bracketBox("i", "Nova AI", [`Tidak ada sesi aktif`]));
    }

    await m.react("🕒");

    // Build messages dengan history sesi
    const key = sessionKey(m);
    const history = getSession(key);
    appendSession(key, "user", text);

    const systemPrompt = buildSystemPrompt(prefix, botName);
    const aiConfig = botConfig.aiHelp || {};

    const messages = [
      ...history.slice(-20).map((item) => ({ role: item.role, content: item.content })),
    ];

    const reply = await callAI({
      providerKey: "tio_openai",
      model: aiConfig.openaiModel || "kilo-auto/free",
      messages,
      systemPrompt,
      apiKey: aiConfig.openaiApiKey || aiConfig.apiKey || "",
      apiEndpoint: aiConfig.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
      maxTokens: 4096,
      senderJid: m.sender,
    });

    appendSession(key, "assistant", reply);

    // Parse AI response untuk [ACTION] marker
    const { text: visibleText, action } = parseAIResponse(reply);

    await m.react("🐣");

    // Kirim balasan teks AI dulu
    const finalReply = visibleText.length > 4096 ? visibleText.slice(0, 4096) + "..." : visibleText;
    if (finalReply) {
      await m.reply(finalReply);
    }

    // Jika ada action, eksekusi command-nya
    if (action) {
      // Pass db to botConfig so executeCommand can use it
      if (db) botConfig.__db = db;

      const result = await executeCommand(action, m, sock, botConfig);

      if (!result.success && result.message) {
        await m.reply(`⚠️ ${result.message}`);
      }
    }
  } catch (e) {
    console.error("[nova-ai] error:", e.message);
    await m.react("❌");
    m.reply(te(prefix, m.command, m.pushName), "nova-ai");
  }
}

export { pluginConfig as config, handler };
