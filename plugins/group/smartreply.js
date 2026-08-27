// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

/**
 * plugins/group/smartreply.js
 * Command .smartreply — Smart Auto Reply dengan AI
 *
 * Beda dari autoreply biasa: pake AI generate jawaban dinamis,
 * bukan hardcoded reply. Set keyword/topic, AI autojawab contextually.
 *
 * Setup:
 * .smartreply on — aktifkan di grup
 * .smartreply add <keyword>|<context> — tambah topic AI
 * .smartreply del <keyword> — hapus topic
 * .smartreply list — lihat semua topic
 * .smartreply off — matikan
 * .smartreply model puter|tio — pilih AI provider
 *
 * Contoh:
 * .smartreply add jam buka|Toko buka jam 8 pagi sampai 9 malam, tutup hari Minggu
 * .smartreply add harga|Menu mulai 15rb, paket komplit 50rb
 *
 * Saat orang nanya "jam buka berapa?" di grup, AI auto-jawab berdasarkan context.
 */

const pluginConfig = {
  name: "smartreply",
  alias: ["smartreply"],
  category: "group",
  description: "Smart Auto Reply dengan AI untuk FAQ grup",
  usage: ".smartreply on/off/add/del/list/model/reset",
  example: ".smartreply add jam buka|Toko buka jam 8-21, tutup Minggu",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  isAdmin: true,
};

const COOLDOWN_MS = 5000; // 5 detik antar AI reply per grup
const lastReplyTime = new Map(); // chat -> timestamp

