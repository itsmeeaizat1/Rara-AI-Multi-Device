// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aidiet", alias: ["aidiet"], category: "future",
  alias: ["aidiet"],
  description: "Foto makanan → AI hitung kalori", usage: ".aidiet (reply foto makanan)",
  example: ".aidiet", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!quoted) {
      await m.reply( claraWrap("AI Diet", ["│ Reply foto makanan dengan command ini",
        "│ AI akan estimasi kalori & gizi"].join("\n")), "aidiet");
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar nih");
    const base64 = buffer.toString("base64");
    const result = await callAI("Analisis makanan dalam gambar ini. Estimasi nama makanan, kalori, protein, karbohidrat, lemak. Bahasa Indonesia.", {
      systemPrompt: "Kamu adalah ahli gizi. Berikan estimasi yang realistis.",
      image: base64,
    });
    await m.reply(claraWrap("AI Diet", "🍽️") + "\n\n" + result + "\n\n" + separator("━", 22) + "\n" + tipText("Estimasi saja, bukan hasil medis"));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };