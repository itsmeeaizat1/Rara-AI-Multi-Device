// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 ZelAI Chat 1 — suite .z dari zelapi.eu.cc
// 🔹 Semua AI command prefix "z" biar kelihatan asal zelapi.
// 🔹 STRICT SATUAN: endpoint mati → error asli, gak nyolong fallback.
// ═════════════════════════════════════════════

import { zelAiChat, _setZelHttpForTest, _setZelKeyForTest } from "../../src/scraper/zelapi.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import { sendImage } from "../../src/lib/rara-message.js";
import { fetchBuffer } from "../../src/lib/rara-utils.js";

// seam test: mock unduh gambar
let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "zelaichat1",
  alias: ["zaiw3", "zallen", "zandisearch", "zaskme", "zatomesus", "zazbry", "zbaidu", "zbible", "zcandy", "zchatbox", "zchatday", "zchatdeep", "zchateverywhere", "zchatgpt", "zchatterbox", "zchattide", "zcici", "zclaude", "zcloudai", "zcopilot", "zdeepai", "zdeepseek", "zdegreeguru", "zdiffusiongemma", "zduckai", "zelin", "zepsilon", "zfeelbetterbot"],
  category: "ai",
  description: "AI chat A-F (zaiw3 s/d zfeelbetterbot) — AI zelapi.eu.cc (prefix z)",
  usage: ".<command> <pesan> — daftar: .zel list",
  example: ".zchatgpt siapa presiden indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "").toLowerCase();
    const text = (m.args || []).join(" ").trim();

    if (!text) return m.reply(raraGuide("zelaichat1", {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "AI zelapi jawab apa aja, reply foto juga bisa mode vision! (ᵔ◡ᵔ)",
      cara: "ketik pertanyaannya sesudah command" + (m.quoted?.isImage ? " (atau reply foto + pertanyaan, mode vision)" : ""),
      contoh: `.${cmd} siapa presiden indonesia`,
      spec: ["⚡ energi 1", "⏱ 15dtk", "💸 gratis"],
    }));

    await m.react("🧠");

    // mode vision: reply foto + pertanyaan → upload uguu
    let imageUrl;
    if (m.quoted?.isImage) {
      try {
        const buf = await m.quoted.download();
        const form = new FormData();
        form.append("files[]", new Blob([buf]), "img.jpg");
        const up = await fetch("https://uguu.se/upload", { method: "POST", body: form });
        const j = await up.json();
        imageUrl = j?.files?.[0]?.url;
      } catch {}
      if (!imageUrl) {
        await m.react("❌");
        return m.reply(raraWrap("zelai", "⚠️ Gagal upload foto — coba kirim ulang."));
      }
    }

    const r = await zelAiChat(cmd, text, { imageUrl });
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ Key zelapi belum di-set — owner isi apikeys.json slot *zelapi*.",
        VISION_NOIMAGE: "⚠️ AI ini mode vision — reply foto + pertanyaan.\n\nContoh: reply foto terus ketik *.${cmd} ini gambar apa*",
        TEXT_KOSONG: "⚠️ Pesan kosong.",
      };
      return m.reply(raraWrap("zelai", map[r.error] || `⚠️ *${cmd.toUpperCase()} MATI:* ${r.error}`));
    }
    await m.react("🐣");
    if (r.images?.length) {
      // AI balikin gambar juga (misal zcici) → kirim teks dulu, gambar nyusul
      await m.reply(raraWrap("zelai", `⚡ *${cmd.toUpperCase()} (ZELAPI)*\n\n${r.text.slice(0, 3800)}`));
      for (const u of r.images.slice(0, 2)) {
        try { await sendImage(sock, m.chat, await getBuf(u), "", { quoted: m }); } catch {}
      }
      return;
    }
    return m.reply(raraWrap("zelai", `⚡ *${cmd.toUpperCase()} (ZELAPI)*\n\n${r.text.slice(0, 3800)}`));
  } catch (err) {
    console.error("[zelaichat]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("zelai", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setZelHttpForTest, _setZelKeyForTest };
