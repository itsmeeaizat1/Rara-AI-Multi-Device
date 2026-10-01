// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaHeader, separator, novaWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "autofactcheck", alias: ["autofactcheck"], category: "smart",
  alias: ["autofactcheck"],
  description: "AI cek fakta dari claim", usage: ".autofactcheck (reply claim)",
  example: ".autofactcheck", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const claim = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!claim) {
      await m.reply( novaWrap("Fact Check", ["Reply pesan berisi claim",
        "AI akan cek kebenarannya"].join("\n")), "autofactcheck");
      return { handled: true };
    }
    const result = await callAI(`Cek fakta claim berikut. Tentukan: BENAR, SEBAGIAN BENAR, atau SALAH. Berikan penjelasan singkat dalam Bahasa Indonesia.\n\nClaim: "${claim.substring(0, 500)}"`, {
      systemPrompt: "Kamu adalah fact checker. Berikan analisis singkat dan objektif.",
    });
    await m.reply(novaWrap("Fact Check", "🔍") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };