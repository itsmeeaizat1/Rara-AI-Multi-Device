// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Roast — AI roasts the user based on their name/message

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "roastai",
  alias: ["roastai", "airoast", "roastingai"],
  category: "ai",
  description: "AI roast kamu sampai terbakar — masukkan nama atau biarkan AI bikin roasting",
  usage: ".roastai [nama/target]",
  example: ".roastai Budi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    const target = text || m.pushName || "User";

    await m.react("🕒");

    const prompt = `Kamu adalah seorang komedian stand-up yang jago merosting orang dengan tajam tapi lucu. Buatkan roasting singkat (maksimal 5 kalimat) untuk seseorang bernama "${target}". Roasting harus tajam, kreatif, dengan unsur humor dan sarkasme, tapi tidak mengandung kata-kata kotor atau SARA. Gunakan bahasa Indonesia yang casual dan santai. Format: langsung tulis roasting-nya, tanpa pembuka atau penutup.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("roastai", "AI-nya lagi bad mood nih, coba lagi ya", "error"));
    }

    await m.react("🐣");
    let msg = "";
    msg += `🎯 Target: *${target}*\n`;
    msg += `
`;
    msg += `${result.answer.trim()}\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("roastai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("roastai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
