// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";

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
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  let aiStatus = null; // status loading ala agent (owner 29 Sep)
  try {
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
        raraWrap("AI Chat", ["Status: *Dihapus*",
          "Memori percakapan sudah direset."].join("\n")) +
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
        raraCaption({
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

    // 🔹 STATUS LOADING ALA AGENT (owner 29 Sep: "ai satuan juga animasi biar
    // ketauan dia lg ngapain") — 🧠 Thinking... di-edit jadi jawaban final.
    aiStatus = await startAiStatus(sock, m);

    const history = getHistory(chatId);
    appendHistory(chatId, "user", message);

    const aiConfig = botConfig.aiHelp || {};
    const systemPrompt = String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang ramah dan jelas.");

    const messages = [
      ...history.slice(-20).map((item) => ({ role: item.role, content: item.content })),
      { role: "user", content: message },
    ];
    let reply;
    try {
      reply = await callIkyy(message, { systemPrompt, senderJid: m.sender, model: "gemini", sessionKey: "satuan:" + m.sender });
    } catch (ikyyErr) {
      console.error("[aichat] IkyyXD failed, falling back to OpenAI:", ikyyErr.message);
      reply = await callAI({
        providerKey: "openai",
        model: "gpt-4o-mini",
        messages,
        systemPrompt,
        apiKey: aiConfig.apiKey,
        apiEndpoint: aiConfig.apiEndpoint,
      });
    }

    appendHistory(chatId, "assistant", reply);

    const text =
      raraWrap("AI Chat", [`Kamu: *${message.slice(0, 200)}${message.length > 200 ? "..." : ""}*`,
        `AI: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aichat <pesan> untuk lanjut chat`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    if (aiStatus) await aiStatus.fail("AI Chat gagal merespons — coba lagi ya");
    else {
      await m.react("❌");
      await m.reply(raraError("AIChat", "Gagal nih, coba lagi ya"), "aichat");
    }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
