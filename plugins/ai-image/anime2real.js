// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// anime2real — Ubah gambar anime jadi realistik via IkyyXD API
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "anime2real",
  alias: ["anime2real"],
  category: "ai image",
  description: "Ubah gambar anime menjadi versi realistik",
  usage: ".anime2real (reply/kirim foto anime)",
  example: ".anime2real (reply foto anime)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    let imageUrl = null;

    // Cek apakah ada gambar di reply atau di pesan ini
    if (m.quoted?.message?.imageMessage || m.message?.imageMessage) {
      const msg = m.quoted?.message || m.message;
      const imageBuffer = await m.quoted?.download?.() || await m.download?.();
      if (!imageBuffer) {
        return m.reply(raraWrap("Anime2Real", "Gagal mengunduh gambar. Coba kirim ulang."));
      }
      // Upload ke Catbox untuk dapat URL
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

    if (!imageUrl) {
      return m.reply(raraWrap("Anime2Real", [
        "Ubah gambar anime menjadi versi realistik",
        "",
        "CARA PAKAI:",
        `${prefix}anime2real (reply/kirim foto anime)`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/anime2real`, {
      params: { url: imageUrl },
      timeout: 60000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: raraWrap("Anime2Real", "Berhasil mengubah anime menjadi realistik"),
      }, { quoted: m });
      await m.reply(mediaInfoCaption({ header: "Rara Anime2Real", fields: [
        { label: "Input", value: "Foto Anime" },

        { label: "Hasil", value: "Gambar Realistik" },
      ] }));
    } else {
      await m.react("❌");
      await m.reply(raraWrap("Anime2Real", data?.error || data?.message || "Gagal memproses gambar. Coba gambar lain."));
    }
  } catch (e) {
    console.error("[anime2real.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("Anime2Real", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
