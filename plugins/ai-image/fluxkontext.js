// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// fluxkontext — Edit gambar dengan AI menggunakan prompt via Flux Kontext
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
  name: "fluxkontext",
  alias: ["fluxkontext"],
  category: "ai image",
  description: "Edit gambar dengan AI menggunakan prompt (Flux Kontext engine)",
  usage: ".fluxkontext <prompt> (reply/kirim foto)",
  example: ".fluxkontext ubah background jadi pantai (reply foto)\n.fluxkontext ganti baju jadi jas (reply foto)",
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
      return m.reply(raraWrap("FluxKontext", [
        "Edit gambar dengan AI (Flux Kontext)",
        "",
        "CARA PAKAI:",
        `${prefix}fluxkontext <prompt> (reply/kirim foto)`,
        "",
        "Contoh:",
        `${prefix}fluxkontext ubah background jadi pantai (reply foto)`,
        `${prefix}fluxkontext ganti baju jadi jas (reply foto)`,
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
      return m.reply(raraWrap("FluxKontext", "Reply/kirim foto dengan prompt .fluxkontext untuk mengedit gambar."));
    }

    await m.react("🕒");

    // Flux Kontext memproses async, mungkin perlu polling
    const res = await axios.get(`${IKYY_BASE}/edit/fluxkontext`, {
      params: { prompt: text, url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;

    // Cek berbagai format respons
    let resultUrl = null;

    if (data?.status && data?.result) {
      // Format 1: result ada URL langsung
      if (typeof data.result === "string") {
        resultUrl = data.result;
      }
      // Format 2: result.result_url
      else if (data.result?.result_url) {
        resultUrl = data.result.result_url;
      }
      // Format 3: result ada job_id, perlu polling
      else if (data.result?.job_id || data.result?.task_id) {
        // Coba poll job status
        const jobId = data.result.job_id || data.result.task_id;
        let attempts = 0;
        while (attempts < 5) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const pollRes = await axios.get(`${IKYY_BASE}/edit/fluxkontext/status`, {
              params: { job_id: jobId },
              timeout: 30000,
            });
            if (pollRes.data?.status && pollRes.data?.result?.result_url) {
              resultUrl = pollRes.data.result.result_url;
              break;
            }
            if (pollRes.data?.result?.status === "completed" || pollRes.data?.result?.status === 2) {
              resultUrl = pollRes.data?.result?.result_url || pollRes.data?.result?.url;
              break;
            }
          } catch (pollErr) {
            console.error("[fluxkontext.js] poll error:", pollErr.message);
          }
          attempts++;
        }

        // Jika polling tidak dapat URL, coba pakai input_url sebagai fallback
        if (!resultUrl && data.result?.input_url) {
          await m.react("❌");
          return m.reply(raraWrap("FluxKontext", "Gambar sedang diproses tapi belum selesai. Coba lagi dalam beberapa detik."));
        }
      }
    }

    if (resultUrl) {
      await m.react("🐣");
      const oldCap = raraWrap("FluxKontext", `Prompt: ${text}`);
      const c = await dlCard("gambar", { url: resultUrl }, [["Prompt", text], ["Engine", "Flux Kontext"]]);
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: c || oldCap,
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("FluxKontext", data?.error || data?.message || data?.result?.message || "Gagal memproses. Coba lagi nanti."));
    }
  } catch (e) {
    console.error("[fluxkontext.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("FluxKontext", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
