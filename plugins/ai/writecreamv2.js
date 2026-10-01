// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// writecreamv2 — Writecream AI v2 (persona-based chat)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "writecreamv2", alias: ["writecreamv2"], aliases: ["writecreamv2", "wcprov2"],
  category: "ai", description: "Writecream AI v2 — chat dengan persona custom",
  usage: ".writecreamv2 <persona>|<pertanyaan>", example: ".writecreamv2 kamu psikolog|aku sering gelisah",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(raraWrap("writecreamv2", `Format: ${m.prefix}writecreamv2 persona|pertanyaan\nContoh: ${m.prefix}writecreamv2 kamu psikolog|aku sering gelisah`, "guide"));
    const [logic, question] = text.split("|").map(v => v.trim());
    if (!logic || !question) return m.reply(raraWrap("writecreamv2", `Format salah!\nContoh: ${m.prefix}writecreamv2 kamu psikolog|aku sering gelisah`, "guide"));
    await m.react("🕒");
    const query = JSON.stringify([{ role: "system", content: logic }, { role: "user", content: question }]);
    const url = `https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat?query=${encodeURIComponent(query)}&link=writecream.com`;
    const res = await fetch(url);
    const data = await res.json();
    let raw = data?.response_content || data?.reply || data?.result || data?.text || "Tidak ada jawaban.";
    raw = raw.replace(/\\n/g, "\n").replace(/\n{2,}/g, "\n\n").replace(/\*\*(.*?)\*\*/g, "*$1*");
    await m.reply(raw.trim());
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[writecreamv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("writecreamv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("writecreamv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
