// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// remove-clothesv2 — NSFW: Remove clothes v2 dari foto (IkyyXD, butuh key khusus)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
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

const pluginConfig = {
  name: "remove-clothesv2",
  alias: ["remove-clothesv2"],
  category: "nsfw",
  description: "NSFW: Remove clothes v2 dari foto (butuh key khusus)",
  usage: ".remove-clothesv2 (reply/kirim foto)",
  example: ".remove-clothesv2 (reply foto)",
  isOwner: false, isPremium: true, isGroup: false, isPrivate: true,
  cooldown: 60, energi: 10,
  isEnabled: false, // NSFW NCII risk: strip foto orang asli tanpa persetujuan — dinonaktifkan permanen 14 Sep 2026, jangan diaktifkan lagi
};

const IKYY_BASE = "https://api.ikyyxd.my.id";
const RC_KEY = process.env.IKYY_RC_KEY || "";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";

    if (!RC_KEY) {
      return m.reply(raraWrap("Remove Clothes V2", "Fitur ini butuh key khusus. Hubungi owner untuk setup key."));
    }

    let imageUrl = null;
    if (m.quoted?.message?.imageMessage || m.message?.imageMessage) {
      const imageBuffer = m.quoted?.message?.imageMessage ? await m.quoted.download() : await m.download();
      if (imageBuffer) {
        const FormData = (await import("form-data")).default;
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", imageBuffer, "image.jpg");
        const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
          headers: form.getHeaders(), maxContentLength: Infinity, timeout: 30000,
        });
        imageUrl = uploadRes.data?.trim();
      }
    }

    if (!imageUrl) {
      return m.reply(raraWrap("Remove Clothes V2", [
        "NSFW: Remove clothes v2 dari foto",
        "",
        "CARA PAKAI:",
        `${prefix}remove-clothesv2 (reply/kirim foto)`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/remove-clothesv2`, {
      params: { url: imageUrl, key: RC_KEY },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      const rcCap = raraWrap("Remove Clothes V2", "Berhasil memproses gambar");
      const card = await dlCard("gambar", { url: resultUrl }, [["Engine", "API ikyyxd"], ["Mode", "remove-clothesv2"]]);
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: card ? `${rcCap}\n\n${card}` : rcCap,
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("Remove Clothes V2", data?.message || data?.error || "Gagal. Key mungkin tidak valid."));
    }
  } catch (e) {
    console.error("[remove-clothesv2.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("Remove Clothes V2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
