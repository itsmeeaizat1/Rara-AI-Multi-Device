// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "smartbriefing", alias: ["briefing", "morningbrief", "briefingpagi"], category: "future",
  description: "Briefing pagi: cuaca+berita+sholat", usage: ".smartbriefing <kota>",
  example: ".smartbriefing Jakarta", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 60, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const city = m.text?.trim() || "Jakarta";
    let text = claraWrap("🌅 Briefing Pagi", "🌅") + "\n\n";
    
    // Weather
    try {
      const { data: w } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%h+%w`, { timeout: 8000, headers: {"User-Agent":"curl"} });
      text += claraWrap("Cuaca", `◦ ${city}: ${w}`) + "\n\n";
    } catch {}
    
    // Prayer times
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const [y,mo,d] = today.split("-");
      const { data: p } = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/kota/jakarta/${y}/${mo}/${d}`, { timeout: 8000 });
      const j = p?.data?.jadwal;
      if (j) text += claraWrap("Jadwal sHolat", [`◦ Subuh: *${j.subuh}*`, `◦ Dzuhur: *${j.dzuhur}*`, `◦ Ashar: *${j.ashar}*`, `◦ Maghrib: *${j.maghrib}*`, `◦ Isya: *${j.isya}*`].join("\n")) + "\n\n";
    } catch {}
    
    // News
    try {
      const { data } = await axios.get("https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id", { timeout: 8000 });
      const items = (data.match(/<title>([^<]+)<\/title>/g) || []).slice(1, 6).map(t => t.replace(/<\/?title>/g, ""));
      text += claraWrap("Berita Terakhir", items.map((it,i) => `◦ ${i+1}. ${it.substring(0,60)}`)) + "\n\n";
    } catch {}
    
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.reply(text);
  } catch (e) { await m.reply(claraWrap("smartbriefing", "Error: " + e.message, "error")); }
  return { handled: true };
}
export { pluginConfig as config, handler };