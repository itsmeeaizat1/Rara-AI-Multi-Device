// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { parallelAI } from "../../src/scraper/parallelai.js";
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "parallelai",
  alias: ["parallelai"],
  category: "ai",
  description: "Tanya AI menggunakan Parallel AI (reasoning model)",
  usage: ".parallelai <pertanyaan>",
  example: ".parallelai cari kan rest api gratis",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const raw = m.text?.trim() || "";
    const prompt = raw
      .replace(new RegExp(`^\\${prefix}(parallelai|parallel|paai|paraai)\\s+`, "i"), "")
      .trim();

    if (!prompt) {
      const text = raraCaption({
  emoji: "🤖",
  name: "parallelai",
  description: "Tanya AI menggunakan Parallel AI (reasoning model)",
  usage: `${prefix}parallelai <pertanyaan>`,
  example: `${prefix}parallelai cari kan rest api gratis`,
});
      await m.react("🐣");
      return await m.reply(text, "parallelai");
    }

    // Detect effort level from prompt: !high, !medium, !low
    let effort = "low";
    const effortMatch = prompt.match(/!(high|medium|low)\b/i);
    if (effortMatch) {
      effort = effortMatch[1].toLowerCase();
    }
    const cleanPrompt = prompt.replace(/!(high|medium|low)\b/i, "").trim();

    if (sock.sendPresenceUpdate) {
      await sock.sendPresenceUpdate("composing", m.chat);
    }

    let response;
    try {
      response = await parallelAI({ input: cleanPrompt, effort });
    } catch (primaryErr) {
      // AI satuan strict (owner 14 Sep): gak ada fallback lintas-AI — error asli kelihatan
      throw primaryErr;
    }

    if (!response || !response.trim()) {
      return await m.reply(raraWrap("Error", ["Parallel AI tidak memberikan respons. Coba lagi nanti."].join("\n")), "parallelai");
    }

    // Clean markdown for WhatsApp
    let cleanRes = response
      .replace(/\$\$(.+?)\$\$/gs, "$1")
      .replace(/\$(.+?)\$/g, "$1")
      .replace(/^#+\s/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "*$1*")
      .trim();

    const header = effort !== "low" ? `Parallel AI (effort: ${effort})` : "Parallel AI";
    const text = raraWrap(header, cleanRes);

    return await m.reply(text, "parallelai");
  } catch (err) {
    console.error("parallelai error:", err?.message);
    const errMsg = err?.message?.includes("API key")
      ? "API key Parallel AI belum diset."
      : err?.message?.includes("401") || err?.message?.includes("403")
        ? "API key tidak valid atau expired."
        : `Error: ${err?.message || "Terjadi kesalasan"}`;
    return await m.reply(raraWrap("Error", errMsg));
  }
}

export { pluginConfig as config, handler };
