// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// felov2 — Felo AI v2 (search + answer with sources)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "felov2", alias: ["felov2"], aliases: ["felov2", "feloaiv2"],
  category: "ai", description: "Felo AI v2 — jawaban dengan sumber referensi",
  usage: ".felov2 <pertanyaan>", example: ".felov2 sejarah Indonesia merdeka",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 1, isEnabled: true,
};

async function feloSearch(query) {
  try {
    const res = await fetch("https://api.felo.ai/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, search_type: "chat" }),
    });
    const data = await res.json();
    return { answer: data?.answer || data?.result || "Tidak ada jawaban.", source: data?.sources || [] };
  } catch { return { answer: "Gagal mengambil data.", source: [] }; }
}

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(raraWrap("felov2", `Mau nanya apa?\nContoh: ${m.prefix}felov2 sejarah Indonesia merdeka`, "guide"));
    await m.react("🕒");
    const result = await feloSearch(text);
    let msg = result.answer;
    // API hidup tapi jawab kosong → lempar ke rantai fallback multi-API
    if (!msg || /Tidak ada jawaban|Gagal mengambil data/i.test(msg)) {
      throw new Error("felo balas kosong");
    }
    if (result.source.length > 0) {
      msg += "\n\nSumber:\n" + result.source.filter(s => s.link).slice(0, 5).map((s, i) => `${i+1}. ${s.link}`).join("\n");
    }
    await m.reply(msg);
    await m.react("🐣");
  } catch (e) {

    console.error("felov2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("felov2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
