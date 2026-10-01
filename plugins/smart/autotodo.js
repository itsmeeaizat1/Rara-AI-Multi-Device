// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraHeader, separator, raraWrap } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "autotodo", alias: ["autotodo"], category: "smart",
  alias: ["autotodo"],
  description: "AI deteksi tugas dari chat", usage: ".autotodo (reply chat)",
  example: ".autotodo", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text) {
      await m.reply( raraWrap("Auto Todo", ["Reply chat yang mengandung tugas",
        "AI akan deteksi & list tugasnya"].join("\n")), "autotodo");
      return { handled: true };
    }
    const result = await callAI(`Dari teks berikut, deteksi semua tugas/to-do yang perlu dilakukan. List dengan format: 1. tugas\n2. tugas\n dst. Jika tidak ada tugas, jawab: TIDAK ADA TUGAS. Bahasa Indonesia.\n\n${text.substring(0, 500)}`, {
      systemPrompt: "Kamu adalah task detector. Berikan jawaban singkat.",
    });
    await m.reply(raraWrap("Auto Todo", "📋") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };