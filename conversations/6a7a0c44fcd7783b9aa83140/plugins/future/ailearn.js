import { alyaHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ailearn", alias: ["aitutor", "tutorai", "belajarai"], category: "future",
  description: "AI tutor bahasa & pelajaran", usage: ".ailearn <topik> <pertanyaan>",
  example: ".ailearn inggris apa arti determination", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input) {
      await sendReplyWithNav(sock, m, claraWrap("AI Learn", [`◦ Penggunaan: *${prefix}ailearn <topik> <pertanyaan>*`,
        `◦ Contoh: *${prefix}ailearn matematika 2+2*`,
        `◦ Contoh: *${prefix}ailearn inggris terjemahkan*`].join("\n")), "ailearn");
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