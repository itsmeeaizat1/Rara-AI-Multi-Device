// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gpt4v2 — GPT-4 v2 (multi fallback: blackbox + unlimitedai)
import { blackboxAI } from "../../src/scraper/blackbox-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gpt4v2",
  alias: ["gpt4v2", "gpt42", "gpt4new"],
  category: "ai",
  description: "GPT-4 v2 — multi fallback engine (blackbox + unlimited)",
  usage: ".gpt4v2 <pertanyaan>",
  example: ".gpt4v2 buatkan ringkasan tentang perang dunia 2\n.gpt4v2 jelaskan cara kerja neural network",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("gpt4v2", `Mau nanya apa ke GPT-4 v2?\n\nContoh: ${m.prefix}gpt4v2 jelaskan neural network\n${m.prefix}gpt4v2 buat ringkasan perang dunia 2`, "guide"));
    }

    await m.react("🕒");

    let result = await blackboxAI(text, {
      systemPrompt: "You are GPT-4, an AI assistant made by OpenAI. Answer in Indonesian if the user asks in Indonesian. Be concise and accurate.",
    });

    if (!result.status) {
      result = await UnlimitedAI(text, "nova-ai", {
        systemPrompt: "Jawab dengan gaya GPT-4 — concise, accurate, well-structured. Bahasa Indonesia.",
      });
    }

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("gpt4v2", "GPT-4 v2 lagi offline 🤖", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("gpt4v2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("gpt4v2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
