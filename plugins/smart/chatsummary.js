// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraHeader, separator, raraWrap } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "chatsummary", alias: ["chatsummary"], category: "smart",
  alias: ["chatsummary"],
  description: "Rangkuman chat yang kelewat", usage: ".chatsummary",
  example: ".chatsummary", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: false, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase();
    const gid = m.key?.remoteJid || "";
    if (!db.recentMsgs) db.recentMsgs = {};
    const msgs = db.recentMsgs[gid] || [];
    if (msgs.length < 5) {
      await m.reply(raraWrap("Chat Summary", ["Belum cukup pesan untuk dirangkum",
        "Minimal 5 pesan terakhir"].join("\n")));
      return { handled: true };
    }
    const chatText = msgs.slice(-30).map(m => `${m.sender.split("@")[0]}: ${m.text}`).join("\n");
    const result = await callAI(`Rangkum chat grup berikut dalam 3-5 poin utama. Bahasa Indonesia.\n\n${chatText.substring(0, 2000)}`, {
      systemPrompt: "Kamu adalah chat summarizer. Berikan rangkuman singkat.",
    });
    await m.reply(raraWrap("Chat Summary", "📋") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };