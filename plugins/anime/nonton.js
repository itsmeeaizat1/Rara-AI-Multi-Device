// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Nonton Anime Hub — .nonton
// 🔹 Sumber zelapi.eu.cc/docs/anime (24 endpoint, 5 situs sumber).
// 🔹 FASE 1: ANIBIPLAY (reliable) + OTAKUDESU (subset ongoing/complete).
// 🔹 animelovers & wotanim DITUNDA — upstream sering 403 (anti-bot),
//    request owner "yg work dulu" — nanti disusul kalau udah stabil.
// 🔹 animekompi DIKELUARKAN permanen — DNS mati (v6.animekompi.fun).
// 🔹 STRICT: error asli dari upstream ditampilkan, no fallback ngasal.
// ═════════════════════════════════════════════
import { zelAnimeGet, _setZelAnimeHttpForTest, _setZelAnimeKeyForTest } from "../../src/scraper/zelanime.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  renderAnibiplayHome,
  renderAnibiplaySearch,
  renderAnibiplayDetail,
  renderAnibiplayEpisode,
  renderAnibiplayExplore,
  renderOtakudesuList,
} from "../../src/lib/nova-anime-render.js";

const pluginConfig = {
  name: "nonton",
  alias: ["anime2", "streamanime", "nontonanime"],
  category: "anime",
  description: "Cari & nonton info anime (anibiplay + otakudesu) — episode, streaming, genre",
  usage: ".nonton <sumber> <aksi> [param]",
  example: ".nonton anibiplay cari one piece",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

function usageText() {
  return (
    `📺 *NONTON ANIME HUB*\n\n` +
    `📖 *CARA PAKAI:*\n` +
    `.nonton anibiplay home\n` +
    `.nonton anibiplay cari <judul>\n` +
    `.nonton anibiplay detail <slug>\n` +
    `.nonton anibiplay episode <slug> <nomor>\n` +
    `.nonton anibiplay explore [genre] [halaman]\n` +
    `.nonton otakudesu\n\n` +
    `Contoh:\n.nonton anibiplay cari one piece\n.nonton anibiplay detail one-piece\n.nonton anibiplay episode one-piece 1\n\n` +
    `_Sumber lain (animelovers, wotanim) lagi sering diblokir upstream — belum dipasang, nyusul kalau udah stabil._`
  );
}

async function handler(m) {
  try {
    const args = m.args || [];
    const source = (args[0] || "").toLowerCase();
    const action = (args[1] || "").toLowerCase();
    const rest = args.slice(2).join(" ").trim();

    if (!source || source === "list" || source === "help") {
      return m.reply(claraWrap("nonton", usageText(), "guide"));
    }

    // animelovers & wotanim disengaja belum dipasang — kasih tau kenapa,
    // biar user gak nunggu error technical yang gak jelas.
    if (source === "animelovers" || source === "wotanim") {
      return m.reply(claraWrap("nonton",
        `⏳ Sumber *${source}* belum dipasang — upstream-nya lagi sering blokir request (403).\nDitunda sampai sumbernya stabil.`, "info"));
    }
    if (source === "animekompi") {
      return m.reply(claraWrap("nonton", `❌ Sumber *animekompi* mati total (server down), gak dipasang.`, "error"));
    }

    if (source !== "anibiplay" && source !== "otakudesu") {
      return m.reply(claraWrap("nonton", `Sumber gak dikenal. Pakai: anibiplay, otakudesu.\n\n${usageText()}`, "guide"));
    }

    await m.react("🧠");

    // ── OTAKUDESU: satu-satunya action reliable = ongoing+complete list ──
    if (source === "otakudesu") {
      const r = await zelAnimeGet("otakudesu", { action: "complete" });
      if (!r.ok) {
        await m.react("❌");
        return m.reply(claraWrap("nonton", `❌ Otakudesu gagal: ${r.error}`, "error"));
      }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderOtakudesuList(r.data).join("\n"), "info"));
    }

    // ── ANIBIPLAY ──
    if (action === "home" || !action) {
      const r = await zelAnimeGet("anibiplay/home");
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("nonton", `❌ Gagal ambil home: ${r.error}`, "error")); }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderAnibiplayHome(r.data).join("\n"), "info"));
    }

    if (action === "cari" || action === "search") {
      if (!rest) return m.reply(claraWrap("nonton", "Contoh: .nonton anibiplay cari one piece", "guide"));
      const r = await zelAnimeGet("anibiplay/search", { q: rest });
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("nonton", `❌ Pencarian gagal: ${r.error}`, "error")); }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderAnibiplaySearch(r.data).join("\n"), "info"));
    }

    if (action === "detail") {
      const slug = (args[2] || "").trim();
      if (!slug) return m.reply(claraWrap("nonton", "Contoh: .nonton anibiplay detail one-piece", "guide"));
      const r = await zelAnimeGet(`anibiplay/detail/${encodeURIComponent(slug)}`);
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("nonton", `❌ Detail gagal: ${r.error}`, "error")); }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderAnibiplayDetail(r.data).join("\n"), "info"));
    }

    if (action === "episode" || action === "ep") {
      const slug = (args[2] || "").trim();
      const ep = (args[3] || "").trim();
      if (!slug || !ep) return m.reply(claraWrap("nonton", "Contoh: .nonton anibiplay episode one-piece 1", "guide"));
      const r = await zelAnimeGet("anibiplay/episode", { slug, ep });
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("nonton", `❌ Episode gagal: ${r.error}`, "error")); }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderAnibiplayEpisode(r.data).join("\n"), "info"));
    }

    if (action === "explore" || action === "genre") {
      const genre = (args[2] || "").trim();
      const page = (args[3] || "1").trim();
      const r = await zelAnimeGet("anibiplay/explore", { genre, page });
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("nonton", `❌ Explore gagal: ${r.error}`, "error")); }
      await m.react("🐣");
      return m.reply(claraWrap("nonton", renderAnibiplayExplore(r.data).join("\n"), "info"));
    }

    return m.reply(claraWrap("nonton", `Aksi *${action}* gak dikenal buat anibiplay.\n\n${usageText()}`, "guide"));
  } catch (err) {
    await m.react("❌");
    console.error("[nonton]", err?.message);
    return m.reply(claraWrap("nonton", `❌ *GAGAL: ${err?.message || "error"}*`, "error"));
  }
}

export { pluginConfig as config, handler, _setZelAnimeHttpForTest, _setZelAnimeKeyForTest };
