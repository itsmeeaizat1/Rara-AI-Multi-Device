// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// animefinder.js — Cari anime manual (request owner 8 Sep 2026, ala script owner
// "!search"). Sumber: AniList search → Kitsu fallback (AniList outage-proof).
// Bonus koneksi V1: kalau judul cocok dengan ongoing winbu.net (V1 auto anime
// episode 720p ke grup), hasil diberi catatan "episode otomatis dikirim (V1)".
//   • .carianime <judul>  — top 5 hasil

import { searchAnime } from "../../src/lib/rara-auto-anime-notifier.js";
import { getOngoingAnimeList } from "../../src/lib/rara-auto-anime.js";
import { raraError, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "carianime",
  alias: ["animeinfo", "carianim"],
  category: "anime",
  description: "Cari info anime (AniList → Kitsu) + cek ketersediaan episode otomatis di winbu (V1)",
  usage: ".carianime <judul anime>",
  example: ".carianime grand blue",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

/** Fuzzy: kata kunci ada di judul winbu (atau sebaliknya). */
function matchWinbu(query, winbuList) {
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!q) return null;
  for (const w of winbuList) {
    const t = (w.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (!t) continue;
    if (t.includes(q) || q.includes(t) || q.split(" ").filter(Boolean).some((word) => word.length >= 4 && t.includes(word))) {
      return w;
    }
  }
  return null;
}

function formatResult(results, query, winbuHit) {
  let msg = `🔍 *Hasil Pencarian Anime* — "${query}"\n\n`;
  results.forEach((a, i) => {
    msg += `${i + 1}. *${a.title}*\n`;
    msg += `   ⭐ ${a.score} | 📺 ${a.episodes} eps | ${a.status}\n`;
    if (a.startDate && a.startDate !== "TBA") msg += `   📅 ${a.startDate}\n`;
    msg += `   🎭 ${a.genres?.slice(0, 4).join(", ") || "N/A"}\n`;
    msg += `   🏢 ${a.studios}\n`;
    if (a.description) msg += `   📖 ${a.description.slice(0, 120)}...\n`;
    if (a.nextEpisode) msg += `   🕒 Episode ${a.nextEpisode.episode} rilis dalam ~${a.nextEpisode.timeUntil} jam\n`;
    msg += `\n`;
  });
  msg += `📱 Sumber: ${results[0]?.source || "AniList"}`;
  if (winbuHit) {
    msg += `\n\n📺 *Tersedia di winbu.net (V1 Auto Anime)*\n"${winbuHit.title}" — episode terbaru otomatis dikirim ke grup langganan V1 (720p Pixeldrain).`;
  }
  return msg;
}

async function handler(m, { sock, args }) {
  const query = (m.args?.join(" ") || m.text || "").trim();

  if (!query || query.length < 2) {
    return m.reply(raraNoInput(pluginConfig.name, "masukin judul anime minimal 2 huruf", ".carianime grand blue"));
  }
  if (query.toLowerCase() === "help" || query.toLowerCase() === "menu") {
    return m.reply(raraGuide(pluginConfig.name, "cari info anime dari AniList (fallback Kitsu) — judul, skor, episode, genre, studio, sinopsis, plus cek ketersediaan episode otomatis winbu (V1)", ".carianime <judul>"));
  }

  await m.react("🕒");
  let results = [];
  let winbuHit = null;

  try {
    [results, winbuHit] = await Promise.all([
      searchAnime(query, 5).catch(() => []),
      getOngoingAnimeList().then((list) => matchWinbu(query, list)).catch(() => null),
    ]);
  } catch (e) {
    await m.react("❌");
    return m.reply(raraError(pluginConfig.name, "sumber anime lagi sibuk — coba lagi sebentar lagi"));
  }

  if (!results.length) {
    await m.react("❌");
    return m.reply(raraError(pluginConfig.name, `gak ketemu anime dengan keyword "${query}"`));
  }

  await m.react("🐣");
  return m.reply(formatResult(results, query, winbuHit));
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
