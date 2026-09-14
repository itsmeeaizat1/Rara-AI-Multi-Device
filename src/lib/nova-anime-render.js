// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-anime-render.js — renderer defensif buat data /anime/* zelapi.
// FASE 1 (14 Sep 2026): cuma ANIBIPLAY (reliable) + OTAKUDESU (subset
// ongoing/complete yang reliable). animelovers & wotanim SENGAJA DITUNDA
// — upstream mereka lagi sering 403 (anti-bot), request owner "yg work
// dulu, yg 403 akhiran aja [duluin]" — nanti disusul kalau udah stabil.

function truncate(s, n) {
  s = String(s || "").trim();
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

/** anibiplay/home → featured + latestUpdates */
export function renderAnibiplayHome(data) {
  const lines = [];
  const featured = Array.isArray(data.featured) ? data.featured : [];
  const updates = Array.isArray(data.latestUpdates) ? data.latestUpdates : [];
  if (featured.length) {
    lines.push("🌟 Featured:");
    featured.slice(0, 5).forEach((a) => lines.push(`• ${a.title || a.judul || "?"} (${a.slug || "-"})`));
    lines.push("");
  }
  lines.push(`📺 Update Terbaru (${updates.length}):`);
  if (!updates.length) lines.push("(kosong)");
  updates.slice(0, 10).forEach((a, i) => {
    lines.push(`${i + 1}. *${a.title || "?"}*`);
    lines.push(`   🔗 slug: ${a.slug || "-"}`);
  });
  lines.push("");
  lines.push("Detail: .nonton anibiplay detail <slug>");
  return lines;
}

/** anibiplay/search → hasil pencarian */
export function renderAnibiplaySearch(data) {
  const lines = [];
  const results = Array.isArray(data.results) ? data.results : [];
  lines.push(`🔍 Hasil pencarian "${data.query || "?"}" (${data.total ?? results.length}):`);
  if (!results.length) lines.push("(gak ada hasil)");
  results.slice(0, 10).forEach((a, i) => {
    lines.push(`${i + 1}. *${a.title || "?"}* — ${a.type || "?"} | ${a.status || "?"}`);
    lines.push(`   🎭 ${(a.genres || []).slice(0, 4).join(", ") || "N/A"}`);
    lines.push(`   🔗 slug: ${a.slug || "-"}`);
  });
  lines.push("");
  lines.push("Detail: .nonton anibiplay detail <slug>");
  return lines;
}

/** anibiplay/detail/:slug → info lengkap 1 anime */
export function renderAnibiplayDetail(data) {
  const lines = [];
  lines.push(`🎬 *${data.title || "?"}*`);
  lines.push(`📊 Status: ${data.status || "?"} | 🏢 Studio: ${data.studio || "N/A"}`);
  const genres = Array.isArray(data.genres) ? data.genres.map((g) => g.name || g).slice(0, 6).join(", ") : "N/A";
  lines.push(`🎭 Genre: ${genres}`);
  if (data.synopsis) {
    lines.push("");
    lines.push(`📖 ${truncate(data.synopsis, 400)}`);
  }
  lines.push("");
  lines.push(`Episode: .nonton anibiplay episode ${data.slug || "<slug>"} <nomor>`);
  return lines;
}

/** anibiplay/episode → streams + downloads 1 episode */
export function renderAnibiplayEpisode(data) {
  const lines = [];
  lines.push(`▶️ *${data.title || data.anime_title || "?"}*`);
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const downloads = Array.isArray(data.downloads) ? data.downloads : [];
  if (streams.length) {
    lines.push("");
    lines.push(`🖥️ Server streaming (${streams.length}):`);
    streams.slice(0, 8).forEach((s, i) => lines.push(`${i + 1}. ${s.server || s.name || "?"} — ${s.url || s.link || "-"}`));
  } else {
    lines.push("");
    lines.push("🖥️ Server streaming: (kosong — kemungkinan episode belum ada link atau ditakedown sumber)");
  }
  if (downloads.length) {
    lines.push("");
    lines.push(`⬇️ Link download (${downloads.length}):`);
    downloads.slice(0, 8).forEach((d, i) => lines.push(`${i + 1}. ${d.resolution || d.quality || "?"} — ${d.url || d.link || "-"}`));
  }
  if (data.prev_episode) lines.push(`\n⏮️ Episode sebelumnya: ${data.prev_episode}`);
  if (data.next_episode) lines.push(`⏭️ Episode berikutnya: ${data.next_episode}`);
  return lines;
}

/** anibiplay/explore → catalog genre + anime list (opsional filter genre) */
export function renderAnibiplayExplore(data) {
  const lines = [];
  const results = Array.isArray(data.results) ? data.results : [];
  lines.push(`📚 Explore (halaman ${data.page ?? 1}/${data.total_pages ?? "?"}, total ${data.total ?? results.length} anime):`);
  results.slice(0, 12).forEach((a, i) => {
    lines.push(`${i + 1}. *${a.title || "?"}* — ${a.status || "?"}`);
    lines.push(`   🔗 slug: ${a.slug || "-"}`);
  });
  lines.push("");
  lines.push("Genre lain: .nonton anibiplay explore <genre-slug> [halaman]");
  lines.push("Contoh genre: action, comedy, romance, isekai");
  return lines;
}

/** otakudesu ongoing+complete list (satu-satunya action yg reliable) */
export function renderOtakudesuList(data) {
  const lines = [];
  const ongoing = data.ongoing?.list || [];
  const complete = data.complete?.list || [];
  lines.push(`📡 *Otakudesu — Ongoing* (${data.ongoing?.total ?? ongoing.length}):`);
  if (!ongoing.length) lines.push("(kosong)");
  ongoing.slice(0, 8).forEach((a, i) => lines.push(`${i + 1}. ${a.title || "?"} — ${a.episode || "?"} (${a.day || a.type || "?"})`));
  if (complete.length) {
    lines.push("");
    lines.push(`✅ *Otakudesu — Complete* (${data.complete?.total ?? complete.length}):`);
    complete.slice(0, 8).forEach((a, i) => lines.push(`${i + 1}. ${a.title || "?"} — ${a.episode || a.rating || "?"}`));
  }
  lines.push("");
  lines.push("_Catatan: cuma daftar ongoing/complete yang stabil dari otakudesu; action search/detail/genre lain lagi sering diblokir sumbernya._");
  return lines;
}
