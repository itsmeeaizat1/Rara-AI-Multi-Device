// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cegptv2 — GPT Logic AI v2 (chateverywhere.app)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "cegptv2", alias: ["cegptv2"], aliases: ["cegptv2", "gptlogicv2"],
  category: "ai", description: "Chat dengan GPT Logic v2 (chateverywhere.app)",
  usage: ".cegptv2 <pertanyaan>", example: ".cegptv2 siapa presiden Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("cegptv2", `Mau nanya apa?\nContoh: ${m.prefix}cegptv2 siapa presiden Indonesia`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://chateverywhere.app/api/chat/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: { id: "gpt-3.5-turbo-0613", name: "GPT-3.5", maxLength: 12000, tokenLimit: 4000, completionTokenLimit: 2500, deploymentName: "gpt-35" },
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || data?.reply || "Tidak ada jawaban.";
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("cegptv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("cegptv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
