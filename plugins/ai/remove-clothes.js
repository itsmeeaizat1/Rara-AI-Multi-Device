// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// remove-clothes — NSFW: Remove clothes dari foto (IkyyXD, butuh key khusus)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "remove-clothes",
  alias: ["remove-clothes"],
  category: "nsfw",
  description: "NSFW: Remove clothes dari foto (butuh key khusus)",
  usage: ".remove-clothes (reply/kirim foto)",
  example: ".remove-clothes (reply foto)",
  isOwner: false, isPremium: true, isGroup: false, isPrivate: true,
  cooldown: 60, energi: 10, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";
// Key khusus — dapat dari owner IkyyXD
const RC_KEY = process.env.IKYY_RC_KEY || "";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";

    if (!RC_KEY) {
      return m.reply(claraWrap("Remove Clothes", "Fitur ini butuh key khusus. Hubungi owner untuk setup key."));
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
      return m.reply(claraWrap("Remove Clothes", [
        "NSFW: Remove clothes dari foto",
        "",
        "CARA PAKAI:",
        `${prefix}remove-clothes (reply/kirim foto)`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/remove-clothes`, {
      params: { url: imageUrl, key: RC_KEY },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: claraWrap("Remove Clothes", "Berhasil memproses gambar"),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(claraWrap("Remove Clothes", data?.message || data?.error || "Gagal. Key mungkin tidak valid."));
    }
  } catch (e) {
    console.error("[remove-clothes.js]:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("Remove Clothes", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
