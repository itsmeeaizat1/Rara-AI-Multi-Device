// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 TurboSeek AI — .turboseek
// 🔹 Search engine AI (perplexity-style): tanya apa aja →
//   jawaban AI + daftar sumber link hasil riset web.
// 🔹 Source: fazzcode.eu.cc /turboseek (live verified 14 Sep 2026)
// ═════════════════════════════════════════════

import { turboseekSearch } from "../../src/scraper/fazzcode-ai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "turboseek",
  alias: ["turboseek", "aiseek", "aigoogle"],
  category: "ai",
  description: "Search engine AI — jawaban AI + sumber hasil riset web (ala Perplexity)",
  usage: ".turboseek <pertanyaan>",
  example: ".turboseek siapa presiden indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const q = (m.args || []).join(" ").trim();
    if (!q) {
      return m.reply(claraWrap("turboseek",
        `🔍 *TURBOSEEK — SEARCH ENGINE AI*\n\n` +
        `Tanya apa aja — dijawab AI lengkap dengan sumber hasil riset web (ala Perplexity).\n\n` +
        `Contoh:\n` +
        `• .turboseek siapa presiden indonesia\n` +
        `• .turboseek cuaca hari ini di jakarta\n` +
        `• .turboseek apa itu fotosintesis`));
    }

    await m.react("🧠");
    const r = await turboseekSearch(q);
    if (!r.ok) {
      await m.react("❌");
      return m.reply(claraWrap("turboseek", `⚠️ Gagal nyari jawaban (${r.error === "API_KEY" ? "API key fazzcode belum di-set" : r.error}). Coba lagi nanti ya.`));
    }

    // sumber: max 5, domain singkat
    const srcs = (r.sources || []).slice(0, 5).map((u) => {
      let host = u;
      try { host = new URL(u).hostname.replace(/^www\./, ""); } catch {}
      return `🔗 ${host} — ${u}`;
    }).join("\n");

    await m.react("🐣");
    return m.reply(claraWrap("turboseek",
      `🔍 *JAWABAN AI — ${q.toUpperCase().slice(0, 60)}*\n\n` +
      `${r.answer}\n` +
      (srcs ? `\n📚 *SUMBER RISET:*\n${srcs}\n` : "") +
      `─\n💡 Tanya lagi: *.turboseek <pertanyaan>*`));
  } catch (err) {
    console.error("[turboseek]", err.message);
    await m.react("❌");
    return m.reply(claraWrap("turboseek", "⚠️ Ada error pas nyari. Coba lagi ya."));
  }
}

export { pluginConfig as config, handler };
