// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Riset Suite — .scholar .gbooks .gpatents .gfinance .ytranscript
// 🔹 Jurnal/buku/paten/saham/transkrip PLAIN TEXT lengkap.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sapiErrorMessage, renderScholar, renderBooks, renderPatents, renderFinance, renderTranscript } from "../../src/lib/nova-sapi-render.js";

const pluginConfig = {
  name: "sapiriset",
  alias: ["scholar", "gbooks", "gpatents", "gfinance", "ytranscript"],
  category: "search",
  description: "Riset plain text — jurnal, buku, paten, saham, transkrip YouTube",
  usage: ".scholar <topik> | .gbooks <judul> | .gpatents <teknologi> | .gfinance <ticker> | .ytranscript <url/id video>",
  example: ".scholar machine learning | .gfinance AAPL",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

function extractVideoId(q) {
  // URL youtube → id
  const mU = /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(q);
  if (mU) return mU[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(q.trim())) return q.trim();
  return null;
}

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "scholar").toLowerCase();
    const q = (m.args || []).join(" ").trim();

    if (!q) {
      const usage = cmd === "scholar" ? "📄 Jurnal ilmiah.\n\nContoh: *.scholar machine learning*"
        : cmd === "gbooks" ? "📕 Buku: judul, penulis, tahun.\n\nContoh: *.gbooks laskar pelangi*"
        : cmd === "gpatents" ? "🧪 Paten: judul, nomor, pemilik.\n\nContoh: *.gpatents battery technology*"
        : cmd === "gfinance" ? "📈 Saham: harga, perubahan, kapitalisasi.\n\nContoh: *.gfinance AAPL* atau .gfinance BBCA"
        : "🎬 Transkrip video YouTube jadi teks utuh.\n\nContoh: *.ytranscript https://youtube.com/watch?v=xxxx*";
      return m.reply(claraWrap("scholar", usage));
    }

    await m.react("🧠");

    if (cmd === "ytranscript") {
      const vid = extractVideoId(q);
      if (!vid) {
        await m.react("❌");
        return m.reply(claraWrap("scholar", "⚠️ Kirim URL video YouTube atau ID video (11 karakter).\n\nContoh: .ytranscript https://youtube.com/watch?v=dQw4w9WgXcQ"));
      }
      const r = await searchApiEngine("youtube_transcripts", { video_id: vid });
      if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("scholar", sapiErrorMessage(r.error))); }
      const body = renderTranscript(r.data);
      if (!body) { await m.react("❌"); return m.reply(claraWrap("scholar", "⚠️ Transkrip gak tersedia buat video itu (mungkin gak ada subtitle).")); }
      await m.react("🐣");
      return m.reply(claraWrap("scholar", `🎬 *TRANSKRIP VIDEO (${vid})*\n\n${body}`));
    }

    let engine, render, label;
    if (cmd === "scholar") { engine = "google_scholar"; render = renderScholar; label = "📄 JURNAL ILMIAH"; }
    else if (cmd === "gbooks") { engine = "google_books"; render = renderBooks; label = "📕 BUKU"; }
    else if (cmd === "gpatents") { engine = "google_patents"; render = renderPatents; label = "🧪 PATEN"; }
    else { engine = "google_finance"; render = renderFinance; label = "📈 KEUANGAN"; }

    const params = engine === "google_finance" ? { q } : { q };
    const r = await searchApiEngine(engine, params);
    if (!r.ok) { await m.react("❌"); return m.reply(claraWrap("scholar", sapiErrorMessage(r.error))); }
    const body = render(r.data);
    if (!body) { await m.react("❌"); return m.reply(claraWrap("scholar", "⚠️ Gak ada hasil — coba kata kunci lain.")); }
    await m.react("🐣");
    return m.reply(claraWrap("scholar", `${label} — ${q.toUpperCase().slice(0, 50)}\n\n${body}`));
  } catch (err) {
    console.error("[sapiriset]", err.message);
    await m.react("❌");
    return m.reply(claraWrap("scholar", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest };
