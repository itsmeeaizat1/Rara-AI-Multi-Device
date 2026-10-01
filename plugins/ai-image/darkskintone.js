// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// jadihitam — Ubah skin tone lebih gelap via Gemini Flash (IkyyXD)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "jadihitam",
  alias: ["jadihitam"],
  category: "ai image",
  description: "Ubah skin tone menjadi lebih gelap",
  usage: ".jadihitam (reply/kirim foto)",
  example: ".jadihitam (reply foto)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";
const PROMPT = "Transform the skin tone of the person in this photo to a darker complexion. Maintain all facial features, realistic shadows, natural skin texture, and no distortion.";

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
      return m.reply(raraWrap("JadiHitam", [
        "Ubah skin tone menjadi lebih gelap",
        "",
        "CARA PAKAI:",
        `${prefix}jadihitam (reply/kirim foto)`,
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
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: raraWrap("JadiHitam", "Berhasil mengubah skin tone"),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("JadiHitam", data?.error || data?.message || "Gagal memproses. Coba foto lain."));
    }
  } catch (e) {
    console.error("[darkskintone.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("JadiHitam", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
