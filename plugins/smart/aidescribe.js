// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraHeader, separator, raraWrap } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "aidescribe", alias: ["aidescribe"], category: "smart",
  alias: ["aidescribe"],
  description: "AI deskripsikan isi foto", usage: ".aidescribe (reply gambar)",
  example: ".aidescribe", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!quoted) {
      await m.reply( raraWrap("AI Describe", ["Reply gambar dengan command ini",
        "AI akan mendeskripsikan isinya"].join("\n")), "aidescribe");
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar nih");
    const base64 = buffer.toString("base64");
    const result = await callAI("Deskripsikan gambar ini dalam Bahasa Indonesia, jelaskan apa yang kamu lihat secara detail.", {
      systemPrompt: "Kamu adalah AI vision yang mendeskripsikan gambar.",
      image: base64,
    });
    await m.reply(raraWrap("AI Describe", "👁️") + "\n\n" + result );
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };