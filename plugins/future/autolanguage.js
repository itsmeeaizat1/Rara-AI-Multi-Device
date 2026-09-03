// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "autolanguage", alias: ["autolanguage"], category: "future",
  alias: ["autolanguage"],
  description: "Deteksi bahasa & translate", usage: ".autolanguage (reply pesan)",
  example: ".autolanguage", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text) {
      await m.reply( claraWrap("Auto Language", ["Reply pesan asing",
        "Bot akan deteksi bahasa & translate ke Indonesia"].join("\n")), "autolanguage");
      return { handled: true };
    }
    const result = await callAI(`Deteksi bahasa teks berikut, lalu translate ke Bahasa Indonesia. Format: Bahasa: [nama bahasa]\nTerjemahan: [hasil]\n\n${text.substring(0, 500)}`, {
      systemPrompt: "Kamu adalah translator. Berikan jawaban singkat.",
    });
    await m.reply(claraWrap("Auto Language", "🌐") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };