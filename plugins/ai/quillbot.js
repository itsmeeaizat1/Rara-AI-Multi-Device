// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";
import { callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "quilbot",
  alias: ["quilbot"],
  category: "ai",
  description: "AI Quillbot untuk menulis ulang atau menyempurnakan kalimat",
  usage: ".quilbot <teks>",
  example: ".quilbot Saya sedang makan nasi di rumah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ") || m.text?.trim();

  if (!text) {
        return m.reply(raraGuideV2("quilbot", {
 kaomoji: "(◍'◡'◍)",
 sapaan: "mau teksmu disempurnakan biar lebih enak dibaca? kirim aja! (◍•ᴗ•◍)",
      cara: "ketik teks yang mau diperbaiki sesudah command",
      contoh: `${m.prefix}quilbot Saya sedang makan nasi di rumah`,
      spec: ["⚡ energi 1", "⏱ 5dtk", "💸 gratis"],
    }), "quilbot");
  }
  try {
  await m.react("🕒");
    const apiUrl = `https://api.nexray.eu.cc/ai/quillbot?text=${encodeURIComponent(text)}`;
    const res = { data: { result: await callIkyy(text, {}) } };

    const data = res.data;
    if (!data.status || !data.result) {
      await m.react("🐣");
      return m.reply(raraWrap("quilbot", "⚠️ Quillbot gagal memproses teks."));
    }

    await m.reply(data.result);
  } catch (error) {
    console.error("[Quillbot]", error.message);
    m.reply(raraWrap("quilbot", "😔 Terjadi kesalahan saat memproses teks ke Quillbot."));
  }
}

export { pluginConfig as config, handler };
