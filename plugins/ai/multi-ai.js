// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI, DEFAULT_PROVIDERS } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatabase() {
  const { getDatabase: getDb } = require("../../src/lib/nova-database.js");
  return getDb();
}

function getCustomProviders() {
  try {
    const db = getDatabase();
    const data = db.get("aiCustomProviders");
    if (data && typeof data === "object") return data;
  } catch {}
  return {};
}

function getAllProviders() {
  const custom = getCustomProviders();
  return { ...DEFAULT_PROVIDERS, ...custom };
}

function resolveModel(providerKey, modelArg) {
  const providers = getAllProviders();
  const provider = providers[providerKey];
  if (!provider) return null;
  const models = Array.isArray(provider.models) ? provider.models : [];
  const model = modelArg && models.includes(modelArg) ? modelArg : provider.defaultModel || provider.model || modelArg;
  return { provider, model };
}

const pluginConfig = {
  name: "multi-ai",
  alias: ["multiai", "aimulti", "aichatv2", "aimodels"],
  category: "ai",
  description: "Chat dengan berbagai AI (OpenAI, Gemini, Claude, Groq, Together, Blackbox, Mistral, DeepSeek, GitHub Models, Llama + custom)",
  usage: ".multi-ai <provider> <pesan> | .multi-ai list",
  example: ".multi-ai gemini Jelaskankan quantum computing",
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
    const args = (m.text || "").trim().split(/\s+/).filter(Boolean);
    const providerArg = (args[0] || "").toLowerCase();
    const modelArg = (args[1] || "").trim();
    const message = args.slice(2).join(" ").trim();

    if (!providerArg || providerArg === "list" || providerArg === "daftar") {
      const providers = getAllProviders();
      const lines = Object.entries(providers).map(([key, provider]) => {
        const models = (provider.models || [provider.model || "-"]).map((model) => `• ${model}`).join("\n");
        return `${provider.name || key} (${key})\nDefault: ${provider.defaultModel || provider.model || "-"}\n${models}`;
      });

      const text = claraWrap("Multi AI",
        lines.join("\n") +
        "\n\nPAKAI:\n" +
        `◦ Penggunaan: *${prefix}multi-ai <provider> [model] <pesan>*\n` +
        `◦ Contoh: *${prefix}multi-ai gemini Jelaskankan quantum computing*\n` +
        `◦ Contoh: *${prefix}multi-ai openai gpt-4o-mini Apa itu AI?*\n` +
        `◦ Tambah AI lain: *${prefix}ai-addprovider <nama> <endpoint> <model> [apiKey]*`
      );

      await sendReplyWithNav(sock, m, text, "multi-ai");
      return { handled: true };
    }

    if (!message) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}multi-ai <provider> [model] <pesan>*`,
          `◦ Contoh: *${prefix}multi-ai claude Jelaskankan AI*`,
          `◦ Ketik *${prefix}multi-ai list* untuk lihat daftar provider`].join("\n"));;

      await sendReplyWithNav(sock, m, text, "multi-ai");
      return { handled: true };
    }

    const resolved = resolveModel(providerArg, modelArg);
    if (!resolved) {
      const text =
        claraWrap("Tidak Dikenal", [`◦ Provider *${providerArg}* tidak dikenali.`,
          `◦ Lihat provider custom: *${prefix}ai-addprovider list*`,
          `◦ Ketik *${prefix}multi-ai list* untuk lihat daftar.`].join("\n")) +
        "\n" ;

      await sendReplyWithNav(sock, m, text, "multi-ai");
      return { handled: true };
    }

    const { provider, model } = resolved;
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(typeof provider.chatEndpoint === "function" ? provider.chatEndpoint(model || providerArg) : provider.chatEndpoint || aiConfig.apiEndpoint || "");
    const systemPrompt = String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu.");

    m.react("🕐");
    const reply = await callAI({
      providerKey: providerArg,
      model,
      messages: [{ role: "user", content: message }],
      systemPrompt,
      apiKey,
      apiEndpoint,
    });

    const text =
      claraWrap("Multi AI", "🤖") +
      claraWrap(provider.name.toUpperCase(), [
        `◦ Model: *${model}*`,
        `◦ Kamu: *${message.slice(0, 200)}${message.length > 200 ? "..." : ""}*`,
        `◦ AI: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`,
      ]) +
      
      "\n"  +
      "\n" ;

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" ;

    await sendReplyWithNav(sock, m, text, "multi-ai");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
