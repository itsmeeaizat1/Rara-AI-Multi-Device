// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// onepixiv.js — Onepunya API: PIXIV_SEARCH + PIXIV_R18_SEARCH.
// .onepixiv <query>        — cari artwork Pixiv (hasil SFW dibarengin foto pertama)
// .onepixiv18 <query>      — cari artwork Pixiv versi R-18 (konten dewasa)
// Sumber: onepunya.qzz.io (key .setkey onepunya) — beda engine dari .pixiv (NeoXR).
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { pixivSearch, pixiv18Search } from "../../src/lib/rara-onepunya.js";

const pluginConfig = {
  name: "onepixiv",
  alias: ["onepixiv", "onepixiv18", "pixivonepunya"],
  category: "search",
  description: "Cari artwork Pixiv via Onepunya API",
  usage: ".onepixiv <query> · .onepixiv18 <query>",
  example: ".onepixiv frieren",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const query = (m.args || []).join(" ").trim();
  if (!query) {
    return m.reply(raraWrap("Onepunya Pixiv", `Masukkan kata kunci!\n\nContoh: .${cmd} frieren`));
  }
  const apiKey = getApiKey("onepunya");
  try {
    const results = cmd === "onepixiv18"
      ? await pixiv18Search(apiKey, query)
      : await pixivSearch(apiKey, query);
    const list = (Array.isArray(results) ? results : []).slice(0, 10);
    if (!list.length) {
      return m.reply(raraWrap("Onepunya Pixiv", `Gak ada hasil untuk: ${query}`));
    }
    const is18 = cmd === "onepixiv18";
    let text = `${is18 ? "🔞" : "🎨"} Onepunya Pixiv ${is18 ? "R-18" : ""} Search\nKueri: ${query}\nHasil: ${list.length} artwork\n\n`;
    list.forEach((art, i) => {
      text += `${i + 1}. ${String(art.title || "").slice(0, 60)}${art.r18 ? " 🔞" : ""}\n   ${art.author} · ${art.width}x${art.height} · ID ${art.pid}\n`;
    });
    text += `\nPowered by Onepunya API`;
    await m.reply(raraWrap("Onepunya Pixiv", text));
    // kirim artwork pertama sebagai preview
    const first = list[0];
    const imgUrl = first?.urls?.regular || first?.urls?.original || "";
    if (imgUrl) {
      try { await sock.sendMessage(m.chat, { image: { url: imgUrl }, caption: `🎨 ${first.title} — ${first.author}` }, { quoted: m }); } catch {}
    }
  } catch (e) {
    return m.reply(raraWrap("Onepunya Pixiv", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
