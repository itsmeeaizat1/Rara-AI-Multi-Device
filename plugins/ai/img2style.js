// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// img2style — foto → 80+ GAYA (Haidar img2style) — Studio Ghibli, Disney,
// Pixar, Demon Slayer, Genshin-Like, Minecraft, Lego, Van Gogh, Manga, dll.
// Fallback: KuroNeko toonmix (free prompt). Key: apikeys.json haidar.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { haidarImg2style, HAIDAR_STYLES } from "../../src/scraper/haidar-ai.js";
import { uploadToUguu } from "../../src/scraper/kuroneko.js";

// alias cepat gaya populer → style resmi
const STYLE_ALIASES = {
  ghibli: "Studio Ghibli", jadighibli: "Studio Ghibli",
  disney: "Disney", pixar: "Pixar", dreamworks: "DreamWorks",
  manga: "Manga", anime: "Japanese Anime", chibi: "Chibi / SD",
  onepiece: "One Piece", demonslayer: "Demon Slayer", kny: "Demon Slayer",
  genshin: "Genshin-Like Anime", shinai: "Makoto Shinkai", kyoani: "Kyoto Animation",
  minecraft: "Minecraft", lego: "Lego", rick: "Rick And Morty", simpsons: "Simpsons",
  southpark: "South Park", jojo: "JoJo's Bizarre Adventure", doraemon: "Tezuka Osamu",
  vangogh: "Van Gogh", picasso: "Picasso", monet: "Monet",
  cyberpunk: "Cyberpunk Anime", pixel: "Pixel Art", kawaii: "Kawaii 3D Character",
};

const pluginConfig = {
  name: "img2style",
  alias: ["jadigaya", "gaya", "ghibli", "jadighibli", "jadipixar", "jadidisney", "jadimanga", "vangogh", "jadiminecraft"],
  category: "ai",
  description: "Ubah foto jadi 80+ gaya — Ghibli, Disney, Pixar, Demon Slayer, Genshin, Minecraft, Van Gogh, dll",
  usage: ".img2style <gaya> (reply/kirim foto)\n.img2style list — daftar semua gaya",
  example: ".img2style ghibli (reply foto)\n.img2style Demon Slayer (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const rawArgs = m.args || [];
  const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted?.type === "imageMessage"));

  // .img2style list — tampil semua gaya
  const sub = (rawArgs[0] || "").toLowerCase();
  if (sub === "list" || sub === "gaya") {
    return m.reply(raraWrap("img2style", `Ada ${HAIDAR_STYLES.length} gaya yang bisa dipakai!\n\n${HAIDAR_STYLES.map((s) => `• ${s}`).join("\n")}\n\nCARA PAKAI: ${m.prefix}img2style <gaya> lalu reply foto\nContoh: ${m.prefix}img2style ghibli (reply foto)`, "guide"));
  }

  // alias gaya: .ghibli (reply foto) — command alias langsung jadi gaya
  let style = rawArgs.join(" ").trim();
  if (!style && STYLE_ALIASES[m.command]) style = STYLE_ALIASES[m.command];
  if (!style) {
    return m.reply(raraWrap("img2style", `Mau diubah ke gaya apa?\n\nContoh: ${m.prefix}img2style ghibli (reply foto)\n${m.prefix}img2style Demon Slayer (reply foto)\n\nKetik ${m.prefix}img2style list buat lihat ${HAIDAR_STYLES.length} gaya\n\nGaya populer: ghibli, disney, pixar, manga, demonslayer, genshin, minecraft, lego, vangogh, chibi`, "guide"));
  }
  if (!isImage) {
    return m.reply(raraWrap("img2style", `Reply/kirim foto dulu!\n\nContoh: ${m.prefix}img2style ${style} (reply foto)`, "guide"));
  }

  // resolve alias → style resmi
  const styleKey = style.toLowerCase();
  const resolved = HAIDAR_STYLES.find((s) => s.toLowerCase() === styleKey) || STYLE_ALIASES[styleKey] || null;

  try {
    await m.react("🕒");
    let buffer;
    if (m.quoted && m.quoted.isMedia) buffer = await m.quoted.download();
    else if (m.isMedia) buffer = await m.download();
    if (!buffer) throw new Error("gagal download gambar");

    const imageUrl = await uploadToUguu(buffer, "img.jpg");

    let resultUrl = null;
    if (resolved) {
      // Engine utama: Haidar img2style (80+ gaya fixed)
      resultUrl = await haidarImg2style(imageUrl, resolved);
    } else {
      // Gaya bebas → KuroNeko toonmix (prompt custom)
      try {
        const { toonMix } = await import("../../src/scraper/kuroneko.js");
        resultUrl = await toonMix(imageUrl, `ubah foto jadi gaya ${style}, kualitas tinggi`);
      } catch {
        throw new Error(`gaya '${style}' gak ada — ketik ${m.prefix}img2style list buat daftar gaya`);
      }
    }

    const axios = (await import("axios")).default;
    const res = await axios.get(resultUrl, { responseType: "arraybuffer", timeout: 60000 });
    const buf = Buffer.from(res.data);
    if (!buf || buf.length < 5000) throw new Error("hasil kosong");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: buf,
      caption: raraWrap("img2style", `🎨 Foto diubah gaya!\n\n✨ Gaya: *${resolved || style}*`),
    }, { quoted: m });
  } catch (err) {
    console.error("img2style error:", err);
    await m.react("❌");
    return m.reply(raraWrap("img2style", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
