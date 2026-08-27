// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraHeader, separator, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ailearn", alias: ["ailearn"], category: "future",
  alias: ["ailearn"],
  description: "AI tutor bahasa & pelajaran", usage: ".ailearn <topik> <pertanyaan>",
  example: ".ailearn inggris apa arti determination", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input) {
      await m.reply( novaCaption({
  emoji: "📁",
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
    await m.reply(claraWrap("AI Tutor", "📚") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };