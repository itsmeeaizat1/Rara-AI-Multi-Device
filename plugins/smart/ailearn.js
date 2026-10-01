// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import {  raraHeader, separator, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "ailearn", alias: ["ailearn"], category: "smart",
  alias: ["ailearn"],
  description: "AI tutor bahasa & pelajaran", usage: ".ailearn <topik> <pertanyaan>",
  example: ".ailearn inggris apa arti determination", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const input = m.text?.trim();
    if (!input) {
      await m.reply( raraCaption({
  emoji: "🎓",
  name: "ailearn",
  description: "AI tutor bahasa & pelajaran",
  usage: `${prefix}ailearn <topik> <pertanyaan>`,
  example: `${prefix}ailearn inggris apa arti determination`,
}), "ailearn");
      return { handled: true };
    }
    const result = await callAI(`Kamu adalah tutor. Jawab pertanyaan berikut dengan cara yang mudah dipahami, berikan penjelasan & contoh. Bahasa Indonesia.\n\n${input}`, {
      systemPrompt: "Kamu adalah tutor yang sabar. Berikan penjelasan sederhana & contoh praktis.",
    });
    await m.reply(raraWrap("AI Tutor", "📚") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };