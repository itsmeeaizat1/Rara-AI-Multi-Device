// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// flux2pro — Edit gambar dengan AI menggunakan prompt via Flux 2 Pro
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

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
      return m.reply(claraWrap("Flux2Pro", [
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
      return m.reply(claraWrap("Flux2Pro", "Reply/kirim foto dengan prompt .flux2pro untuk mengedit gambar."));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/edit/flux2pro`, {
      params: { prompt: text, url: imageUrl },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result?.result_url) {
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: data.result.result_url },
        caption: claraWrap("Flux2Pro", `Prompt: ${text}`),
      }, { quoted: m });
    } else if (data?.status && data?.result) {
      // Some responses might have different structure
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      if (resultUrl) {
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
          image: { url: resultUrl },
          caption: claraWrap("Flux2Pro", `Prompt: ${text}`),
        }, { quoted: m });
      } else {
        await m.react("❌");
        await m.reply(claraWrap("Flux2Pro", "Gagal memproses gambar. Coba prompt atau foto lain."));
      }
    } else {
      await m.react("❌");
      await m.reply(claraWrap("Flux2Pro", data?.error || data?.message || "Gagal memproses. Coba lagi nanti."));
    }
  } catch (e) {
    console.error("[flux2pro.js]:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("Flux2Pro", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
