// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai-mercury — Mercury AI (Inception Labs) — dLLM DIFUSI PERTAMA di dunia
// Mercury-2: 5-10× lebih cepat dari model sekelas (diffusion LLM), 128K context,
// OpenAI-compatible. Key: apikeys.json novaai.inception (fallback env INCEPTION_API_KEY).
// Langsung ke viaMercury; key mati → jatuh ke rantai fallback (aiFallbackChat).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { viaMercury, aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";
import { smallcapsText } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "aimercury",
  alias: ["mercury", "inception", "dllm", "diffusion", "diffusionai"],
  category: "ai",
  description: "Mercury AI — diffusion LLM Inception Labs (mercury-2, super cepat)",
  usage: ".aimercury <pertanyaan>",
  example: ".aimercury apa itu diffusion model?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) {
    return m.reply(claraWrap("aimercury", `Mau nanya apa?\n\nContoh: ${m.prefix}aimercury apa itu diffusion model?`, "guide"));
  }
  try {
    await m.react("🕒");

    // Langsung ke Mercury (dLLM difusi Inception Labs) — super cepat
    let reply = "";
    try {
      reply = await viaMercury(text);
      // simpan sesi biar obrolan lanjutan nyambung (sama kayak satuan AI lain)
      try {
        const { appendTurn } = await import("../../src/lib/nova-ai-session.js");
        appendTurn("satuan:" + m.sender, text, reply);
      } catch {}
    } catch {
      // Mercury down / key mati → rantai fallback multi-API
      reply = await aiFallbackChat(text, {
        persona: "Mercury AI — diffusion LLM dari Inception Labs",
        model: "gemini",
        sessionKey: "satuan:" + m.sender,
        quoted: m.quoted?.text,
        userName: m.pushName,
      });
    }
    if (!reply) throw new Error("balasan AI kosong");

    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("aimercury error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("aimercury", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
