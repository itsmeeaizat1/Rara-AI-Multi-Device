// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "autoevent", alias: ["autoevent"], category: "smart",
  alias: ["autoevent"],
  description: "AI deteksi event dari chat", usage: ".autoevent (reply chat)",
  example: ".autoevent", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text) {
      await m.reply( claraWrap("Auto Event", ["Reply chat yang menyebut tanggal/acara",
        "AI akan deteksi & buat reminder"].join("\n")), "autoevent");
      return { handled: true };
    }
    const result = await callAI(`Dari teks berikut, deteksi tanggal & event/acara. Format jawaban: TANGGAL: DD-MM-YYYY | EVENT: nama_event. Jika tidak ada tanggal, jawab: TIDAK ADA EVENT.\n\n${text.substring(0, 500)}`, {
      systemPrompt: "Kamu adalah event detector. Berikan jawaban singkat sesuai format.",
    });
    await m.reply(claraWrap("Auto Event", "📅") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };