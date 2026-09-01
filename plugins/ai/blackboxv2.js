// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// blackboxv2 — Blackbox Pro AI (abella.icu API)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "blackboxv2", alias: ["blackboxv2"], aliases: ["blackboxv2", "bbprov2"],
  category: "ai", description: "Chat dengan Blackbox Pro AI v2 (abella.icu)",
  usage: ".blackboxv2 <pertanyaan>", example: ".blackboxv2 jelaskan cara kerja quantum computing",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("blackboxv2", `Mau nanya apa?\nContoh: ${m.prefix}blackboxv2 jelaskan quantum computing`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://www.abella.icu/blackbox-pro?q=" + encodeURIComponent(text));
    const data = await res.json();
    if (data?.status !== "success" || !data?.data?.answer?.result) return m.reply(claraWrap("blackboxv2", "Gagal mengambil jawaban dari API.", "error"));
    await m.reply(data.data.answer.result);
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[blackboxv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("blackboxv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("blackboxv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
