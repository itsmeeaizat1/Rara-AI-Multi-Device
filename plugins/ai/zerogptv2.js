// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// zerogptv2 — ZeroGPT AI v2 (zerogptai.org)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

const pluginConfig = {
  name: "zerogptv2", alias: ["zerogptv2"], aliases: ["zerogptv2", "zgptv2"],
  category: "ai", description: "ZeroGPT AI v2 — chat AI gratis",
  usage: ".zerogptv2 <pertanyaan>", example: ".zerogptv2 jelaskan quantum mechanics",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(raraWrap("zerogptv2", `Mau nanya apa?\nContoh: ${m.prefix}zerogptv2 jelaskan quantum mechanics`, "guide"));
    await m.react("🕒");
    // IkyyXD zerogpt (primary) — AI detector
    let usedDetector = false;
    try {
      const detectRes = await callAI({
        providerKey: "ikyy_zerogpt",
        apiKey: getApiKey("kyzz"),
        messages: [{ role: "user", content: text }],
        senderJid: m.sender,
      });
      if (detectRes) {
        await m.react("🐣");
        await m.reply(raraWrap("ZeroGPT Detector", detectRes));
        return;
      }
    } catch (ikyyErr) {
      console.error("[zerogptv2.js] IkyyXD zerogpt failed, trying chat fallback:", ikyyErr.message);
    }

    // Fallback: use callIkyy as chat AI
    try {
      const ikyyReply = await callIkyy(text, {});
      if (ikyyReply) {
        await m.react("🐣");
        await m.reply(ikyyReply);
        return;
      }
    } catch (chatErr) {
      console.error("[zerogptv2.js] chat fallback failed:", chatErr.message);
    }

    // Last resort: zerogptai.org direct
    const id = () => Math.random().toString(36).slice(2, 18);
    const res = await fetch("https://zerogptai.org/wp-json/mwai-ui/v1/chats/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: "default", customId: null, session: "N/A", chatId: id(), contextId: 39, messages: [], newMessage: text, newFileId: null, stream: false }),
    });
    const data = await res.json();
    await m.reply(data?.reply || data?.result || data?.data || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[zerogptv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("zerogptv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("zerogptv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
