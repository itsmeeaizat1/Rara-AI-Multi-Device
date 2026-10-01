// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 NoTrack AI — .notrack
// 🔹 Chat AI stateless dari NoTrack (model C) via fazzcode.eu.cc.
// 🔹 NOTE: fazzcode sering auto-lock endpoint sementara — kalau kena
//   lock, error diturunkan ramah (tunggu beberapa menit jalan lagi).
//   Rantai fallback AI (semua fitur AI) juga nyambung ke sini:
//   no-track duluan → agnes-2.5-flash (step 1.7 nova-ai-fallback.js).
// ═════════════════════════════════════════════

import { notrackChat } from "../../src/scraper/fazzcode-ai.js";
import { novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "notrack",
  alias: ["notrack", "ainotrack"],
  category: "ai",
  description: "Chat AI NoTrack — jadi bagian rantai fallback AI juga",
  usage: ".notrack <pesan>",
  example: ".notrack rekomendasi film malam ini",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const q = (m.args || []).join(" ").trim();
    if (!q) {
      return m.reply(novaGuideV2("notrack", {
 kaomoji: "(¬‿¬)",
 sapaan: "tanya apa aja — AI satuan NoTrack yang gak nyimpen track kamu! (⌒‿⌒)",
        cara: "ketik pertanyaannya sesudah command",
        contoh: `${m.prefix}notrack ceritain lelucon pendek`,
        spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
      }));
    }

    await m.react("🧠");
    const r = await notrackChat(q);
    if (!r.ok) {
      await m.react("❌");
      return m.reply(novaWrap("notrack", `⚠️ NoTrack AI lagi gak bisa merespon (${r.error === "API_KEY" ? "API key fazzcode belum di-set" : r.error}). Coba lagi nanti ya.`));
    }

    await m.react("🐣");
    return m.reply(novaWrap("notrack", r.reply));
  } catch (err) {
    console.error("[notrack]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("notrack", "⚠️ Ada error pas chat. Coba lagi ya."));
  }
}

export { pluginConfig as config, handler };
