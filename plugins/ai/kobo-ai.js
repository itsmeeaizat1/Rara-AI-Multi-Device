// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaGuideV2, novaSalahV2 } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kobo-ai",
  alias: ["kobo-ai", "kobo"],
  category: "ai",
  description: "Chat dengan Kobo Kanaeru — VTuber Hololive ID",
  usage: ".kobo-ai <pertanyaan>",
  example: ".kobo-ai Kobo lagi apa?",
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
    return m.reply(novaGuideV2("kobo-ai", {
 kaomoji: "(≧ω≦)",
 sapaan: "ngobrol sama Kobo, Wind Shaman Hololive yang cheerful dan suka prank! (≧∇≦)ﾉ",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}kobo-ai Kobo lagi apa?`,
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await UnlimitedAI(text, "kobo-ai");

    if (!result.status) {
      { return await m.reply(claraWrap("kobo-ai", `${result.error || "Gagal dapet respons nih"}`, "error")); };
    }
    const reply = result.answer;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("kobo-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
