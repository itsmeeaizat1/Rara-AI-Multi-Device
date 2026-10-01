// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraHeader, separator, raraWrap } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "sentiment", alias: ["sentiment"], category: "smart",
  alias: ["sentiment"],
  description: "Analisis mood grup chat", usage: ".sentiment (reply chat)",
  example: ".sentiment", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text) {
      await m.reply( raraWrap("Sentiment", ["Reply pesan untuk analisis mood",
        "Bot akan tentukan positif/negatif/netral"].join("\n")), "sentiment");
      return { handled: true };
    }
    const result = await callAI(`Analisis sentiment dari teks berikut. Jawab HANYA dengan: POSITIF, NEGATIF, atau NETRAL, lalu berikan alasan singkat dalam Bahasa Indonesia.\n\n${text.substring(0, 500)}`, {
      systemPrompt: "Kamu adalah sentiment analyzer. Berikan jawaban singkat.",
    });
    await m.reply(raraWrap("Sentiment Analysis", "📊") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };