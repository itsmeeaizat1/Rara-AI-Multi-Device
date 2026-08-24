// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// multi-ai.js — OpenRouter-style: pilih provider + model lewat chat
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI, DEFAULT_PROVIDERS } from "../../src/lib/nova-ai-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";

function getCustomProviders() {
  try {
    const db = getDatabase();
    const data = db.get("aiCustomProviders");
    if (data && typeof data === "object") return data;
  } catch (e) { console.error('[multi-ai.js]:', e.message); }
  return {};
}

function getAllProviders() {
  try {
    const custom = getCustomProviders();
    return { ...DEFAULT_PROVIDERS, ...custom };
  } catch {
    return { ...DEFAULT_PROVIDERS };
  }
}

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
  alias: ["multiai", "aimulti", "aichatv2", "aimodels", "routerai", "airouter"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    // parts[0] = .multi-ai, parts[1] = provider, parts[2] = model/pesan, parts[3+] = pesan
    const providerArg = (parts[1] || "").toLowerCase();
    const modelArg = (parts[2] || "").trim();
    const message = parts.slice(2).join(" ").trim();

    // LIST — tampilkan semua provider + model
    if (!providerArg || providerArg === "list" || providerArg === "daftar") {
      const providers = getAllProviders();
      let lines = "";
      let idx = 0;
      for (const [key, provider] of Object.entries(providers)) {
        const models = Array.isArray(provider.models) ? provider.models : [provider.model || "-"];
        const modelList = models.map(mo => `  ┊    ➶ ${mo}`).join("\n");
        const end = idx === Object.keys(providers).length - 1 ? "  ╰" : "  ┊";
        lines += `${end}  ➶ ${provider.name || key} (${key})\n${modelList}\n`;
        idx++;
      }

      const text = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Mᴜʟᴛɪ AI
┊
  ┊  ➶ *Router AI — Pilih Provider & Model*
  ┊
₊˚ʚ ᗢ₊˚✧ ﾟ. 🤖 Pʀᴏᴠɪᴅᴇʀs ｡ﾟ
┊${lines}₊˚ʚ ᗢ₊˚✧ ﾟ.
┊
  ┊  ➶ *Cara pakai:*
  ┊    ➶ ${prefix}multi-ai <provider> <pesan>
  ┊    ➶ ${prefix}multi-ai <provider> <model> <pesan>
  ┊
  ┊  ➶ *Contoh:*
  ┊    ➶ ${prefix}multi-ai gemini apa itu AI
  ┊    ➶ ${prefix}multi-ai openai gpt-4o-mini jelaskan kuantum
  ┊    ➶ ${prefix}multi-ai groq buat puisi
  ┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;

      await m.reply(text);
      await m.react("✅");
      return { handled: true };
    }

    // Cek apakah parts[2] adalah model atau pesan
    const providers = getAllProviders();
    const provider = providers[providerArg];
    if (!provider) {
      const text = `❀°˖ Aɪ Rᴏᴜᴛᴇʀ ˖°❀
┊
  ┊  ➶ Provider *${providerArg}* tidak ditemukan
  ┊  ➶ Ketik *${prefix}multi-ai list* untuk lihat daftar
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      await m.reply(text);
      await m.react("❌");
      return { handled: true };
    }

    // Tentukan apakah argumen kedua adalah model
    const providerModels = Array.isArray(provider.models) ? provider.models : [];
    let model = provider.defaultModel || provider.model || "";
    let userMessage = "";

    if (providerModels.includes(modelArg)) {
      // parts[2] = model, parts[3+] = pesan
      model = modelArg;
      userMessage = parts.slice(3).join(" ").trim();
    } else {
      // parts[2] bukan model, jadi semua dari parts[2] adalah pesan
      userMessage = parts.slice(2).join(" ").trim();
    }

    if (!userMessage) {
      const text = `❀°˖ Aɪ Rᴏᴜᴛᴇʀ ˖°❀
┊
  ┊  ➶ *Provider:* ${toSC(provider.name || providerArg)}
  ┊  ➶ *Model:* ${model}
  ┊
  ┊  ➶ Penggunaan: *${prefix}multi-ai ${providerArg} [model] <pesan>*
  ┊  ➶ Contoh: *${prefix}multi-ai ${providerArg} ${model} apa itu AI*
  ┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      await m.reply(text);
      await m.react("❌");
      return { handled: true };
    }

    // Panggil AI
    await m.react("🐣");

    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(
      typeof provider.chatEndpoint === "function"
        ? provider.chatEndpoint(model || providerArg)
        : provider.chatEndpoint || aiConfig.apiEndpoint || ""
    );
    const systemPrompt = String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu.");

    const reply = await callAI({
      providerKey: providerArg,
      model,
      messages: [{ role: "user", content: userMessage }],
      systemPrompt,
      apiKey,
      apiEndpoint,
    });

    if (!reply || reply.trim() === "") {
      const text = `❀°˖ Aɪ Rᴏᴜᴛᴇʀ ˖°❀
┊
  ┊  ➶ *Status:* Gagal
  ┊  ➶ *Alasan:* AI tidak memberikan respons
  ┊  ➶ Cek API key di *${prefix}ai-set apiKey <key>*
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      await m.reply(text);
      await m.react("❌");
      return { handled: true };
    }

    const trimmedMsg = userMessage.length > 200 ? userMessage.slice(0, 200) + "..." : userMessage;
    const trimmedReply = reply.length > 3000 ? reply.slice(0, 3000) + "..." : reply;

    const text = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Aɪ Rᴏᴜᴛᴇʀ
┊
  ┊  ➶ *Provider:* ${toSC(provider.name || providerArg)}
  ┊  ➶ *Model:* ${model}
  ┊  ➶ *Kamu:* ${trimmedMsg}
┊
₊˚ʚ ᗢ₊˚✧ ﾟ. 🤖 Rᴇsᴘᴏɴs ｡ﾟ
┊  ┊  ➶ ${trimmedReply}
┊
₊˚ʚ ᗢ₊˚✧ ﾟ.
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;

    await m.reply(text);
    await m.react("✅");
  } catch (error) {
    console.error('[multi-ai.js]:', error.message);
    const prefix = botConfig.command?.prefix || ".";
    const text = `❀°˖ Aɪ Rᴏᴜᴛᴇʀ ˖°❀
┊
  ┊  ➶ *Status:* Gagal
  ┊  ➶ *Alasan:* ${error.message}
  ┊  ➶ Cek API key: *${prefix}ai-set apiKey <key>*
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
    await m.reply(text);
    await m.react("❌");
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
