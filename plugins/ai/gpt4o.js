// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import raraApi from "../../src/lib/rara-apimanager.js";
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "gpt4o",
  alias: ["gpt4o"],
  category: "ai",
  description: "Chat dengan GPT-4o",
  usage: ".gpt4o <pertanyaan>",
  example: ".gpt4o Hai apa kabar?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(raraGuideV2("gpt4o", {
 kaomoji: "(≧▽≦)",
 sapaan: "tanya apa aja ke GPT-4O! (◕‿◕)",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}gpt4o Hai apa kabar?`,
      spec: ["⚡ energi 1", "⏱ 5dtk", "💸 gratis"],
    }), "gpt4o");
  }
  try {
    await m.react("🕒");
    // cuki sering 429/berubah bentuk → coba dulu, gagal/kosong → rantai fallback
    const data = `https://api.cuki.biz.id/api/ai/gpt?apikey=${config.APIkey.cuki}&question=${encodeURIComponent(text)}`;
    const res = await fetch(data, { signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => ({}));
    const reply = typeof json?.results === "string" ? json.results : (json?.data || json?.answer || "");
    if (reply && reply.trim()) {
      await m.react("🐣");
      return m.reply(reply);
    }
    throw new Error("cuki balas kosong/429");
  } catch (error) {

    console.log(error);
    m.reply(raraWrap("gpt4o", te(m.prefix, m.command, m.pushName, error), "error"));
  }
}

export { pluginConfig as config, handler };
