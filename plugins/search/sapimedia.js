// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Media Suite — .gnews .gjobs .gevents .gimages .sapiyts .sapireddit
// 🔹 Berita/lowongan/acara/gambar/video PLAIN TEXT — info lengkap tanpa klik link.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sapiErrorMessage, renderNews, renderJobs, renderEvents, renderImages, renderVideos, renderOrganic } from "../../src/lib/rara-sapi-render.js";

const CMDS = {
  gnews: { engine: "google_news", render: renderNews, label: "BERITA", emoji: "📰", hint: "topik berita", extra: { gl: "id" } },
  gjobs: { engine: "google_jobs", render: renderJobs, label: "LOWONGAN KERJA", emoji: "💼", hint: "posisi kerja" },
  gevents: { engine: "google_events", render: renderEvents, label: "ACARA", emoji: "🎉", hint: "nama acara / kota" },
  gimages: { engine: "google_images", render: renderImages, label: "GAMBAR", emoji: "🖼️", hint: "kata kunci gambar" },
  sapiyts: { engine: "youtube", render: renderVideos, label: "YOUTUBE", emoji: "🎬", hint: "judul video" },
  sapireddit: { engine: "reddit", render: renderOrganic, label: "REDDIT", emoji: "👽", hint: "topik diskusi" },
};

const pluginConfig = {
  name: "sapimedia",
  alias: ["gnews", "gjobs", "gevents", "gimages", "sapiyts", "sapireddit"],
  category: "search",
  description: "Berita, lowongan, acara, gambar, YouTube, Reddit — plain text lengkap",
  usage: ".gnews <topik> | .gjobs <posisi> | .gevents <acara/kota> | .gimages <query> | .sapiyts <judul> | .sapireddit <topik>",
  example: ".gnews teknologi | .gjobs frontend developer | .gimages pemandangan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "gnews").toLowerCase();
    const spec = CMDS[cmd];
    if (!spec) {
      return m.reply(raraWrap("gnews", `💡 Command: .gnews .gjobs .gevents .gimages .sapiyts .sapireddit`));
    }
    const q = (m.args || []).join(" ").trim();
    if (!q) {
      return m.reply(raraWrap("gnews", `${spec.emoji} ${spec.label} — plain text lengkap.\n\nContoh: *.${cmd} ${spec.hint}*`));
    }

    await m.react("🧠");
    const r = await searchApiEngine(spec.engine, { q, ...(spec.extra || {}) });
    if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("gnews", sapiErrorMessage(r.error))); }
    const body = spec.render(r.data);
    if (!body) { await m.react("❌"); return m.reply(raraWrap("gnews", "⚠️ Gak ada hasil — coba kata kunci lain.")); }
    await m.react("🐣");
    return m.reply(raraWrap("gnews", `${spec.emoji} *${spec.label} — ${q.toUpperCase().slice(0, 50)}*\n\n${body}`));
  } catch (err) {
    console.error("[sapimedia]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("gnews", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest };
