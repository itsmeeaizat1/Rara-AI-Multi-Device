// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aidoc", alias: ["docai", "dokumenai", "summarizedoc"], category: "future",
  description: "AI rangkum dokumen/teks panjang", usage: ".aidoc (reply teks panjang)",
  example: ".aidoc", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 20, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text || text.length < 50) {
      await m.reply( claraWrap("AI Doc", [`│ ❏ Reply teks panjang dengan *${prefix}aidoc*`,
        "│ ❏ AI akan rangkum poin-poin penting",
        "│ ❏ Minimal 50 karakter"].join("\n")), "aidoc");
      return { handled: true };
    }
    const prompt = `Rangkum teks berikut dalam 5 poin utama, dalam Bahasa Indonesia:\n\n${text.substring(0, 3000)}`;
    const result = await callAI(prompt, { systemPrompt: "Kamu adalah asisten yang merangkum dokumen dengan jelas." });
    await m.reply(claraWrap("AI Doc Summary", "📄") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };