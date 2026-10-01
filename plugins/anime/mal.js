// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .mal — suite data MyAnimeList via package mal-scraper (16 Sep 2026, request
// owner: audit dependencies → mal-scraper terverifikasi hidup, live Steins;Gate
// skor 9.07). TANPA API key. STRICT satuan: error asli keluar tanpa fallback.
//
// Subcommand:
//   .mal <judul>              → detail anime (skor, eps, studio, sinopsis)
//   .mal cari <judul>         → daftar hasil pencarian
//   .mal musim [tahun] [musim] → anime musiman (winter/spring/summer/fall)

import * as malScraper from "mal-scraper";
import {
  novaError, novaCaption, novaWrap, tipText,
} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mal",
  alias: ["mal", "myanimelist", "malsuite"],
  category: "anime",
  description: "Info anime dari MyAnimeList",
  usage: ".mal <judul> | .mal cari <q> | .mal musim [tahun] [musim]",
  example: ".mal steins gate",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// seam utk e2e — inject scraper palsu, gak ngenet
let _mal = {
  infoFromName: (q) => malScraper.getInfoFromName(q),
  search: (q) => malScraper.getResultsFromSearch(q),
  season: (year, season) => malScraper.getSeason(year, season),
};
export function _setMalForTest(impl) { _mal = impl; }

const MUSIM_ALIAS = {
  winter: "winter", dingin: "winter",
  spring: "spring", semi: "spring",
  summer: "summer", panas: "summer",
  fall: "fall", gugur: "fall", autumn: "fall",
};

function cut(text, max = 400) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

async function handler(m, { config: botConfig, prefix: cmdPrefix }) {
  const prefix = cmdPrefix || botConfig?.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    const sub = (parts[0] || "").toLowerCase();
    const isSub = ["cari", "musim", "season"].includes(sub);

    if (!raw || (isSub && parts.length < 2 && sub !== "musim")) {
      const text =
        novaCaption({
          emoji: "🎌",
          name: "mal",
          description: "Info anime langsung dari MyAnimeList — skor, episode, studio, sinopsis",
          usage: `${prefix}mal <judul>\n${prefix}mal cari <judul>\n${prefix}mal musim [tahun] [winter|spring|summer|fall]`,
          example: `${prefix}mal steins gate\n${prefix}mal musim 2026 fall`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.reply(text, "mal");
      return { handled: true };
    }

    // ── sub: musim [tahun] [musim] ──
    if (sub === "musim" || sub === "season") {
      const now = new Date();
      let year = Number(parts[1]) || now.getFullYear();
      let seasonKey = MUSIM_ALIAS[(parts[2] || "").toLowerCase()] ||
        ["winter", "spring", "summer", "fall"][Math.floor((now.getMonth() / 3)) % 4];
      const season = MUSIM_ALIAS[seasonKey] || seasonKey;
      await m.react("🔍");
      const list = await _mal.season(year, season);
      if (!Array.isArray(list) || !list.length) {
        await m.reply(novaError("Mal", `Anime musim ${season} ${year} tidak ditemukan — coba tahun/musim lain`), "mal");
        await m.react("❌");
        return { handled: true };
      }
      const rows = list.slice(0, 10).map((a, i) => {
        const judul = a?.title || a?.name || "—";
        const skor = a?.score ?? a?.members ? `⭐ ${a?.score ?? "?"}` : "—";
        return `${i + 1}. *${judul}*${skor && skor !== "—" ? " — " + skor : ""}`;
      });
      const text =
        novaWrap(`MyAnimeList`, [
          `🎬 Anime Musim *${season.toUpperCase()} ${year}*`,
          "",
          ...rows,
          "",
          `Total: ${list.length} anime`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}mal <judul> untuk detail anime`);
      await m.react("🐣");
      await m.reply(text, "mal");
      return { handled: true };
    }

    // ── sub: cari <judul> ──
    if (sub === "cari") {
      const q = parts.slice(1).join(" ");
      await m.react("🔍");
      const list = await _mal.search(q);
      if (!Array.isArray(list) || !list.length) {
        await m.reply(novaError("Mal", `Pencarian "${q}" tidak menemukan anime — coba judul lain`), "mal");
        await m.react("❌");
        return { handled: true };
      }
      const rows = list.slice(0, 8).map((a, i) => {
        const judul = a?.name || a?.title || "—";
        const type = a?.payload?.media_type || a?.type || "";
        const tahun = a?.payload?.start_year || a?.year || "";
        return `${i + 1}. *${judul}*${type ? ` (${type}${tahun ? " " + tahun : ""})` : ""}`;
      });
      const text =
        novaWrap("MyAnimeList", [
          `🔍 Hasil pencarian: *${q}*`,
          "",
          ...rows,
          "",
          `Ketik ${prefix}mal <judul lengkap> untuk detail`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.react("🐣");
      await m.reply(text, "mal");
      return { handled: true };
    }

    // ── default: detail anime ──
    const q = raw;
    await m.react("🔍");
    const a = await _mal.infoFromName(q);
    if (!a || !a.title) {
      await m.reply(novaError("Mal", `Anime "${q}" tidak ditemukan di MyAnimeList — coba ${prefix}mal cari <judul>`), "mal");
      await m.react("❌");
      return { handled: true };
    }
    const genres = (a.genres || []).map((g) => g?.name || g).filter(Boolean);
    const text =
      novaWrap("MyAnimeList", [
        `🎌 *${a.title}*`,
        a.japaneseTitle ? `🈶 ${a.japaneseTitle}` : "",
        "",
        `⭐ Skor : *${a.score ?? "?"}* (${a.ranked || "?"})`,
        `📺 Episode : *${a.episodes ?? "?"}* — ${a.type || "?"}`,
        `📌 Status : *${a.status || "?"}*`,
        ...(a.aired ? [`🗓️ Tayang : ${cut(a.aired, 80)}`] : []),
        ...((a.studios || []).length ? [`🏢 Studio : ${a.studios.map((s) => s?.name || s).join(", ")}`] : []),
        ...(genres.length ? [`🎭 Genre : ${genres.join(", ")}`] : []),
        "",
        `📖 Sinopsis :`,
        cut(a.synopsis, 400) || "—",
      ].join("\n")) +
      (a.url ? "\n\n" + tipText(`Detail lengkap: ${a.url}`) : "") +
      "\n" +
      tipText(`Ketik ${prefix}mal cari <judul> untuk cari anime lain`);
    await m.react("🐣");
    await m.reply(text, "mal");
  } catch (error) {
    await m.react("❌");
    await m.reply(novaError("Mal", `Gagal ambil data MyAnimeList: ${String(error?.message || error).slice(0, 120)}`), "mal");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
