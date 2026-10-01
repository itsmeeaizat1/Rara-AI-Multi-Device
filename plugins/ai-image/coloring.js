// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mewarnai — Warnai foto sketsa otomatis via IkyyXD
import axios from "axios";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mewarnai",
  alias: ["mewarnai"],
  category: "ai image",
  description: "Warnai foto sketsa otomatis",
  usage: ".mewarnai (reply/kirim foto)",
  example: ".mewarnai (reply foto)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

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
      return m.reply(novaWrap("Mewarnai", [
        "Warnai foto sketsa otomatis",
        "",
        "CARA PAKAI:",
        `${prefix}mewarnai (reply/kirim foto)`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/mewarnai`, {
      params: { url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: novaWrap("Mewarnai", "Berhasil: Warnai foto sketsa otomatis"),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaWrap("Mewarnai", data?.error?.message || data?.error || data?.message || "Gagal memproses. Coba foto lain."));
    }
  } catch (e) {
    console.error("[coloring.js]:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("Mewarnai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
