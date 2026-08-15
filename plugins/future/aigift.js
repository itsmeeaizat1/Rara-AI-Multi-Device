// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aigift", alias: ["giftai", "rekomendasikado", "kadoai"], category: "future",
  description: "AI rekomendasi kado", usage: ".aigift <info orang>",
  example: ".aigift cowok 20th suka game", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const info = m.text?.trim();
    if (!info) {
      await sendReplyWithNav(sock, m, claraWrap("AI Gift", [`◦ Penggunaan: *${prefix}aigift <info orang>*`,
        `◦ Contoh: *${prefix}aigift cewek 22th suka kpop*`].join("\n")), "aigift");
      return { handled: true };
    }
    const result = await callAI(`Berikan 5 rekomendasi kado untuk: ${info}. Format: nama kado - singkat alasan. Bahasa Indonesia.`, {
      systemPrompt: "Kamu adalah ahli rekomendasi kado. Berikan jawaban singkat dan praktis.",
    });
    await m.reply(claraWrap("AI Gift", "🎁") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };