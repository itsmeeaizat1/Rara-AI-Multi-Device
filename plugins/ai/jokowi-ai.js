// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jokowi-ai",
  alias: ["jokowi-ai", "jokowi"],
  category: "ai",
  description: "Chat dengan Pak Jokowi — Pria Solo",
  usage: ".jokowi-ai <pertanyaan>",
  example: ".jokowi-ai Pak, gimana kabar?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(claraWrap("jokowi-ai", [
      "Pria Solo — Mantan Presiden RI",
      "Sederhana, bijak, dan suka blusukan",
      "",
      "📌 Format:",
      `${m.prefix}jokowi-ai <pertanyaan>`,
      "",
      "💡 Contoh:",
      `${m.prefix}jokowi-ai Pak, gimana kabar?`,
    ]));
  }
  try {
  await m.react("🕒");
    const result = await UnlimitedAI(text, "jokowi-ai");

    if (!result.status) {
      { return await m.reply(claraWrap("jokowi-ai", `${result.error || "Gagal dapet respons nih"}`, "error")); };
    }
    const reply = result.answer;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("jokowi-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
