// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// jadihijab — Tambahkan hijab ke foto via Gemini Flash (IkyyXD)
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
  name: "jadihijab",
  alias: ["jadihijab"],
  category: "ai image",
  description: "Tambahkan hijab ke foto",
  usage: ".jadihijab (reply/kirim foto)",
  example: ".jadihijab (reply foto wajah)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";
const PROMPT = "Add a hijab (Islamic headscarf) to the person in this photo. Make it look natural, covering the hair properly while keeping the face visible. Use a neutral or elegant color.";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
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
      return m.reply(raraWrap("JadiHijab", [
        "Tambahkan hijab ke foto",
        "",
        "CARA PAKAI:",
        `${prefix}jadihijab (reply/kirim foto)`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/gemini-flash`, {
      params: { prompt: PROMPT, url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      const oldCap = raraWrap("JadiHijab", "Berhasil menambahkan hijab");
      const c = await dlCard("gambar", { url: resultUrl }, [["Mode", "Jadi Hijab"], ["Input", "Foto (reply)"], ["Engine", "Gemini Flash Edit (ikyy)"]]);
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: c || oldCap,
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("JadiHijab", data?.error || data?.message || "Gagal memproses. Coba foto lain."));
    }
  } catch (e) {
    console.error("[becomehijab.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("JadiHijab", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
