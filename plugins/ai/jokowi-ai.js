// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaGuideV2, novaSalahV2 } from "../../src/lib/nova-menu-style.js";

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
    return m.reply(novaGuideV2("jokowi-ai", {
 kaomoji: "(¬‿¬)",
 sapaan: "ngobrol sama Pak Jokowi, Pria Solo yang sederhana dan bijak! (◍'◡'◍)",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}jokowi-ai Pak, gimana kabar?`,
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await UnlimitedAI(text, "jokowi-ai");

    if (!result.status) {
      { return await m.reply(novaWrap("jokowi-ai", `${result.error || "Gagal dapet respons nih"}`, "error")); };
    }
    const reply = result.answer;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(novaWrap("jokowi-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
