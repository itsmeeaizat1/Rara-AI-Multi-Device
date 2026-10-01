// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraHeader,  separator, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "smartbriefing", alias: ["smartbriefing"], category: "smart",
  alias: ["smartbriefing"],
  description: "Briefing pagi: cuaca+berita+sholat", usage: ".smartbriefing <kota>",
  example: ".smartbriefing Jakarta", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 60, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const city = m.text?.trim() || "Jakarta";
    let text = raraWrap("🌅 Briefing Pagi", "🌅") + "\n\n";
    
    // Weather
    try {
      const { data: w } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%h+%w`, { timeout: 8000, headers: {"User-Agent":"curl"} });
      text += raraWrap("Cuaca", `${city}: ${w}`) + "\n\n";
    } catch (e) { console.error('[smartbriefing.js]:', e.message); }
    
    // Prayer times
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const [y,mo,d] = today.split("-");
      const { data: p } = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/kota/jakarta/${y}/${mo}/${d}`, { timeout: 8000 });
      const j = p?.data?.jadwal;
      if (j) text += raraWrap("Jadwal sHolat", [`Subuh: *${j.subuh}*`, `Dzuhur: *${j.dzuhur}*`, `Ashar: *${j.ashar}*`, `Maghrib: *${j.maghrib}*`, `Isya: *${j.isya}*`].join("\n")) + "\n\n";
    } catch (e) { console.error('[smartbriefing.js]:', e.message); }
    
    // News
    try {
      const { data } = await axios.get("https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id", { timeout: 8000 });
      const items = (data.match(/<title>([^<]+)<\/title>/g) || []).slice(1, 6).map(t => t.replace(/<\/?title>/g, ""));
      text += raraWrap("Berita Terakhir", items.map((it,i) => `${i+1}. ${it.substring(0,60)}`)) + "\n\n";
    } catch (e) { console.error('[smartbriefing.js]:', e.message); }
    
    text +=  tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.reply(text);
  } catch (e) { await m.reply(raraWrap("smartbriefing", "Error: " + e.message, "error")); }
  return { handled: true };
}
export { pluginConfig as config, handler };