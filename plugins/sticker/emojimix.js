// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// emojimix.js — Gabungkan 2 emoji (oiapi → gstatic CDN, no API key)
import axios from "axios";
import config from "../../config.js";
import { claraWrap, novaError, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "emojimix",
  alias: ["emojimix"],
  category: "sticker",
  description: "Gabungkan 2 emoji menjadi 1 sticker",
  usage: ".emojimix <emoji1> <emoji2>",
  example: ".emojimix 😎 😂",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function getEmojimixUrl(emoji1, emoji2) {
  // oiapi returns correct gstatic CDN URL
  try {
    const { data } = await axios.get("https://oiapi.net/api/emojimix", {
      params: { emoji1, emoji2 },
      timeout: 10000,
    });
    if (data?.data?.url) return data.data.url;
  } catch (e) { console.error("[emojimix] oiapi:", e.message); }

  // Fallback: try gstatic directly with known working date patterns
  const codepoints = {
    "😂": "1f602", "😎": "1f60e", "🔥": "1f525", "❤️": "2764",
    "👍": "1f44d", "💀": "1f480", "🤡": "1f921", "😢": "1f622",
    "😡": "1f621", "🎉": "1f389", "🥳": "1f973", "😴": "1f634",
    "🤔": "1f914", "😱": "1f631", "🥺": "1f97a", "😭": "1f62d",
    "🤯": "1f92f", "😍": "1f60d", "🥰": "1f970", "😘": "1f618",
  };

  const code1 = codepoints[emoji1] || emoji1.codePointAt(0)?.toString(16);
  const code2 = codepoints[emoji2] || emoji2.codePointAt(0)?.toString(16);
  if (!code1 || !code2) return null;

  // Try multiple date patterns
  const dates = ["20201001", "20220406", "20230301", "20240215"];
  const orders = [
    `u${code1}/u${code1}_u${code2}.png`,
    `u${code2}/u${code2}_u${code1}.png`,
  ];

  for (const date of dates) {
    for (const order of orders) {
      const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${order}`;
      try {
        const res = await axios.head(url, { timeout: 5000 });
        if (res.status === 200) return url;
      } catch {}
    }
  }

  return null;
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(claraWrap("emojimix", `Gabungkan 2 emoji menjadi 1 sticker!\n\nContoh: ${m.prefix}emojimix 😎 😂`, "guide"));
  }

  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const emojis = text.match(emojiRegex);

  if (!emojis || emojis.length < 2) {
    return m.reply(novaError("EmojiMix", "Masukkan minimal 2 emoji!"));
  }

  try {
    await m.react("🕒");
    const emoji1 = emojis[0];
    const emoji2 = emojis[1];

    const imageUrl = await getEmojimixUrl(emoji1, emoji2);

    if (!imageUrl) {
      await m.react("❌");
      return m.reply(claraWrap("emojimix", `Kombinasi ${emoji1} + ${emoji2} tidak tersedia!\n\nCoba kombinasi lain.`, "error"));
    }

    const res = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
    const buffer = Buffer.from(res.data);

    await sock.sendImageAsSticker(m.chat, buffer, m, {
      packname: config.sticker?.packname || "Nova AI",
      author: config.sticker?.author || "Aizat",
    });
    await m.react("🐣");
    await m.reply(novaBerhasil("emojimix"));
  } catch (err) {
    console.error("[EmojiMix]", err);
    await m.react("❌");
    m.reply(claraWrap("emojimix", "Gagal membuat emoji mix. Coba lagi nanti!", "error"));
  }
}

export { pluginConfig as config, handler };
