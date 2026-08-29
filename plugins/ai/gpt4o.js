// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
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
    return m.reply(claraWrap("Gpt-4O", `🧠 *Gpt-4O*\n\nMasukkan pertanyaan\n\n\`Contoh: ${m.prefix}gpt4o Hai apa kabar?\``), "gpt4o");
  }
  try {
    const data = `https://api.cuki.biz.id/api/ai/gpt?apikey=${config.APIkey.cuki}&question=${encodeURIComponent(text)}`
    const res = await fetch(data)
    const json = await res.json()
    { const __navText = `${json.results}`; await m.reply(__navText); };
  } catch (error) {
    console.log(error);
    m.reply(claraWrap("gpt4o", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
