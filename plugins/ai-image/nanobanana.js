// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// nanobanana — Edit gambar dengan prompt via Gemini Flash (IkyyXD)
// Original /edit/nanobanana failed all models, redirected to /edit/gemini-flash
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "nanobanana",
  alias: ["nanobanana"],
  category: "ai image",
  description: "Edit gambar dengan prompt via Nano Banana AI",
  usage: ".nanobanana <prompt> (reply/kirim foto)",
  example: ".nanobanana ubah jadi lukisan (reply foto)\n.nanobanana tambahkan kucing (reply foto)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 5, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("NanoBanana", [
        "Edit gambar dengan prompt via Nano Banana AI",
        "",
        "CARA PAKAI:",
        `${prefix}nanobanana <prompt> (reply/kirim foto)`,
        "",
        "Contoh:",
        `${prefix}nanobanana ubah jadi lukisan (reply foto)`,
      ].join("\n"), "guide"));
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
      return m.reply(raraWrap("NanoBanana", "Reply/kirim foto dengan prompt .nanobanana untuk mengedit gambar."));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/gemini-flash`, {
      params: { prompt: text, url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      const c = await dlCard("gambar", { url: resultUrl }, [["Prompt", String(text).slice(0, 40)], ["Input", "Foto (reply)"], ["Engine", "Gemini Flash Edit (ikyy)"]]);
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: c || raraWrap("NanoBanana", `Prompt: ${text}`),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("NanoBanana", data?.error || data?.message || "Gagal memproses. Coba foto/prompt lain."));
    }
  } catch (e) {
    console.error("[nanobanana.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("NanoBanana", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
