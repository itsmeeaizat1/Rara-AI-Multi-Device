// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  raraHeader, separator, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "aicodev2", alias: ["aicodev2", "aicode"], category: "smart",
  alias: ["aicodev2", "aicode"],
  description: "AI review kode kamu", usage: ".aicode <kode> atau reply kode",
  example: ".aicode function hello() { return 'hi' }", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const code = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!code) {
      const text = raraCaption({
        emoji: "💻",
        name: "aicodev2",
        description: "AI review kode kamu",
        usage: `${prefix}aicode <kode> atau reply kode`,
        example: `${prefix}aicode function hello() { return 'hi' }`,
      });
      await m.reply(text, "aicode");
      return { handled: true };
    }
    const prompt = `Review kode berikut, jelaskan error jika ada, berikan saran perbaikan. Balas dalam Bahasa Indonesia:\n\n${code}`;
    const result = await callAI(prompt, { systemPrompt: "Kamu adalah code reviewer ahli. Berikan review singkat dan jelas." });
    await m.reply(raraWrap("AI Code Review", "💻") + "\n\n" + result);
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };