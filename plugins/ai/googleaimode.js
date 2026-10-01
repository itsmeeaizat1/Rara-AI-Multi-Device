// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Google AI Mode — .googleaimode
// 🔹 Jawaban AI Mode Google (udm=50) via searchapi.io + sumber riset.
// 🔹 Mode: teks biasa ATAU reply foto + pertanyaan (visual AI mode).
// 🔹 STRICT SATUAN (owner 14 Sep): key kosong/expired/kuota habis →
//   pesan error asli, TANPA fallback ke AI lain.
// ═════════════════════════════════════════════

import { googleAiModeSearch, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";
import { uploadToUguu } from "../../src/scraper/kuroneko.js";

// seam buat e2e: upload gambar bisa di-mock
let _uguuFn = null;
function _setUguuForTest(fn) { _uguuFn = fn; }

const pluginConfig = {
  name: "googleaimode",
  alias: ["googleaimode", "aimode", "gaimode", "googleai"],
  category: "ai",
  description: "Google AI Mode — jawaban AI Google + sumber (via searchapi.io)",
  usage: ".googleaimode <pertanyaan>\nreply foto + .googleaimode <pertanyaan> (mode visual)",
  example: ".googleaimode siapa presiden indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const q = (m.args || []).join(" ").trim();
    const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;

    if (!q && !isPhoto) {
      return m.reply(raraGuideV2("googleaimode", {
 kaomoji: "(◍•ᴗ•◍)",
 sapaan: "tanya apa aja — dijawab AI Mode Google + link sumber riset real-time! (◕ᴗ◕)",
        cara: "ketik pertanyaannya sesudah command, atau reply foto + command",
        contoh: `${m.prefix}googleaimode siapa presiden indonesia`,
        note: "jawaban lengkap + sumber google, agak lama dikit",
        spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
      }));
    }

    await m.react("🧠");

    // Mode visual: reply foto → upload ke hoster publik → param url
    let imageUrl = "";
    if (isPhoto) {
      try {
        const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
        if (!buffer) throw new Error("buffer kosong");
        imageUrl = _uguuFn ? await _uguuFn(buffer) : await uploadToUguu(buffer, "aimode.jpg");
      } catch (imgErr) {
        await m.react("❌");
        return m.reply(raraWrap("googleaimode",
          `⚠️ Gagal upload foto buat mode visual (${imgErr?.message || "error"}). Kirim ulang fotonya, atau tanya pakai teks doang.`));
      }
    }

    const r = await googleAiModeSearch(q, { imageUrl });
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ API key searchapi.io belum di-set — owner isi dulu di apikeys.json (slot searchapi). Daftar gratis di searchapi.io (free trial ±100 request/bulan).",
      };
      return m.reply(raraWrap("googleaimode",
        `❌ *GAGAL: ${map[r.error] || r.error}*`));
    }

    // sumber: max 6, domain singkat
    const srcs = (r.sources || []).slice(0, 6).map((s) => {
      let host = s.link;
      try { host = new URL(s.link).hostname.replace(/^www\./, ""); } catch {}
      const label = s.title ? `${s.title.slice(0, 40)}` : host;
      return `🔗 ${label}\n   ${s.link}`;
    }).join("\n");

    const followups = (r.followups || []).map((f, i) => `${i + 1}. ${f}`).join("\n");

    await m.react("🐣");
    return m.reply(raraWrap("googleaimode",
      `🔍 *AI MODE GOOGLE — ${(q || "ANALISIS GAMBAR").toUpperCase().slice(0, 60)}*\n\n` +
      `${r.answer}\n` +
      (srcs ? `\n📚 *SUMBER:*\n${srcs}\n` : "") +
      (followups ? `\n💡 *TANYA LAGI:*\n${followups}\n` : "") +
      `─\n⚡ Via Google AI Mode (searchapi.io)${r.took ? ` — ${(r.took || 0).toFixed ? r.took.toFixed(1) : r.took}s` : ""}`));
  } catch (err) {
    console.error("[googleaimode]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("googleaimode", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest, _setUguuForTest };
