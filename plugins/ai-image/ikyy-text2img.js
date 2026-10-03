// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ikyy-text2img — Generate gambar dari teks via GPT Image (IkyyXD)
// Original /ai/text2img down (text2video.aritek.app ENOTFOUND), redirected to /ai/gptimage
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "ikyy-text2img",
  alias: ["ikyy-text2img"],
  category: "ai image",
  description: "Generate gambar dari teks via IkyyXD Text2Img",
  usage: ".ikyy-text2img <prompt>",
  example: ".ikyy-text2img kucing lucu bermain di taman\n.ikyy-text2img pemandangan gunung bersalju",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("Ikyy Text2Img", [
        "Generate gambar dari teks via IkyyXD",
        "",
        "CARA PAKAI:",
        `${prefix}ikyy-text2img <prompt>`,
        "",
        "Contoh:",
        `${prefix}ikyy-text2img kucing lucu bermain di taman`,
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
        caption: raraWrap("Ikyy Text2Img", `Prompt: ${text}`),
      }, { quoted: m });
      await m.reply(mediaInfoCaption({ header: "Rara Text2Img", fields: [
        { label: "Input", value: "Teks" },
        { label: "Prompt", value: text.length > 60 ? text.slice(0, 57) + "..." : text },
        { label: "Engine", value: "GPT Image (IkyyXD)" },
        { label: "Hasil", value: "Gambar" },
      ] }));
    } else {
      try {
        const errData = JSON.parse(res.data.toString());
        await m.react("❌");
        await m.reply(raraWrap("Ikyy Text2Img", errData?.error || errData?.message || "Gagal generate gambar."));
      } catch {
        await m.react("❌");
        await m.reply(raraWrap("Ikyy Text2Img", "Gagal generate gambar. Coba lagi nanti."));
      }
    }
  } catch (e) {
    console.error("[ikyy-text2img.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("Ikyy Text2Img", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
