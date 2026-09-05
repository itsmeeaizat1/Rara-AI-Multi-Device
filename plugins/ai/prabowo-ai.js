// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "prabowo-ai",
  alias: ["prabowo-ai", "prabowo"],
  category: "ai",
  description: "Chat dengan Pak Prabowo — Pria Sawit",
  usage: ".prabowo-ai <pertanyaan>",
  example: ".prabowo-ai Saudara, kita harus berdaulat!",
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
    return m.reply(claraWrap("prabowo-ai", [
      "Pria Sawit — Presiden RI",
      "Tegas, patriotik, dan karismatik",
      "",
      "📌 Format:",
      `${m.prefix}prabowo-ai <pertanyaan>`,
      "",
      "💡 Contoh:",
      `${m.prefix}prabowo-ai Saudara, kita harus berdaulat!`,
    ]));
  }
  try {
  await m.react("🕒");
    const result = await UnlimitedAI(text, "prabowo-ai");

    if (!result.status) {
      { return await m.reply(claraWrap("prabowo-ai", `${result.error || "Gagal dapet respons nih"}`, "error")); };
    }
    const reply = result.answer;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(novaError("PrabowoAI", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
