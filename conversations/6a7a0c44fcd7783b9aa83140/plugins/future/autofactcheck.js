import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "autofactcheck", alias: ["factcheck", "cekfakta", "factai"], category: "future",
  description: "AI cek fakta dari claim", usage: ".autofactcheck (reply claim)",
  example: ".autofactcheck", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const claim = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!claim) {
      await sendReplyWithNav(sock, m, claraWrap("Fact Check", ["◦ Reply pesan berisi claim",
        "◦ AI akan cek kebenarannya"].join("\n")), "autofactcheck");
      return { handled: true };
    }
    const result = await callAI(`Cek fakta claim berikut. Tentukan: BENAR, SEBAGIAN BENAR, atau SALAH. Berikan penjelasan singkat dalam Bahasa Indonesia.\n\nClaim: "${claim.substring(0, 500)}"`, {
      systemPrompt: "Kamu adalah fact checker. Berikan analisis singkat dan objektif.",
    });
    await m.reply(claraWrap("Fact Check", "🔍") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };