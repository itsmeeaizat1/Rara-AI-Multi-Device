// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// multi-ai.js — OpenRouter-style: pilih provider + model lewat chat
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI, DEFAULT_PROVIDERS, getAllProviders, resolveApiKeyForProvider } from "../../src/lib/nova-ai-service.js";


function resolveModel(providerKey, modelArg) {
  const providers = getAllProviders();
  const provider = providers[providerKey];
  if (!provider) return null;
  const models = Array.isArray(provider.models) ? provider.models : [];
  const model = modelArg && models.includes(modelArg) ? modelArg : (provider.defaultModel || provider.model || modelArg);
  return { provider, model };
}

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => String(s || "").replace(/[a-z]/g, c => SC_MAP[c] || c);

const pluginConfig = {
  name: "multi-ai",
  alias: ["multi-ai", "multi"],
  category: "ai",
  description: "Chat dengan berbagai AI — pilih provider & model kayak OpenRouter",
  usage: ".multi-ai <provider> [model] <pesan>",
  example: ".multi-ai gemini apa itu AI\n.multi-ai openai gpt-4o-mini jelaskan kuantum\n.multi-ai list",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const providerArg = (parts[1] || "").toLowerCase();
    const modelArg = (parts[2] || "").trim();
    const message = parts.slice(2).join(" ").trim();

    // LIST — tampilkan semua provider + model
    if (!providerArg || providerArg === "list" || providerArg === "daftar") {
      const providers = getAllProviders();
      let lines = "";
      for (const [key, provider] of Object.entries(providers)) {
        const models = Array.isArray(provider.models) ? provider.models : [provider.model || "-"];
        const modelList = models.map(mo => `${mo}`).join("\n");
        lines += `${provider.name || key} (${key})\n${modelList}\n`;
      }

      const text = novaGuide(
        "multi-ai",
        `Router AI — pilih provider & model\n${prefix}multi-ai <provider> <pesan>\n${prefix}multi-ai <provider> <model> <pesan>`,
        `${prefix}multi-ai gemini apa itu AI\n${prefix}multi-ai openai gpt-4o-mini jelaskan kuantum\n${prefix}multi-ai groq buat puisi`,
        "Providers:\n" + lines
      );

      await m.reply(text);
      return { handled: true };
    }

    // Cek apakah parts[2] adalah model atau pesan
    const providers = getAllProviders();
    const provider = providers[providerArg];
    if (!provider) {
      const text = `❌ Provider *${providerArg}* tidak ditemukan. Ketik *${prefix}multi-ai list* untuk lihat daftar`;
      await m.reply(text);
      return { handled: true };
    }

    // Tentukan apakah argumen kedua adalah model
    const providerModels = Array.isArray(provider.models) ? provider.models : [];
    let model = provider.defaultModel || provider.model || "";
    let userMessage = "";

    if (providerModels.includes(modelArg)) {
      model = modelArg;
      userMessage = parts.slice(3).join(" ").trim();
    } else {
      userMessage = parts.slice(2).join(" ").trim();
    }

    if (!userMessage) {
      const text = novaGuide(
        `multi-ai ${providerArg}`,
        `Provider: ${provider.name || providerArg}\nModel: ${model}\n${prefix}multi-ai ${providerArg} [model] <pesan>`,
        `${prefix}multi-ai ${providerArg} ${model} apa itu AI`
      );
      await m.reply(text);
      return { handled: true };
    }

    // Panggil AI
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = resolveApiKeyForProvider(providerArg, aiConfig);
    const apiEndpoint = String(
      typeof provider.chatEndpoint === "function"
        ? provider.chatEndpoint(model || providerArg)
        : provider.chatEndpoint || aiConfig.apiEndpoint || ""
    );
    const systemPrompt = String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu.");

    // 🔹 SESSION: riwayat obrolan user ini (persist) + quoted context
    const quotedText = m.quoted?.text?.trim() || "";
    const messageWithContext = quotedText
      ? `${userMessage}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
      : userMessage;
    const reply = await callAI({
      providerKey: providerArg,
      model,
      messages: [{ role: "user", content: messageWithContext }],
      systemPrompt,
      apiKey,
      apiEndpoint,
      sessionKey: "provider:" + m.sender,
    });

    if (!reply || reply.trim() === "") {
      const text = `❌ AI tidak memberikan respons. Cek API key di *${prefix}ai-set apiKey <key>*`;
      await m.reply(text);
      return { handled: true };
    }

    const trimmedMsg = userMessage.length > 200 ? userMessage.slice(0, 200) + "..." : userMessage;
    const trimmedReply = reply.length > 3000 ? reply.slice(0, 3000) + "..." : reply;

    const text = `Provider: ${provider.name || providerArg}
Model: ${model}
Kamu: ${trimmedMsg}

Respons:
${trimmedReply}`;

    await m.reply(text);
  } catch (error) {
    console.error('[multi-ai.js]:', error.message);
    const prefix = botConfig.command?.prefix || ".";
    const text = `❌ Gagal: ${error.message}\nCek API key: isi di apikeys.json atau *${prefix}ai-set apiKey <key>*`;
    await m.react("🐣");
    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
