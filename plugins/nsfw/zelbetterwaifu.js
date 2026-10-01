// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// zelbetterwaifu.js — BetterWaifu Image via ZelAPI (NSFW, default DISABLED)
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendImage } from "../../src/lib/rara-message.js";
import { fetchBuffer } from "../../src/lib/rara-utils.js";
import { zelImageEndpoint } from "../../src/scraper/zelapi.js";

// seam test: mock unduh gambar
let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "zbetterwaifu",
  alias: ["zbwaifu"],
  category: "nsfw",
  description: "BetterWaifu Image generator via ZelAPI (NSFW — default nonaktif)",
  usage: ".zbetterwaifu <prompt>",
  example: ".zbetterwaifu waifu catgirl",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3,
  isEnabled: false, // NSFW: nonaktif sampai diaktifkan owner lewat kode
};

async function handler(m, { sock }) {
  try {
    const prompt = (m.args || []).join(" ").trim();
    if (!prompt) {
      return m.reply(raraWrap("zbetterwaifu", "🎨 *zbetterwaifu* — BetterWaifu Image Generator via ZelAPI (NSFW)\n\n⚠️ Fitur NSFW — default nonaktif (isEnabled: false di plugin), aktifin lewat kode kalau mau.\n\nContoh: *.zbetterwaifu waifu catgirl*"));
    }
    await m.react("🧠");
    const r = await zelImageEndpoint("ai-image/betterwaifu", prompt, {
      textParam: "prompt",
      extra: { model: "sdxl-v2", batch: "1" },
    });
    if (!r.ok) {
      await m.react("❌");
      return m.reply(te("zbetterwaifu", `*ZBETTERWAIFU MATI:* ${r.error}`));
    }
    let sent = 0;
    for (const u of (r.images || []).slice(0, 2)) {
      try {
        const buf = await getBuf(u);
        if (!buf || buf.length < 1000) continue;
        await sendImage(sock, m.chat, buf, "_(engine: zelapi betterwaifu)_", { quoted: m });
        sent++;
      } catch {}
    }
    if (!sent) {
      await m.react("❌");
      return m.reply(te("zbetterwaifu", "gambar gagal diunduh dari server zelapi"));
    }
    await m.react("🐣");
  } catch (err) {
    await m.react("❌");
    return m.reply(te("zbetterwaifu", err.message || "gagal"));
  }
}

export { pluginConfig as config, handler };
