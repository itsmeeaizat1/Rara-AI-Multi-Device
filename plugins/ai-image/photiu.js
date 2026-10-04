// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// photiu — Generate gambar dari teks via GPT Image (IkyyXD)
// Original /ai/photiu down, redirected to /ai/gptimage
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "photiu",
  alias: ["photiu"],
  category: "ai image",
  description: "Generate gambar dari teks via Photiu AI",
  usage: ".photiu <prompt>",
  example: ".photiu kucing astronot di bulan\n.photiu pemandangan kota futuristik",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("Photiu", [
        "Generate gambar dari teks via Photiu AI",
        "",
        "CARA PAKAI:",
        `${prefix}photiu <prompt>`,
        "",
        "Contoh:",
        `${prefix}photiu kucing astronot di bulan`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    // gptimage returns binary JPEG directly
    const res = await axios.get(`${IKYY_BASE}/ai/gptimage`, {
      params: { text },
      timeout: 120000,
      responseType: "arraybuffer",
    });

    const contentType = res.headers["content-type"] || "";
    if (contentType.includes("image") || res.data?.length > 1000) {
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: Buffer.from(res.data),
        caption: raraWrap("Photiu", `Prompt: ${text}`),
      }, { quoted: m });
    } else {
      try {
        const errData = JSON.parse(res.data.toString());
        await m.react("❌");
        await m.reply(raraWrap("Photiu", errData?.error || errData?.message || "Gagal generate gambar."));
      } catch {
        await m.react("❌");
        await m.reply(raraWrap("Photiu", "Gagal generate gambar. Coba prompt lain."));
      }
    }
  } catch (e) {
    console.error("[photiu.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("Photiu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
