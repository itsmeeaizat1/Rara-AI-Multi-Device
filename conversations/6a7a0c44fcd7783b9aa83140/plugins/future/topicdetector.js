import { alyaHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "topicdetector", alias: ["topic", "topikgrup"], category: "future",
  description: "Deteksi topik yang lagi rame", usage: ".topicdetector",
  example: ".topicdetector", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase();
    const gid = m.key?.remoteJid || "";
    if (!db.recentMsgs) db.recentMsgs = {};
    const msgs = db.recentMsgs[gid] || [];
    if (msgs.length < 5) {
      await m.reply(claraWrap("Topic Detector", ["◦ Belum cukup pesan untuk analisis"].join("\n")));
      return { handled: true };
    }
    const chatText = msgs.slice(-20).map(m => m.text || "").filter(Boolean).join("\n");
    const result = await callAI(`Dari chat grup berikut, tentukan topik utama yang sedang dibicarakan. Berikan 1-3 topik utama dalam Bahasa Indonesia.\n\n${chatText.substring(0, 1500)}`, {
      systemPrompt: "Kamu adalah topic detector. Berikan jawaban singkat.",
    });
    await m.reply(claraWrap("Topic Detector", "🔍") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };