// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// flux2pro — Edit gambar dengan AI menggunakan prompt via Flux 2 Pro
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
  name: "flux2pro",
  alias: ["flux2pro"],
  category: "ai image",
  description: "Edit gambar dengan AI menggunakan prompt (Flux 2 Pro engine)",
  usage: ".flux2pro <prompt> (reply/kirim foto)",
  example: ".flux2pro ubah jadi lukisan cat air (reply foto)\n.flux2pro tambahkan kacamata hitam (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 5,
  isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("Flux2Pro", [
        "Edit gambar dengan AI (Flux 2 Pro)",
        "",
        "CARA PAKAI:",
        `${prefix}flux2pro <prompt> (reply/kirim foto)`,
        "",
        "Contoh:",
        `${prefix}flux2pro ubah jadi lukisan cat air (reply foto)`,
        `${prefix}flux2pro tambahkan kacamata hitam (reply foto)`,
      ].join("\n"), "guide"));
    }

    // Cek gambar
    let imageUrl = null;
    if (m.quoted?.message?.imageMessage || m.message?.imageMessage) {
      const imageBuffer = m.quoted?.message?.imageMessage ? await m.quoted.download() : await m.download();
      if (imageBuffer) {
        const FormData = (await import("form-data")).default;
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", imageBuffer, "image.jpg");
        const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          timeout: 30000,
        });
        imageUrl = uploadRes.data?.trim();
      }
    }

    if (!imageUrl) {
      return m.reply(raraWrap("Flux2Pro", "Reply/kirim foto dengan prompt .flux2pro untuk mengedit gambar."));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/flux2pro`, {
      params: { prompt: text, url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result?.result_url) {
      await m.react("🐣");
      const oldCap = raraWrap("Flux2Pro", `Prompt: ${text}`);
      const c = await dlCard("gambar", { url: data.result.result_url }, [["Prompt", text], ["Engine", "Flux 2 Pro"]]);
      await sock.sendMessage(m.chat, {
        image: { url: data.result.result_url },
        caption: c || oldCap,
      }, { quoted: m });
    } else if (data?.status && data?.result) {
      // Some responses might have different structure
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      if (resultUrl) {
        await m.react("🐣");
        const oldCap = raraWrap("Flux2Pro", `Prompt: ${text}`);
        const c = await dlCard("gambar", { url: resultUrl }, [["Prompt", text], ["Engine", "Flux 2 Pro"]]);
        await sock.sendMessage(m.chat, {
          image: { url: resultUrl },
          caption: c || oldCap,
        }, { quoted: m });
      } else {
        await m.react("❌");
        await m.reply(raraWrap("Flux2Pro", "Gagal memproses gambar. Coba prompt atau foto lain."));
      }
    } else {
      await m.react("❌");
      await m.reply(raraWrap("Flux2Pro", data?.error || data?.message || "Gagal memproses. Coba lagi nanti."));
    }
  } catch (e) {
    console.error("[flux2pro.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("Flux2Pro", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