async function callTioAI(systemPrompt, userMessage, aiConfig) {
  const apiKey = String(aiConfig.openaiApiKey || aiConfig.apiKey || "");
  const endpoint = "https://ai.tioo.eu.org/v1/chat/completions";
  const model = String(aiConfig.openaiModel || aiConfig.model || "deepseek-v4-flash:free");

  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Tio error ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callPuterAI(systemPrompt, userMessage) {
  const response = await fetch(
    "https://api.puter.com/puterai/openai/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) throw new Error(`Puter error ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function generateAIReply(userMessage, topics, provider, aiConfig) {
  // Build context dari semua topics
  const contextLines = topics.map((t) => `- ${t.keyword}: ${t.context}`).join("\n");
  const matchedKeywords = topics
    .filter((t) => userMessage.toLowerCase().includes(t.keyword.toLowerCase()))
    .map((t) => `${t.keyword}: ${t.context}`);

  const systemPrompt = `Kamu adalah asisten otomatis untuk grup WhatsApp. Jawab pertanyaan user berdasarkan konteks yang diberikan. Jawab singkat (maksimal 3 kalimat), ramah, dan to the point. Jika pertanyaan tidak relevan dengan konteks, jawab "Maaf, saya belum punya info tentang itu." Jangan mengaku sebagai AI/bot.

Konteks FAQ:
${contextLines}

${matchedKeywords.length > 0 ? `Pertanyaan ini berkaitan dengan: ${matchedKeywords.join(", ")}` : ""}`;

  if (provider === "tio") {
    try {
      return await callTioAI(systemPrompt, userMessage, aiConfig);
    } catch (err) {
      if (err.message === "NO_API_KEY") {
        return await callPuterAI(systemPrompt, userMessage);
      }
      // Fallback ke Puter
      return await callPuterAI(systemPrompt, userMessage);
    }
  } else {
    return await callPuterAI(systemPrompt, userMessage);
  }
}

function checkKeywordMatch(message, topics) {
  if (!topics || topics.length === 0) return false;
  const lower = message.toLowerCase();
  // Check if message contains any keyword (bukan command)
  if (lower.startsWith(".") || lower.startsWith("!") || lower.startsWith("/") || lower.startsWith("#")) {
    return false;
  }
  return topics.some((t) => lower.includes(t.keyword.toLowerCase()));
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    if (!action) {
      const text =
        claraWrap("Smart Reply", [`│ Fitur AI auto-jawab FAQ grup`,
          `│ Set keyword + context, AI jawab otomatis`,
          `│ Beda dari autoreply: AI generate jawaban dinamis`,
          ``,
          `*ᴘᴇʀɪɴᴛᴀʜ:*`,
          `│ ${prefix}smartreply on — Aktifkan`,
          `│ ${prefix}smartreply off — Matikan`,
          `│ ${prefix}smartreply add <keyword>|<context>`,
          `│ ${prefix}smartreply del <keyword>`,
          `│ ${prefix}smartreply list — Lihat topics`,
          `│ ${prefix}smartreply model puter|tio`,
          `│ ${prefix}smartreply reset — Hapus semua`,
          ``,
          `*ᴄᴏɴᴛᴏʜ:*`,
          `│ ${prefix}smartreply add jam buka|Toko buka 8-21, tutup Minggu`,
          `│ ${prefix}smartreply add harga|Menu 15rb, paket 50rb`].join("\n")) + "\n" +
        tipText("Hanya admin grup yang bisa mengatur");

      await m.reply( text, "smartreply");
      return { handled: true };
    }

    const groupData = db.getGroup(m.chat) || {};
    const smartReply = groupData.smartReply || { enabled: false, topics: [], provider: "puter" };

    if (action === "on") {
      smartReply.enabled = true;
      db.setGroup(m.chat, { ...groupData, smartReply });
      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Status: *ᴀᴋᴛɪꜰ*`,
          `│ Provider: *${smartReply.provider.toUpperCase()}*`,
          `│ Topics: *${smartReply.topics.length}*`,
          `│ Bot akan auto-jawab pertanyaan yang match keyword`].join("\n")) + "\n" +
        tipText(`Tambah topic: ${prefix}smartreply add <keyword>|<context>`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "off") {
      smartReply.enabled = false;
      db.setGroup(m.chat, { ...groupData, smartReply });
      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Status: *ɴᴏɴᴀᴋᴛɪꜰ*`,
          `│ Topics tersimpan, bisa diaktifkan lagi`].join("\n")) + "\n" +
        tipText(`Aktifkan: ${prefix}smartreply on`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "add") {
      const fullBody = (m.body || "").replace(/^[!.#]\S+\s+\S+\s*/, "").trim();
      const pipeIdx = fullBody.indexOf("|");

      if (pipeIdx === -1) {
        const text =
          claraWrap("Smart Reply", [`│ Format: *keyword|context*`,
            `│ Contoh: jam buka|Toko buka 8-21 tutup Minggu`].join("\n")) + "\n" +
          tipText("Pisahkan keyword dan context dengan |");

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      const keyword = fullBody.substring(0, pipeIdx).trim();
      const context = fullBody.substring(pipeIdx + 1).trim();

      if (!keyword || !context) {
        const text =
          claraWrap("Smart Reply", [`│ Keyword dan context tidak boleh kosong`].join("\n")) + "\n" +
          tipText("Contoh: jam buka|Toko buka 8-21, tutup Minggu");

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      // Cek duplikat
      const existing = smartReply.topics.findIndex(
        (t) => t.keyword.toLowerCase() === keyword.toLowerCase()
      );

      if (existing !== -1) {
        smartReply.topics[existing] = { keyword, context };
      } else {
        smartReply.topics.push({ keyword, context });
      }

      db.setGroup(m.chat, { ...groupData, smartReply });

      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Keyword: *${keyword}*`,
          `│ Context: *${context.slice(0, 80)}${context.length > 80 ? "..." : ""}*`,
          `│ Total topics: *${smartReply.topics.length}*`,
          `${smartReply.enabled ? "" : `│ Catatan: Smart Reply belum aktif, ketik ${prefix}smartreply on`}`].join("\n")) + "\n" +
        tipText(`Saat orang nanya "${keyword}", AI akan auto-jawab`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "del") {
      const keyword = args.slice(1).join(" ").trim().toLowerCase();

      if (!keyword) {
        const text =
          claraWrap("Smart Reply", [`│ Format: ${prefix}smartreply del <keyword>`].join("\n")) + "\n" +
          tipText("Masukkan keyword yang mau dihapus");

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      const idx = smartReply.topics.findIndex(
        (t) => t.keyword.toLowerCase() === keyword
      );

      if (idx === -1) {
        const text =
          claraWrap("Smart Reply", [`│ Keyword: *${keyword}* tidak ada`].join("\n")) + "\n" +
          tipText(`Lihat daftar: ${prefix}smartreply list`);

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      smartReply.topics.splice(idx, 1);
      db.setGroup(m.chat, { ...groupData, smartReply });

      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Keyword: *${keyword}*`,
          `│ Sisa topics: *${smartReply.topics.length}*`].join("\n")) + "\n" +
        tipText(`Lihat daftar: ${prefix}smartreply list`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "list") {
      if (!smartReply.topics || smartReply.topics.length === 0) {
        const text =
          claraWrap("Smart Reply", [`│ Belum ada topic di grup ini`,
            `│ Tambah: ${prefix}smartreply add <keyword>|<context>`].join("\n")) + "\n" +
          tipText("Status: " + (smartReply.enabled ? "Aktif" : "Nonaktif"));

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      const topicLines = smartReply.topics.map(
        (t, i) => `${i + 1}. *${t.keyword}* — ${t.context.slice(0, 60)}${t.context.length > 60 ? "..." : ""}`
      );

      const text =
        claraWrap("Smart Reply", [`│ Status: *${smartReply.enabled ? "Aktif" : "Nonaktif"}*`,
          `│ Provider: *${smartReply.provider.toUpperCase()}*`,
          `│ Total: *${smartReply.topics.length}* topics`,
          ``,
          ...topicLines].join("\n")) + "\n" +
        tipText(`Hapus: ${prefix}smartreply del <keyword>`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "model") {
      const model = args[1]?.toLowerCase();

      if (!model || !["puter", "tio"].includes(model)) {
        const text =
          claraWrap("Smart Reply", [`│ ${prefix}smartreply model puter — Gratis, no key`,
            `│ ${prefix}smartreply model tio — Tio AI (butuh key)`,
            `│ Current: *${smartReply.provider.toUpperCase()}*`].join("\n")) + "\n" +
          tipText("Puter = gratis unlimited, Tio = butuh API key");

        await m.reply(claraWrap("smartreply", text));
        return { handled: true };
      }

      smartReply.provider = model;
      db.setGroup(m.chat, { ...groupData, smartReply });

      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Provider: *${model.toUpperCase()}*`,
          `${model === "tio" ? "│ Pastikan API key Tio AI sudah di-set di config" : "│ Free, no API key needed"}`].join("\n")) + "\n" +
        tipText("AI akan menggunakan provider ini untuk auto-reply");

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    if (action === "reset") {
      smartReply.topics = [];
      db.setGroup(m.chat, { ...groupData, smartReply });

      await m.react("🐣");
      const text =
        claraWrap("Smart Reply", [`│ Semua topic dihapus`,
          `│ Smart Reply: *${smartReply.enabled ? "Aktif" : "Nonaktif"}*`].join("\n")) + "\n" +
        tipText(`Tambah baru: ${prefix}smartreply add <keyword>|<context>`);

      await m.reply(claraWrap("smartreply", text));
      return { handled: true };
    }

    return { handled: true };
  } catch (error) {
    console.error("[SmartReply Error]", error);
    const text =
      claraWrap("Gagal", [`│ Alasan: *${error.message || "Unknown error"}*`].join("\n")) + "\n" +
      tipText("Coba lagi nanti");

    await m.reply(claraWrap("smartreply", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler, checkKeywordMatch, generateAIReply, COOLDOWN_MS, lastReplyTime };
