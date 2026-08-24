// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animeimg",
  alias: ["animeimg", "waifupic", "animepic"],
  category: "tools",
  description: "Cari gambar anime (SFW) - neko, waifu, wallpaper, dll",
  usage: ".animeimg <kategori>",
  example: ".animeimg waifu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const CATEGORIES = [
  { tag: "waifu", label: "Waifu", desc: "Gambar waifu anime" },
  { tag: "neko", label: "Neko", desc: "Gambar neko (kucing) anime" },
  { tag: "avatar", label: "Avatar", desc: "Avatar anime" },
  { tag: "wallpaper", label: "Wallpaper", desc: "Wallpaper anime HD" },
  { tag: "cuddle", label: "Cuddle", desc: "GIF cuddle anime" },
  { tag: "hug", label: "Hug", desc: "GIF hug anime" },
  { tag: "kiss", label: "Kiss", desc: "GIF kiss anime" },
  { tag: "pat", label: "Pat", desc: "GIF pat anime" },
  { tag: "tickle", label: "Tickle", desc: "GIF tickle anime" },
  { tag: "smug", label: "Smug", desc: "GIF smug anime" },
];

const API_URL = "https://nekos.life/api/v2/img";

async function handler(m, { sock, args }) {
  const input = (args[0] || "").toLowerCase().trim();

  if (!input) {
    let txt = `Anime Image Search\n\n`;
    txt += `Source: nekos.life API (gratis, SFW)\n\n`;
    txt += `Kategori tersedia:\n`;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const c = CATEGORIES[i];
      txt += `${i + 1}. \`${m.prefix}animeimg ${c.tag}\` - ${c.desc}\n`;
    }
    return await m.reply( txt, { commandName: "animeimg" });
  }

  const category = CATEGORIES.find((c) => c.tag === input);
  if (!category) {
    let txt = `Kategori tidak ditemukan!\n\n`;
    txt += `Kategori tersedia:\n`;
    txt += CATEGORIES.map((c) => `\`${c.tag}\``).join(", ");
    return m.reply(claraWrap("animeimg", txt));
  }

  await m.react("🕒");

  try {
    const res = await axios.get(`${API_URL}/${category.tag}`, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });

    if (res.status !== 200 || !res.data?.url) {
      throw new Error(`API error: HTTP ${res.status}`);
    }

    const imageUrl = res.data.url;

    // Download image
    const imgRes = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });

    if (imgRes.status !== 200) {
      throw new Error("Gagal download gambar");
    }

    const buffer = Buffer.from(imgRes.data);

    // Check if it's a gif (content-type or url extension)
    const isGif = imageUrl.endsWith(".gif") || imageUrl.includes(".gif");

    await m.react("✅");

    let caption = `Anime Image\n`;
    caption += `Kategori: ${category.label}\n`;
    caption += `Source: nekos.life`;

    if (isGif) {
      // Send as video/gif for animated
      await sock.sendMessage(
        m.chat,
        { video: buffer, gifPlayback: true, caption },
        { quoted: m },
      );
    } else {
      await sock.sendMessage(
        m.chat,
        { image: buffer, caption },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error("[ANIMEIMG] Error:", e.message);
    let txt = `Gagal mengambil gambar!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("animeimg", txt));
  }
}

export { pluginConfig as config, handler };
