// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .fixupx — Lihat isi tweet (teks + media + stats) tanpa buka browser.
//    Terima link twitter.com/x.com biasa, auto-convert ke fixupx.com
//    (API zelapi.eu.cc emang wajib format fixupx.com).
// 🔹 STRICT: key kosong / tweet gak ketemu → error asli keluar, no fallback.
// ═════════════════════════════════════════════

import { zelFixupxTweet, _setZelBypassHttpForTest } from "../../src/scraper/zelbypass.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fixupx",
  alias: ["fixupx", "xfix", "tweetfix", "cektweet"],
  category: "tools",
  description: "Lihat isi tweet (teks + media + stats) dari link twitter.com/x.com",
  usage: ".fixupx <link tweet>",
  example: ".fixupx https://x.com/elonmusk/status/123456789",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = (m.args || []).join(" ").trim();

    if (!url) {
      return m.reply(raraWrap("fixupx",
        `🐦 *CEK TWEET*\n\n` +
        `Kirim link tweet (twitter.com / x.com), sistem ambil teks + media + statistiknya.\n\n` +
        `Contoh:\n.fixupx https://x.com/elonmusk/status/123456789`));
    }

    if (!/^https?:\/\//i.test(url)) {
      await m.react("❌");
      return m.reply(raraWrap("fixupx", `❌ *URL TIDAK VALID*\n\nKirim link lengkap (harus diawali http:// atau https://).`));
    }

    await m.react("🧠");
    const r = await zelFixupxTweet(url);

    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ API key zelapi.eu.cc belum di-set — owner isi dulu di apikeys.json (slot zelapi).",
        URL_INVALID: "URL tidak valid.",
      };
      return m.reply(raraWrap("fixupx", `❌ *GAGAL: ${map[r.error] || r.error}*`));
    }

    const stats = [];
    if (typeof r.likes === "number") stats.push(`❤️ ${r.likes}`);
    if (typeof r.retweets === "number") stats.push(`🔁 ${r.retweets}`);
    if (typeof r.replies === "number") stats.push(`💬 ${r.replies}`);
    if (typeof r.views === "number") stats.push(`👁️ ${r.views}`);

    const caption = raraWrap("fixupx",
      `🐦 *${r.name || r.username || "TWEET"}*${r.username ? ` (@${r.username})` : ""}\n\n` +
      `${r.text || "(tanpa teks)"}\n` +
      (stats.length ? `\n${stats.join("  ")}\n` : ""));

    await m.react("🐣");

    if (r.media && r.media.length) {
      const from = m.chat || m.key.remoteJid;
      const first = r.media[0];
      const isVideo = /\.mp4($|\?)/i.test(first);
      await sock.sendMessage(from, isVideo ? { video: { url: first }, caption } : { image: { url: first }, caption }, { quoted: m });
      // media tambahan (kalau ada lebih dari 1) dikirim polos tanpa caption
      for (const extra of r.media.slice(1, 4)) {
        const extraIsVideo = /\.mp4($|\?)/i.test(extra);
        await sock.sendMessage(from, extraIsVideo ? { video: { url: extra } } : { image: { url: extra } });
      }
      return;
    }

    return m.reply(caption);
  } catch (err) {
    console.error("[fixupx]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("fixupx", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setZelBypassHttpForTest };
