// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aidescribe", alias: ["describeai", "deskripsiai", "apaini"], category: "future",
  description: "AI deskripsikan isi foto", usage: ".aidescribe (reply gambar)",
  example: ".aidescribe", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!quoted) {
      await m.reply( claraWrap("AI Describe", ["│ ❏ Reply gambar dengan command ini",
        "│ ❏ AI akan mendeskripsikan isinya"].join("\n")), "aidescribe");
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar");
    const base64 = buffer.toString("base64");
    const result = await callAI("Deskripsikan gambar ini dalam Bahasa Indonesia, jelaskan apa yang kamu lihat secara detail.", {
      systemPrompt: "Kamu adalah AI vision yang mendeskripsikan gambar.",
      image: base64,
    });
    await m.reply(claraWrap("AI Describe", "👁️") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };