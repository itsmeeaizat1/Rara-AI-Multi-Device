// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "trending", alias: ["trend", "viral", "populer"], category: "tools",
  description: "Trending topic Google", usage: ".trending",
  example: ".trending", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 30, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const { data } = await axios.get("https://trends.google.com/trending/rss?geo=ID", {
      timeout: 10000, headers: {"User-Agent":"Mozilla/5.0"},
    });
    // Parse RSS items
    const items = (data.match(/<title>([^<]+)<\/title>/g) || []).slice(1, 11)
      .map(t => t.replace(/<\/?title>/g, ""));
    if (!items.length) throw new Error("Gagal mengambil trending");
    let text = claraWrap("Trending Indonesia", "📈") + "\n\n";
    items.forEach((item, i) => { text += `${i+1}. *${item}*\n`; });
    text += "\n" + separator("━", 22) + "\n" + tipText(`Sumber: Google Trends Indonesia`);
    await m.reply(claraWrap("trending", text));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`╎❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };