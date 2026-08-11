import {
  alyaHeader,
  bracketBox,
  separator,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-tio",
  alias: ["tio", "aio", "tioai", "asktio"],
  category: "ai",
  description: "Tanya AI menggunakan Tio AI (AIO) - 3 format: OpenAI, Gemini, Anthropic",
  usage: ".ai-tio <pertanyaan>",
  example: ".ai-tio jelaskan tentang black hole",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// MODEL ROUTING - auto detect which provider to use
// ═══════════════════════════════════════════════

const TIO_MODELS = [
  // Anthropic format
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", format: "anthropic", desc: "Paling pinter" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", format: "anthropic", desc: "Cepat & hemat" },
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", format: "anthropic", desc: "Legacy" },
  // OpenAI format
  { id: "gpt-4o", label: "GPT-4o", format: "openai", desc: "OpenAI flagship" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", format: "openai", desc: "Cepat & murah" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo", format: "openai", desc: "OpenAI turbo" },
  { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", format: "openai", desc: "Hemat" },
  { id: "deepseek-chat", label: "DeepSeek Chat", format: "openai", desc: "Reasoning" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", format: "openai", desc: "Deep reasoning" },
  // Gemini format
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", format: "gemini", desc: "Google cepat" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", format: "gemini", desc: "Google pro" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", format: "gemini", desc: "Google hemat" },
];

function getProviderKey(modelId) {
  const model = TIO_MODELS.find((m) => m.id === modelId);
  if (!model) return "tio_anthropic"; // default
  return "tio_" + model.format;
}

function getEndpoint(format) {
  switch (format) {
    case "openai": return "https://ai.tioo.eu.org/v1/chat/completions";
    case "gemini": return null; // dynamic per model
    case "anthropic": return "https://ai.tioo.eu.org/v1/messages";
    default: return "https://ai.tioo.eu.org/v1/messages";
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const prompt = raw.replace(/^\.ai-tio\s+/i, "").replace(/^\.tio\s+/i, "").replace(/^\.aio\s+/i, "").trim();

    const aiHelp = botConfig.aiHelp || {};
    const currentModel = aiHelp.model || "claude-sonnet-4-20250514";
    const hasKey = !!(aiHelp.apiKey || process.env.OPENAI_API_KEY);

    if (!prompt) {
      const currentMdl = TIO_MODELS.find((m) => m.id === currentModel);
      const currentLabel = currentMdl?.label || currentModel;
      const currentFormat = currentMdl?.format || "anthropic";

      // Group by format
      const anthropicModels = TIO_MODELS.filter((m) => m.format === "anthropic");
      const openaiModels = TIO_MODELS.filter((m) => m.format === "openai");
      const geminiModels = TIO_MODELS.filter((m) => m.format === "gemini");

      const fmtList = (list) => list.map((mdl, i) =>
        `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id})\n      ${mdl.desc}`
      ).join("\n");

      const text =
        alyaHeader("Tio AI (AIO)", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ Multi-model AI via *ai.tioo.eu.org*`,
          `◦ 3 Format: OpenAI / Gemini / Anthropic`,
          `◦ API Key: *${hasKey ? "Terpasang ✅" : "Belum diisi ❌"}*`,
          `◦ Model aktif: *${currentLabel}*`,
          `◦ Format: *${currentFormat.toUpperCase()}*`,
        ]) +
        "\n\n" +
        bracketBox("🟣", "ᴀɴᴛʜʀᴏᴘɪᴄ", [
          fmtList(anthropicModels),
        ]) +
        "\n\n" +
        bracketBox("🟢", "ᴏᴘᴇɴᴀɪ", [
          fmtList(openaiModels),
        ]) +
        "\n\n" +
        bracketBox("🔵", "ɢᴇᴍɪɴɪ", [
          fmtList(geminiModels),
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ", [
          `◦ *${prefix}ai-tio <pertanyaan>* — tanya AI`,
          `◦ *${prefix}ai-tio model <nama>* — ganti model`,
          `◦ *${prefix}ai-tio list* — lihat semua model`,
          `◦ *${prefix}ai-set apiKey <key>* — set API key`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Contoh: ${prefix}ai-tio jelaskan tentang AI`);

      await m.reply(text);
      return { handled: true };
    }

    // Handle "model" subcommand
    if (prompt.toLowerCase().startsWith("model ")) {
      const modelArg = prompt.slice(6).trim();

      if (modelArg.toLowerCase() === "list") {
        const text =
          alyaHeader("Tio AI Models", "🤖") +
          "\n\n" +
          bracketBox("🟣", "ᴀɴᴛʜʀᴏᴘɪᴄ", [
            TIO_MODELS.filter((m) => m.format === "anthropic")
              .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id})`)
              .join("\n"),
          ]) +
          "\n\n" +
          bracketBox("🟢", "ᴏᴘᴇɴᴀɪ", [
            TIO_MODELS.filter((m) => m.format === "openai")
              .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id})`)
              .join("\n"),
          ]) +
          "\n\n" +
          bracketBox("🔵", "ɢᴇᴍɪɴɪ", [
            TIO_MODELS.filter((m) => m.format === "gemini")
              .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id})`)
              .join("\n"),
          ]) +
          "\n\n" +
          separator("━", 22) +
          "\n" +
          tipText(`Ganti: ${prefix}ai-tio model <nama-model>`);
        await m.reply(text);
        return { handled: true };
      }

      const found = TIO_MODELS.find(
        (mdl) => mdl.id === modelArg || mdl.label.toLowerCase() === modelArg.toLowerCase()
      );

      if (!found) {
        const text =
          alyaHeader("Model Tidak Ditemukan", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Model *${modelArg}* tidak ditemukan`,
            `◦ Ketik *${prefix}ai-tio model list* untuk lihat semua`,
          ]) +
          "\n\n" +
          separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.model = found.id;

      const text =
        alyaHeader("Model Diganti", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴘᴇʀᴜʙᴀʜᴀɴ", [
          `◦ Model: *${found.label}*`,
          `◦ ID: *${found.id}*`,
          `◦ Format: *${found.format.toUpperCase()}*`,
          `◦ Endpoint: *${getEndpoint(found.format) || "dynamic"}*`,
          `◦ ${found.desc}`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}ai-tio <pertanyaan> untuk tes`);
      await m.reply(text);
      return { handled: true };
    }

    // Handle "list" subcommand
    if (prompt.toLowerCase() === "list") {
      const text =
        alyaHeader("Tio AI Models", "🤖") +
        "\n\n" +
        bracketBox("🟣", "ᴀɴᴛʜʀᴏᴘɪᴄ", [
          TIO_MODELS.filter((m) => m.format === "anthropic")
            .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id}) — ${mdl.desc}`)
            .join("\n"),
        ]) +
        "\n\n" +
        bracketBox("🟢", "ᴏᴘᴇɴᴀɪ", [
          TIO_MODELS.filter((m) => m.format === "openai")
            .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id}) — ${mdl.desc}`)
            .join("\n"),
        ]) +
        "\n\n" +
        bracketBox("🔵", "ɢᴇᴍɪɴɪ", [
          TIO_MODELS.filter((m) => m.format === "gemini")
            .map((mdl) => `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id}) — ${mdl.desc}`)
            .join("\n"),
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ganti: ${prefix}ai-tio model <nama-model>`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ Call Tio AI ═══
    const apiKey = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    const model = aiHelp.model || "claude-sonnet-4-20250514";
    const systemPrompt = aiHelp.systemPrompt || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    if (!apiKey) {
      const text =
        alyaHeader("API Key Belum Diisi", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ API Key Tio AI belum di-set`,
          `◦ Set di config.js: aiHelp.apiKey`,
          `◦ Atau ketik *${prefix}ai-set apiKey <key>*`,
        ]) +
        "\n\n" +
        separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Auto-route to correct provider based on model
    const providerKey = getProviderKey(model);
    const modelInfo = TIO_MODELS.find((m) => m.id === model);
    const format = modelInfo?.format || "anthropic";

    // Build messages
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    // For Gemini format, the endpoint is dynamic per model
    const apiEndpoint = format === "gemini"
      ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
      : getEndpoint(format);

    const reply = await callAI({
      providerKey: providerKey,
      model: model,
      messages: messages,
      systemPrompt: systemPrompt,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Format response
    const modelLabel = modelInfo?.label || model;
    const replyText = reply.length > 3800 ? reply.slice(0, 3800) + "\n\n_... respon dipotong_" : reply;

    const text =
      alyaHeader("Tio AI", "🤖") +
      "\n\n" +
      bracketBox("🤖", "ʀᴇꜱᴘᴏɴ", [
        `◦ Model: *${modelLabel}*`,
        `◦ Format: *${format.toUpperCase()}*`,
        `◦ Pertanyaan: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "",
        replyText,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}ai-tio <pertanyaan> untuk tanya lagi`) +
      "\n" +
      tipText(`Ganti model: ${prefix}ai-tio model <nama>`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      alyaHeader("Tio AI Error", "❌") +
      "\n\n" +
      bracketBox("❌", "ᴇʀʀᴏʀ", [
        `◦ Status: *Gagal*`,
        `◦ Error: *${error.message || "Unknown error"}*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Coba lagi atau cek API key dengan ${prefix}ai-set list`);
    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
