// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .bypass — Bypass shortlink monetisasi (Linkvertise/ShrinkMe/Bicolink/
//    BypassCity/Just2Earn/Tutwuri) via zelapi.eu.cc kategori Bypass.
//    Auto-detect provider dari host URL, gak perlu user sebut nama provider.
// 🔹 STRICT: key kosong / endpoint mati → error asli keluar, no fallback.
//    .ouo SENGAJA GAK DIPASANG — server zelapi genuinely bug ("browserService
//    is not defined") diverifikasi live 2x dgn link real berbeda.
// ═════════════════════════════════════════════

import { zelBypassLink, detectBypassProvider, BYPASS_PROVIDERS, _setZelBypassHttpForTest } from "../../src/scraper/zelbypass.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bypass",
  alias: ["bypass", "bypasslink", "skiplink"],
  category: "tools",
  description: "Bypass shortlink monetisasi (Linkvertise/ShrinkMe/Bicolink/dll) → link tujuan asli",
  usage: ".bypass <url>",
  example: ".bypass https://linkvertise.com/123456/judul",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m) {
  try {
    const url = (m.args || []).join(" ").trim();

    if (!url) {
      const supported = Object.values(BYPASS_PROVIDERS).map((p) => `• ${p.label} (${p.hosts[0]})`).join("\n");
      return m.reply(claraWrap("bypass",
        `🔓 *BYPASS SHORTLINK*\n\n` +
        `Kirim link shortlink monetisasi, sistem otomatis deteksi provider & kasih link tujuan asli.\n\n` +
        `Provider didukung:\n${supported}\n\n` +
        `Contoh:\n.bypass https://linkvertise.com/123456/judul`));
    }

    if (!/^https?:\/\//i.test(url)) {
      await m.react("❌");
      return m.reply(claraWrap("bypass", `❌ *URL TIDAK VALID*\n\nKirim link lengkap (harus diawali http:// atau https://).`));
    }

    const providerKey = detectBypassProvider(url);
    if (!providerKey) {
      const supported = Object.values(BYPASS_PROVIDERS).map((p) => `• ${p.hosts[0]}`).join("\n");
      await m.react("❌");
      return m.reply(claraWrap("bypass",
        `❌ *PROVIDER GAK DIKENALI*\n\nLink ini bukan dari provider yang didukung.\n\nProvider didukung:\n${supported}`));
    }

    await m.react("🧠");
    const r = await zelBypassLink(providerKey, url);

    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ API key zelapi.eu.cc belum di-set — owner isi dulu di apikeys.json (slot zelapi).",
        URL_INVALID: "URL tidak valid.",
      };
      return m.reply(claraWrap("bypass", `❌ *GAGAL BYPASS: ${map[r.error] || r.error}*`));
    }

    await m.react("🐣");
    return m.reply(claraWrap("bypass",
      `🔓 *BYPASS BERHASIL*\n\n` +
      `Provider: ${r.provider}\n` +
      `Link asal: ${url}\n\n` +
      `🔗 *LINK TUJUAN:*\n${r.destination}`));
  } catch (err) {
    console.error("[bypass]", err.message);
    await m.react("❌");
    return m.reply(claraWrap("bypass", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setZelBypassHttpForTest };
