// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// jadianime — Ubah foto menjadi gaya anime via Gemini Flash (IkyyXD)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "jadianime",
  alias: ["jadianime"],
  category: "ai image",
  description: "Ubah foto menjadi gaya anime",
  usage: ".jadianime (reply/kirim foto)",
  example: ".jadianime (reply foto wajah)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";
const PROMPT = "Transform this photo into anime style. Keep the face structure but make it look like a Japanese anime character with big expressive eyes, smooth shading, and vibrant colors.";

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
      return m.reply(claraWrap("JadiAnime", [
        "Ubah foto menjadi gaya anime",
        "",
        "CARA PAKAI:",
        `${prefix}jadianime (reply/kirim foto)`,
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
        caption: claraWrap("JadiAnime", "Berhasil mengubah foto ke gaya anime"),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(claraWrap("JadiAnime", data?.error || data?.message || "Gagal memproses. Coba foto lain."));
    }
  } catch (e) {
    console.error("[becomeanime.js]:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("JadiAnime", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
