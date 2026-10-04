// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// zelbetterwaifu.js — BetterWaifu Image via ZelAPI (NSFW, default DISABLED)
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendImage } from "../../src/lib/rara-message.js";
import { fetchBuffer } from "../../src/lib/rara-utils.js";
import { zelImageEndpoint } from "../../src/scraper/zelapi.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch nsfw) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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
        const card = await dlCard("gambar", { buffer: buf }, [["Engine", "ZelAPI BetterWaifu"], ["Prompt", String(prompt).slice(0, 60)], ["Model", "sdxl-v2"]]);
        await sendImage(sock, m.chat, buf, card ? `_(engine: zelapi betterwaifu)_\n\n${card}` : "_(engine: zelapi betterwaifu)_", { quoted: m });
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
