import { alyaHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "autotodo", alias: ["tododetect", "aitodo"], category: "future",
  description: "AI deteksi tugas dari chat", usage: ".autotodo (reply chat)",
  example: ".autotodo", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const text = m.text?.trim() || (m.quoted ? await m.quoted.text : "");
    if (!text) {
      await sendReplyWithNav(sock, m, claraWrap("Auto Todo", ["◦ Reply chat yang mengandung tugas",
        "◦ AI akan deteksi & list tugasnya"].join("\n")), "autotodo");
      return { handled: true };
    }
    const result = await callAI(`Dari teks berikut, deteksi semua tugas/to-do yang perlu dilakukan. List dengan format: 1. tugas\n2. tugas\n dst. Jika tidak ada tugas, jawab: TIDAK ADA TUGAS. Bahasa Indonesia.\n\n${text.substring(0, 500)}`, {
      systemPrompt: "Kamu adalah task detector. Berikan jawaban singkat.",
    });
    await m.reply(claraWrap("Auto Todo", "📋") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };