// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aoyov2 — Aoyo AI v2 (abella.icu)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aoyov2", alias: ["aoyov2"], aliases: ["aoyov2", "aoyoaiv2"],
  category: "ai", description: "Aoyo AI v2 (abella.icu)",
  usage: ".aoyov2 <pertanyaan>", example: ".aoyov2 jelaskan cara kerja internet",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("aoyov2", `Mau nanya apa?\nContoh: ${m.prefix}aoyov2 jelaskan internet`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://www.abella.icu/aoyoai?q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data?.status !== "success" || !data?.data?.response) return m.reply(claraWrap("aoyov2", "Gagal mengambil respons.", "error"));
    await m.reply(data.data.response);
    await m.react("🐣");
  } catch (e) {
    console.error("aoyov2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("aoyov2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
