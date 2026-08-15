import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aiidea",
  alias: ["aiidea", "ide", "brainstorm", "ideai", "brainstormai"],
  category: "ai",
  description: "Dapatkan ide/ brainstorming dengan AI",
  usage: ".aiidea <topik>",
  example: ".aiidea ide konten TikTok untuk kuliner",
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
    const topic = raw.replace(/^\.aiidea\s+/i, "").trim();

    if (!topic) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}aiidea <topik>*`,
          `◦ Contoh: *${prefix}aiidea ide bisnis Modal kecil*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "aiidea");
      return { handled: true };
    }

    m.react("🕐");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah konsultan kreatif. Berikan 5-7 ide actionable yang spesifik, singkat, dan mudah dijalankan." },
        { role: "user", content: `Berikan ide untuk: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Idea", [`◦ Topik: *${topic}*`,
        `◦ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiidea <topik> untuk ide lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "aiidea");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
