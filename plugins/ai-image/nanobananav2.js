// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// nanobananav2 — Edit gambar dengan prompt via Gemini Flash (IkyyXD)
// Original /edit/nanobananav2 down (lexcode.biz.id ENOTFOUND), redirected to /edit/gemini-flash
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "nanobananav2",
  alias: ["nanobananav2"],
  category: "ai image",
  description: "Edit gambar dengan prompt via Nano Banana v2 AI",
  usage: ".nanobananav2 <prompt> (reply/kirim foto)",
  example: ".nanobananav2 ubah jadi kartun (reply foto)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 5, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("NanoBanana V2", [
        "Edit gambar dengan prompt via Nano Banana v2",
        "",
        "CARA PAKAI:",
        `${prefix}nanobananav2 <prompt> (reply/kirim foto)`,
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
      return m.reply(raraWrap("NanoBanana V2", "Reply/kirim foto dengan prompt .nanobananav2 untuk mengedit gambar."));
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
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: raraWrap("NanoBanana V2", `Prompt: ${text}`),
      }, { quoted: m });
      await m.reply(mediaInfoCaption({ header: "Rara NanoBanana V2", fields: [
        { label: "Input", value: "Foto" },
        { label: "Prompt", value: text.length > 60 ? text.slice(0, 57) + "..." : text },
        { label: "Engine", value: "Gemini Flash (IkyyXD)" },
        { label: "Hasil", value: "Gambar" },
      ] }));
    } else {
      await m.react("❌");
      await m.reply(raraWrap("NanoBanana V2", data?.error || data?.message || "Gagal memproses. Coba lagi nanti."));
    }
  } catch (e) {
    console.error("[nanobananav2.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("NanoBanana V2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
