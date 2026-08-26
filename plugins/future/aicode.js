// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aicodev2", alias: ["aicodev2"], category: "future",
  alias: ["aicodev2"],
  description: "AI review kode kamu", usage: ".aicode <kode> atau reply kode",
  example: ".aicode function hello() { return 'hi' }", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const code = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!code) {
      { const __navText = (claraWrap("AI Code Review", [`│ ❏ Penggunaan: *${prefix}aicode <kode>*`,
        `│ ❏ Atau reply pesan berisi kode`,
        "│ ❏ AI akan review & kasih saran"].join("\n"))); await m.reply( __navText, "aicode"); };
      return { handled: true };
    }
    const prompt = `Review kode berikut, jelaskan error jika ada, berikan saran perbaikan. Balas dalam Bahasa Indonesia:\n\n${code}`;
    const result = await callAI(prompt, { systemPrompt: "Kamu adalah code reviewer ahli. Berikan review singkat dan jelas." });
    await m.reply(claraWrap("AI Code Review", "💻") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };