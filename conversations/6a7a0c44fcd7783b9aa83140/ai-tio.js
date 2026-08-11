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
  description: "Tanya AI via Tio AIO - 3 format: .tio openai/gemini/anthropic <pesan>",
  usage: ".tio <format> <pertanyaan>",
  example: ".tio openai halo\n.tio gemini hai\n.tio anthropic hai",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// FORMAT CONFIG - each format has its own models & endpoint
// ═══════════════════════════════════════════════

const TIO_FORMATS = {
  openai: {
    label: "OpenAI",
    emoji: "🟢",
    providerKey: "tio_openai",
    endpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o", label: "GPT-4o", desc: "Flagship" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Cepat & murah" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Turbo" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", desc: "Hemat" },
      { id: "deepseek-chat", label: "DeepSeek Chat", desc: "Reasoning" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner", desc: "Deep reasoning" },
    ],
  },
  gemini: {
    label: "Gemini",
    emoji: "🔵",
    providerKey: "tio_gemini",
    endpoint: null, // dynamic per model
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Cepat" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Hemat" },
    ],
  },
  anthropic: {
    label: "Anthropic",
    emoji: "🟣",
    providerKey: "tio_anthropic",
    endpoint: "https://ai.tioo.eu.org/v1/messages",
    defaultModel: "claude-sonnet-4-20250514",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Paling pinter" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Cepat & hemat" },
      { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", desc: "Legacy" },
    ],
  },
};

// Short alias map
const FORMAT_ALIASES = {
  o: "openai", open: "openai", oai: "openai", gpt: "openai",
  g: "gemini", gem: "gemini", google: "gemini",
  a: "anthropic", ant: "anthropic", claude: "anthropic", antro: "anthropic",
};

