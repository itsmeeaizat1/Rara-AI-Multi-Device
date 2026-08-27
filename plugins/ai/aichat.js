// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/nova-database.js";
import {  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function getHistoryKey(chatId) {
  return `ai_chat_history_${chatId}`;
}

function getHistory(chatId) {
  try {
    const db = getDatabase();
    const data = db.get(chatId);
    return Array.isArray(data?.aiChatHistory) ? data.aiChatHistory : [];
  } catch {
    return [];
  }
}

function appendHistory(chatId, role, content) {
  try {
    const db = getDatabase();
    const current = db.get(chatId) || {};
    const history = Array.isArray(current.aiChatHistory) ? current.aiChatHistory : [];
    history.push({ role, content, time: Date.now() });
    if (history.length > 50) history.splice(0, history.length - 50);
    current.aiChatHistory = history;
    db.set(chatId, current);
  } catch (e) { console.error('[aichat.js]:', e.message); }
}

const pluginConfig = {
  name: "aichat",
  alias: ["aichat"],
  category: "ai",
  description: "Chat AI dengan memori percakapan per chat",
  usage: ".aichat <pesan> | .aichat clear",
  example: ".aichat Jelaskan kuantum computing",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const chatId = m.chat;

    if (raw.toLowerCase() === `${prefix}aichat clear` || raw.toLowerCase() === `${prefix}aichat reset`) {
      try {
        const db = getDatabase();
        const current = db.get(chatId) || {};
        current.aiChatHistory = [];
        db.set(chatId, current);
      } catch (e) { console.error('[aichat.js]:', e.message); }

      const text =
        claraWrap("AI Chat", ["│ Status: *Dihapus*",
          "│ Memori percakapan sudah direset."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}aichat <pesan> untuk mulai lagi`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

      await m.reply(text);
      return { handled: true };
    }

    const message = raw.replace(/^\.aichat\s+/i, "").trim();
    if (!message) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "aichat",
  description: "Chat AI dengan memori percakapan per chat",
  usage: `${prefix}aichat <pesan> | .aichat clear`,
  example: `${prefix}aichat Jelaskan kuantum computing`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "aichat");
      return { handled: true };
    }

    const history = getHistory(chatId);
    appendHistory(chatId, "user", message);

    const aiConfig = botConfig.aiHelp || {};
    const systemPrompt = String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang ramah dan jelas.");

    const messages = [
      ...history.slice(-20).map((item) => ({ role: item.role, content: item.content })),
      { role: "user", content: message },
    ];

    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages,
      systemPrompt,  // callAI akan inject mood otomatis via global.__novaMoodSender
      apiKey: aiConfig.apiKey,
      apiEndpoint: aiConfig.apiEndpoint,
    });

    appendHistory(chatId, "assistant", reply);

    const text =
      claraWrap("AI Chat", [`│ Kamu: *${message.slice(0, 200)}${message.length > 200 ? "..." : ""}*`,
        `│ AI: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aichat <pesan> untuk lanjut chat`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *Gagal*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "aichat");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
