// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// faceswap — Tukar wajah antara dua foto via IkyyXD API
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "faceswap",
  alias: ["faceswap"],
  category: "ai image",
  description: "Tukar wajah antara dua foto",
  usage: ".faceswap (reply foto pertama) lalu kirim foto kedua",
  example: ".faceswap (reply foto target, lalu kirim foto sumber wajah)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 5,
  isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function uploadToCatbox(buffer) {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, "image.jpg");
  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    timeout: 30000,
  });
  return res.data?.trim();
}

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";

    // Cek apakah ada 2 gambar: satu di reply, satu di pesan ini
    let url1 = null, url2 = null;
    const hasReplyImage = m.quoted?.message?.imageMessage;
    const hasThisImage = m.message?.imageMessage;

    if (!hasReplyImage && !hasThisImage) {
      return m.reply(raraWrap("FaceSwap", [
        "Tukar wajah antara dua foto",
        "",
        "CARA PAKAI:",
        `${prefix}faceswap (reply foto target, lalu kirim foto sumber wajah)`,
        "",
        "Atau kirim 2 foto sekaligus dengan caption .faceswap",
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    // Download & upload foto target (yang di-reply)
    if (hasReplyImage) {
      const buf = await m.quoted.download();
      url1 = await uploadToCatbox(buf);
    }

    // Download & upload foto sumber (yang di-kirim)
    if (hasThisImage) {
      const buf = await m.download();
      url2 = await uploadToCatbox(buf);
    }

    // Jika hanya ada 1 foto, minta foto kedua
    if (!url1 || !url2) {
      await m.react("❌");
      return m.reply(raraWrap("FaceSwap", "Butuh 2 foto! Reply foto pertama, lalu kirim foto kedua dengan .faceswap"));
    }

    const res = await axios.get(`${IKYY_BASE}/edit/faceswap`, {
      params: { url1, url2 },
      timeout: 60000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: raraWrap("FaceSwap", "Berhasil menukar wajah!"),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraWrap("FaceSwap", data?.error || data?.message || "Gagal memproses face swap. Pastikan kedua foto jelas."));
    }
  } catch (e) {
    console.error("[faceswap.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("FaceSwap", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