function resolveFormat(arg) {
  const lower = String(arg || "").toLowerCase().trim();
  if (TIO_FORMATS[lower]) return lower;
  if (FORMAT_ALIASES[lower]) return FORMAT_ALIASES[lower];
  return null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    // Strip command prefix (.tio / .aio / .ai-tio / .asktio)
    const body = raw.replace(/^\.ai-tio\s+/i, "").replace(/^\.tio\s+/i, "").replace(/^\.aio\s+/i, "").replace(/^\.asktio\s+/i, "").trim();

    const aiHelp = botConfig.aiHelp || {};
    const apiKey = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    const hasKey = !!apiKey;

    // ═══ No args → show menu ═══
    if (!body) {
      const text =
        alyaHeader("Tio AI (AIO)", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ Multi-model AI via *ai.tioo.eu.org*`,
          `◦ 3 Format: OpenAI / Gemini / Anthropic`,
          `◦ API Key: *${hasKey ? "Terpasang ✅" : "Belum diisi ❌"}*`,
        ]) +
        "\n\n" +
        bracketBox("🟢", "ᴏᴘᴇɴᴀɪ", [
          `  *${prefix}tio openai <pesan>*`,
          `  Endpoint: /v1/chat/completions`,
          `  Model: gpt-4o, gpt-4o-mini, deepseek, dll`,
        ]) +
        "\n\n" +
        bracketBox("🔵", "ɢᴇᴍɪɴɪ", [
          `  *${prefix}tio gemini <pesan>*`,
          `  Endpoint: /v1beta/models/{model}:generateContent`,
          `  Model: gemini-2.0-flash, gemini-1.5-pro, dll`,
        ]) +
        "\n\n" +
        bracketBox("🟣", "ᴀɴᴛʜʀᴏᴘɪᴄ", [
          `  *${prefix}tio anthropic <pesan>*`,
          `  Endpoint: /v1/messages`,
          `  Model: claude-sonnet-4, claude-3.5-haiku, dll`,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ ʟᴀɪɴ", [
          `◦ *${prefix}tio model <format> <nama>* — ganti model`,
          `◦ *${prefix}tio list* — lihat semua model`,
          `◦ *${prefix}ai-set apiKey <key>* — set API key`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Contoh: ${prefix}tio openai jelaskan tentang AI`);

      await m.reply(text);
      return { handled: true };
    }

    const parts = body.split(/[ \t]+/).filter(Boolean);
    const firstWord = (parts[0] || "").toLowerCase();

    // ═══ "list" subcommand ═══
    if (firstWord === "list") {
      let text = alyaHeader("Tio AI Models", "🤖") + "\n\n";
      for (const [fmtKey, fmt] of Object.entries(TIO_FORMATS)) {
        const currentModel = (aiHelp[fmtKey + "Model"] || fmt.defaultModel);
        const modelLines = fmt.models.map((mdl) =>
          `  ${mdl.id === currentModel ? "✅" : "  "} *${mdl.label}* (${mdl.id}) — ${mdl.desc}`
        ).join("\n");
        text += bracketBox(fmt.emoji, fmt.label.toUpperCase(), [modelLines]) + "\n\n";
      }
      text += separator("━", 22) +
        "\n" + tipText(`Ganti: ${prefix}tio model <format> <nama-model>`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ "model" subcommand ═══
    if (firstWord === "model") {
      const fmtArg = (parts[1] || "").toLowerCase();
      const modelArg = parts.slice(2).join(" ").trim();

      if (!fmtArg || !modelArg) {
        const text =
          alyaHeader("Ganti Model", "⚙️") +
          "\n\n" +
          bracketBox("📋", "ᴄᴀʀᴀ", [
            `◦ *${prefix}tio model openai gpt-4o*`,
            `◦ *${prefix}tio model gemini gemini-1.5-pro*`,
            `◦ *${prefix}tio model anthropic claude-3-5-haiku-20241022*`,
            `◦ *${prefix}tio list* — lihat semua model`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      const fmtKey = resolveFormat(fmtArg);
      if (!fmtKey) {
        const text =
          alyaHeader("Format Tidak Valid", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Format *${fmtArg}* tidak dikenal`,
            `◦ Pilih: openai / gemini / anthropic`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      const fmt = TIO_FORMATS[fmtKey];
      const found = fmt.models.find(
        (mdl) => mdl.id === modelArg || mdl.label.toLowerCase() === modelArg.toLowerCase()
      );

      if (!found) {
        const modelList = fmt.models.map((mdl) => `  ${mdl.id} — ${mdl.desc}`).join("\n");
        const text =
          alyaHeader("Model Tidak Ditemukan", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Model *${modelArg}* tidak ada di format *${fmt.label}*`,
            `◦ Model tersedia:`,
            modelList,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp[fmtKey + "Model"] = found.id;

      const text =
        alyaHeader("Model Diganti", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴘᴇʀᴜʙᴀʜᴀɴ", [
          `◦ Format: *${fmt.label}*`,
          `◦ Model: *${found.label}*`,
          `◦ ID: *${found.id}*`,
          `◦ ${found.desc}`,
        ]) +
        "\n\n" + separator("━", 22) +
        "\n" + tipText(`Tes: ${prefix}tio ${fmtKey} halo`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ Main: .tio <format> <pesan> ═══
    const fmtKey = resolveFormat(firstWord);

    if (!fmtKey) {
      // Maybe user just typed a message without format → use default (anthropic)
      // Check if it looks like a format keyword
      const text =
        alyaHeader("Format Tidak Dikenal", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ Format *${parts[0]}* tidak dikenal`,
          `◦ Pilih: *openai* / *gemini* / *anthropic*`,
          `◦ Contoh: *${prefix}tio openai halo*`,
          `◦ Atau: *${prefix}tio anthropic hai*`,
        ]) +
        "\n\n" + separator("━", 22) +
        "\n" + tipText(`Ketik ${prefix}tio untuk lihat panduan`);
      await m.reply(text);
      return { handled: true };
    }

    const fmt = TIO_FORMATS[fmtKey];
    const prompt = parts.slice(1).join(" ").trim();

    if (!prompt) {
      const text =
        alyaHeader(fmt.label + " - Kosong", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ Pesan tidak boleh kosong`,
          `◦ Contoh: *${prefix}tio ${fmtKey} halo*`,
          `◦ Model: *${aiHelp[fmtKey + "Model"] || fmt.defaultModel}*`,
        ]) +
        "\n\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Check API key
    if (!apiKey) {
      const text =
        alyaHeader("API Key Belum Diisi", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ API Key Tio AI belum di-set`,
          `◦ Set di config.js: aiHelp.apiKey`,
          `◦ Atau ketik *${prefix}ai-set apiKey <key>*`,
        ]) +
        "\n\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Get model for this format
    const model = aiHelp[fmtKey + "Model"] || fmt.defaultModel;
    const systemPrompt = aiHelp.systemPrompt || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    // Build messages
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    // Set endpoint (Gemini is dynamic per model)
    const apiEndpoint = fmtKey === "gemini"
      ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
      : fmt.endpoint;

    // Call AI
    const reply = await callAI({
      providerKey: fmt.providerKey,
      model: model,
      messages: messages,
      systemPrompt: systemPrompt,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Find model label
    const modelInfo = fmt.models.find((mdl) => mdl.id === model);
    const modelLabel = modelInfo?.label || model;
    const replyText = reply.length > 3800 ? reply.slice(0, 3800) + "\n\n_... respon dipotong_" : reply;

    const text =
      alyaHeader("Tio AI", fmt.emoji) +
      "\n\n" +
      bracketBox(fmt.emoji, "ʀᴇꜱᴘᴏɴ", [
        `◦ Format: *${fmt.label}*`,
        `◦ Model: *${modelLabel}*`,
        `◦ Pertanyaan: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "",
        replyText,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}tio ${fmtKey} <pesan> untuk tanya lagi`) +
      "\n" +
      tipText(`Ganti model: ${prefix}tio model ${fmtKey} <nama>`);

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
