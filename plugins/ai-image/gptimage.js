// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gptimage — Generate gambar dari teks via GPT Image (IkyyXD)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "gptimage",
  alias: ["gptimage"],
  category: "ai image",
  description: "Generate gambar dari teks via GPT Image AI",
  usage: ".gptimage <prompt>",
  example: ".gptimage kucing lucu pakai kacamata\n.gptimage pemandangan pegunungan saat senja",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(raraWrap("GPT Image", [
        "Generate gambar dari teks via GPT Image AI",
        "",
        "CARA PAKAI:",
        `${prefix}gptimage <prompt>`,
        "",
        "Contoh:",
        `${prefix}gptimage kucing lucu pakai kacamata`,
        `${prefix}gptimage pemandangan pegunungan saat senja`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    // gptimage returns binary JPEG directly, not JSON
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
        caption: raraWrap("GPT Image", `Prompt: ${text}`),
      }, { quoted: m });
      await m.reply(mediaInfoCaption({ header: "Rara GPT Image", fields: [
        { label: "Input", value: "Teks" },
        { label: "Prompt", value: text.length > 60 ? text.slice(0, 57) + "..." : text },

        { label: "Hasil", value: "Gambar" },
      ] }));
    } else {
      // Maybe it returned JSON error
      try {
        const errData = JSON.parse(res.data.toString());
        await m.react("❌");
        await m.reply(raraWrap("GPT Image", errData?.error || errData?.message || "Gagal generate gambar."));
      } catch {
        await m.react("❌");
        await m.reply(raraWrap("GPT Image", "Gagal generate gambar. Coba prompt lain."));
      }
    }
  } catch (e) {
    console.error("[gptimage.js]:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("GPT Image", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
