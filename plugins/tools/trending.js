// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "trending", alias: ["trending"], category: "tools",
  alias: ["trending"],
  description: "Trending topic Google", usage: ".trending",
  example: ".trending", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 30, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const { data } = await axios.get("https://trends.google.com/trending/rss?geo=ID", {
      timeout: 10000, headers: {"User-Agent":"Mozilla/5.0"},
    });
    // Parse RSS items
    const items = (data.match(/<title>([^<]+)<\/title>/g) || []).slice(1, 11)
      .map(t => t.replace(/<\/?title>/g, ""));
    if (!items.length) throw new Error("Gagal ambil nih trending");
    let text = claraWrap("Trending Indonesia", "📈") + "\n\n";
    items.forEach((item, i) => { text += `${i+1}. *${item}*\n`; });
    text += "\n" + tipText(`Sumber: Google Trends Indonesia`);
    await m.reply(claraWrap("trending", text));
  } catch (e) {
    await m.reply(novaError("Tools", "Gagal nih"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };