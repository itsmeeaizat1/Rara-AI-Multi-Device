// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai-mercury — Mercury AI (Inception Labs) — dLLM DIFUSI PERTAMA di dunia
// Mercury-2: 5-10× lebih cepat dari model sekelas (diffusion LLM), 128K context,
// OpenAI-compatible. Key: apikeys.json novaai.inception (fallback env INCEPTION_API_KEY).
// STRICT SATU RUTE (owner 11 Sep: satuan gak ada fallback) — Mercury doang;
// key belum diset / Mercury down → error, GAK jatuh ke brand lain.
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { viaMercury } from "../../src/lib/nova-ai-fallback.js";
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
    return m.reply(novaWrap("aimercury", `Mau nanya apa?\n\nContoh: ${m.prefix}aimercury apa itu diffusion model?`, "guide"));
  }
  try {
    await m.react("🕒");

    // Langsung ke Mercury (dLLM difusi Inception Labs) — super cepat.
    // Strict: gagal → throw ke catch luar → error reply (tanpa fallback).
    let reply = await viaMercury(text);
    if (!reply) throw new Error("balasan AI kosong");
    // simpan sesi biar obrolan lanjutan nyambung (sama kayak satuan AI lain)
    try {
      const { appendTurn } = await import("../../src/lib/nova-ai-session.js");
      appendTurn("satuan:" + m.sender, text, reply);
    } catch {}

    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("aimercury error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("aimercury", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
