// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai.js — Chat dengan Nova AI (Tio API, terhubung sistem bot)
import { callAI } from "../../src/lib/nova-ai-service.js";
import { bracketBox } from "../../src/lib/nova-menu-style.js";
import { getCommandsByCategory, getCategories, getAllCommandNames } from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "nova-ai",
  alias: ["novaai", "nova", "tanyaai", "tanya"],
  category: "ai",
  description: "Chat dengan Nova AI — Asisten bot cerdas yang tahu semua command",
  usage: ".nova-ai <pertanyaan>",
  example: ".nova-ai Apa itu Node.js?",
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
 * System prompt untuk Nova AI — tahu semua command bot, bisa arahin user.
 */
function buildSystemPrompt(prefix, botName) {
  const commandList = buildCommandContext(prefix);

  return `Kamu adalah ${botName}, asisten AI WhatsApp bot yang ramah, cerdas, dan responsif. Kamu menjawab dalam bahasa Indonesia dengan gaya santai tapi informatif. Gunakan emoji secukupnya.

PENTING — Kamu adalah bagian dari bot WhatsApp. Kamu TAHU semua command yang tersedia di bot ini. Jika user bertanya tentang fitur atau bingung cara pakai sesuatu, ARAHKAN mereka ke command yang tepat. Contoh:
- User: "cara bikin sticker?" → Jawab: "Kirim gambar dengan caption ${prefix}sticker atau reply gambar dengan ${prefix}sticker"
- User: "gimana download video YT?" → Jawab: "Ketik ${prefix}yt <link> untuk download video YouTube"
- User: "cara HD gambar?" → Jawab: "Reply gambar dengan ${prefix}hd atau ${prefix}remini untuk enhance HD"
- User: "ada game apa?" → Jawab: "Ketik ${prefix}allmenucategory untuk lihat semua kategori game"

Jangan gunakan markdown formatting (jangan pakai ** atau ##). Gunakan format plain text dengan nomor (1. 2. 3.) untuk poin jika perlu.

Berikut adalah daftar command yang tersedia di bot (prefix: ${prefix}):

${commandList}

Jika user menanyakan command yang TIDAK ada di daftar, bilang dengan jujur bahwa fitur tersebut belum tersedia, dan sarankan command alternatif yang mirip.`;
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

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const text = m.args?.join(" ").trim() || m.text?.replace(/^\.nova-ai\s+/i, "").replace(/^\.tanyaai\s+/i, "").trim();

    if (!text) {
      const help = bracketBox("i", "Nova AI", [
        `Asisten cerdas siap membantu`,
        `Tahu semua command bot — tanya apa saja`,
        `Bingung cara pakai fitur? Tanya aja!`,
        ``,
        `Cara pakai: ${prefix}nova-ai <pertanyaan>`,
        `Contoh: ${prefix}nova-ai cara bikin sticker?`,
        `Reset sesi: ${prefix}nova-ai reset`,
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
      providerKey: "openai",
      model: aiConfig.openaiModel || "kilo-auto/free",
      messages,
      systemPrompt,
      apiKey: aiConfig.openaiApiKey || aiConfig.apiKey || "",
      apiEndpoint: aiConfig.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
      maxTokens: 4096,
      senderJid: m.sender,
    });

    appendSession(key, "assistant", reply);

    await m.react("🐣");

    const finalReply = reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply;
    await m.reply(finalReply);
  } catch (e) {
    console.error("[nova-ai] error:", e.message);
    await m.react("❌");
    m.reply(te(prefix, m.command, m.pushName), "nova-ai");
  }
}

export { pluginConfig as config, handler };
