// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { DEFAULT_PROVIDERS, resolveProvider } from "../../src/lib/nova-ai-service.js";


const pluginConfig = {
  name: "ai-set",
  alias: ["setaiv2", "aisetv2", "configai"],
  category: "ai",
  description: "Set pengaturan AI lewat chat (apiKey, endpoint, model, provider)",
  usage: ".ai-set <aksi> <nilai>",
  example: ".ai-set apiKey sk-xxx\n.ai-set provider gemini\n.ai-set model gpt-4o-mini\n.ai-set on",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getAIHelpConfig(botConfig) {
  return (botConfig && botConfig.aiHelp) ? botConfig.aiHelp : {};
}

function buildProviderList(prefix) {
  const lines = Object.entries(DEFAULT_PROVIDERS).map(([key, provider]) => {
    const models = (provider.models || []).slice(0, 3).join(", ");
    return `${provider.name} (${key})\n  Model: ${models}\n  Default: ${provider.defaultModel}`;
  });

  return [
    `  ┊  ➶ Berikut daftar provider bawaan:`,
    "",
    ...lines,
    "",
    `  ┊  ➶ Kamu juga bisa tambah provider custom dengan *${prefix}ai-addprovider*`,
    `  ┊  ➶ Untuk pakai: *${prefix}multi-ai <provider> <pesan>*`,
  ];
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const action = (parts[1] || "").toLowerCase();
    const value = parts.slice(2).join(" ").trim();

    const aiHelpConfig = getAIHelpConfig(botConfig);
    const enabled = aiHelpConfig.enabled !== false;
    const currentProvider = String(aiHelpConfig.provider || "openai");
    const currentModel = String(aiHelpConfig.model || "gpt-4o-mini");
    const currentEndpoint = String(aiHelpConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");

    if (!action || action === "list" || action === "daftar" || action === "status") {
      const maskedKey = aiHelpConfig.apiKey ? `${String(aiHelpConfig.apiKey).slice(0, 6)}...${String(aiHelpConfig.apiKey).slice(-4)}` : "Belum diisi";
      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Status AI: *${enabled ? "ON" : "OFF"}*`,
          `  ┊  ➶ Provider: *${currentProvider}*`,
          `  ┊  ➶ Model: *${currentModel}*`,
          `  ┊  ➶ Endpoint: *${currentEndpoint}*`,
          `  ┊  ➶ API Key: *${maskedKey}*`,
          `  ┊  ➶ OpenAI Key: *${aiHelpConfig.openaiApiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `  ┊  ➶ Gemini Key: *${aiHelpConfig.geminiApiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `  ┊  ➶ Anthropic Key: *${aiHelpConfig.anthropicApiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `  ┊  ➶ System Prompt: *${String(aiHelpConfig.systemPrompt || "").slice(0, 80)}...*`].join("\n")) +
        claraWrap("Provider", buildProviderList(prefix)) +
        claraWrap("Perintah", [`  ┊  ➶ *${prefix}ai-set list* — lihat pengaturan AI`, `  ┊  ➶ *${prefix}ai-set provider <nama>* — ganti provider`, `  ┊  ➶ *${prefix}ai-set model <model>* — ganti model`, `  ┊  ➶ *${prefix}ai-set apiKey <key>* — set API key (fallback)`, `  ┊  ➶ *${prefix}ai-set apiKey openai <key>* — set OpenAI key`, `  ┊  ➶ *${prefix}ai-set apiKey gemini <key>* — set Gemini key`, `  ┊  ➶ *${prefix}ai-set apiKey anthropic <key>* — set Anthropic key`, `  ┊  ➶ *${prefix}ai-set endpoint <url>* — set endpoint`, `  ┊  ➶ *${prefix}ai-set prompt <teks>* — set system prompt`, `  ┊  ➶ *${prefix}ai-set on/off* — nyalakan/matikan AI`, `  ┊  ➶ *${prefix}ai-set mode offline/online* — ganti mode`, `  ┊  ➶ *${prefix}ai-addprovider* — tambah provider custom`].join("\n")) +
        
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "provider") {
      const providerArg = String(value || "").toLowerCase();
      const provider = resolveProvider(providerArg, {});
      const customProvider = providerArg && !provider ? null : null;

      if (!provider) {
        const text =
          claraWrap("Provider Tidak Valid", [`  ┊  ➶ Provider *${value || ""}* tidak dikenali.`,
            `  ┊  ➶ Ketik *${prefix}ai-set list* untuk lihat provider bawaan.`,
            `  ┊  ➶ Atau tambah provider custom dengan *${prefix}ai-addprovider*.`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.provider = providerArg;
      botConfig.aiHelp.model = provider.defaultModel;

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Provider: *${providerArg}*`,
          `  ┊  ➶ Model: *${provider.defaultModel}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "model") {
      const modelArg = String(value || "").trim();
      if (!modelArg) {
        const text =
          claraWrap("Model Kosong", [`  ┊  ➶ Model tidak boleh kosong.`,
            `  ┊  ➶ Contoh: *${prefix}ai-set model gpt-4o-mini*`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.model = modelArg;

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Model: *${modelArg}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "apikey") {
      // Support: .ai-set apiKey <key>  OR  .ai-set apiKey openai <key>
      const valueParts = String(value || "").trim().split(/[ \t]+/);
      let fmtKey = null;
      let apiKey = value;

      if (valueParts.length >= 2 && ["openai", "gemini", "anthropic"].includes(valueParts[0].toLowerCase())) {
        fmtKey = valueParts[0].toLowerCase();
        apiKey = valueParts.slice(1).join(" ").trim();
      }

      if (!apiKey) {
        const text =
          claraWrap("API Key Kosong", [`  ┊  ➶ API key tidak boleh kosong.`,
            `  ┊  ➶ Contoh: *${prefix}ai-set apiKey sk-xxx*`,
            `  ┊  ➶ Per format: *${prefix}ai-set apiKey openai sk-xxx*`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      if (fmtKey) {
        botConfig.aiHelp[fmtKey + "ApiKey"] = apiKey;
      } else {
        botConfig.aiHelp.apiKey = apiKey;
      }

      const keyLabel = fmtKey ? fmtKey.charAt(0).toUpperCase() + fmtKey.slice(1) + " API Key" : "API Key";
      const text =
        claraWrap("AI Settings", [`  ┊  ➶ ${keyLabel}: *ᴅɪꜱᴇᴍʙᴜɴʏɪᴋᴀɴ*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "endpoint") {
      const endpoint = String(value || "").trim();
      if (!endpoint) {
        const text =
          claraWrap("Endpoint Kosong", [`  ┊  ➶ Endpoint tidak boleh kosong.`,
            `  ┊  ➶ Contoh: *${prefix}ai-set endpoint https://api.openai.com/v1/chat/completions*`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.apiEndpoint = endpoint;

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Endpoint: *${endpoint}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "prompt") {
      const prompt = String(value || "").trim();
      if (!prompt) {
        const text =
          claraWrap("Prompt Kosong", [`  ┊  ➶ System prompt tidak boleh kosong.`,
            `  ┊  ➶ Contoh: *${prefix}ai-set prompt Kamu adalah asisten yang membantu.*`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.systemPrompt = prompt;

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ System Prompt: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "on" || action === "off") {
      if (!m.isOwner) {
        const text =
          claraWrap("Ditolak", ["  ┊  ➶ Status: *ᴅɪᴛᴏʟᴀᴋ*",
            "  ┊  ➶ Alasan: *Hanya owner yang bisa menyalakan/mematikan AI.*"].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.enabled = action === "on";

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Status: *${action === "on" ? "ON" : "OFF"}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "mode") {
      if (!m.isOwner) {
        const text =
          claraWrap("Ditolak", ["  ┊  ➶ Status: *ᴅɪᴛᴏʟᴀᴋ*",
            "  ┊  ➶ Alasan: *ʜᴀɴʏᴀ ᴏᴡɴᴇʀ ʏᴀɴɢ ʙɪꜱᴀ ᴍᴇɴɢɢᴀɴᴛɪ ᴍᴏᴅᴇ ᴀɪ.*"].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      const newMode = String(value || "").toLowerCase();
      if (!["offline", "online"].includes(newMode)) {
        const text =
          claraWrap("Mode Tidak Valid", ["  ┊  ➶ Mode yang tersedia: *ᴏꜰꜰʟɪɴᴇ* atau *ᴏɴʟɪɴᴇ*.",
            `  ┊  ➶ Contoh: *${prefix}ai-set mode online*`].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.mode = newMode;

      const text =
        claraWrap("AI Settings", [`  ┊  ➶ Mode: *${newMode.toUpperCase()}*`,
          "  ┊  ➶ Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    const text =
      claraWrap("Tidak Dikenal", [`  ┊  ➶ Aksi *${action}* tidak dikenali.`,
        `  ┊  ➶ Ketik *${prefix}ai-set list* untuk lihat opsi.`].join("\n")) +
      "\n" ;

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" ;

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
