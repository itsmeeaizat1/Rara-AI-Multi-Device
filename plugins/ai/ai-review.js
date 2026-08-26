// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-review",
  alias: ["codereview", "reviewcode", "aireview"],
  category: "ai",
  description: "Review code dengan AI",
  usage: ".ai-review <code> | reply code",
  example: ".ai-review function add(a,b){return a+b}",
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
    const code = m.quoted?.text ? m.quoted.text : raw.replace(/^\.ai-review\s+/i, "").trim();

    if (!code) {
      const out =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}ai-review <code>*`,
          `│ ❏ Atau reply pesan berisi code dengan *${prefix}ai-review*`,
          `│ ❏ Contoh: *${prefix}ai-review function test(){}*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    const prompt = `Review code berikut dalam bahasa Indonesia:\n- Sebutkan potensi bug\n- Berikan sphinx perbaikan\n- Berikan versi yang lebih bersih jika bisa\n\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``;
    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const out =
      claraWrap("AI Review", [`│ ❏ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-review <code> untuk review lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ai-review");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
