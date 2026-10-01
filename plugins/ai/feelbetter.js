// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { FeelBetter } from "../../src/scraper/feeb.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraGuideV2, raraSalahV2 } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "feelbetter",
  alias: ["feelbetter"],
  category: "ai",
  description: "Chat dengan FeelBetterBot — AI yang siap mendengarkan tanpa menghakimi",
  usage: ".feelbetter <curhat/pertanyaan>",
  example: ".feelbetter lagi sedih nih",
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
    return m.reply(raraGuideV2("feelbetter", {
 kaomoji: "(ᵔ◡ᵔ)",
 sapaan: "curhat apa aja ke aku, aku dengerin tanpa nghakimi! (⌒‿⌒)",
      cara: "ketik curhatan atau pertanyaannya sesudah command",
      contoh: `${m.prefix}feelbetter lagi sedih nih`,
      note: "aku bukan pengganti profesional, tapi bisa jadi tempat curhat yang aman",
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await FeelBetter(text);

    if (!result.status) {
      return m.reply(raraWrap("FeelBetter Gagal", `${result.error || "Gagal dapet respons nih"}`));
    }
    const reply = `${result.answer}`;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(raraWrap("feelbetter", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
