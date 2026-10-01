// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// haidar-ai.js — fitur AI HaidarApis (api.haidarxd.my.id/api/v1/ai/*)
// Key: apikeys.json field `haidar` (via getHaidarKey).
//
// Fitur (live verified 8 Sep 2026):
//   - txt2vid     : TEXT → VIDEO mp4 (engine sora.aritek) — generator video AI
//   - text2speech : TTS natural multi-bahasa — 42 voice (Gadis/Ardi/Siti/Dimas
//                   ID, Aoi/Daichi/Mayu JP, BongJin KR, Mia/Olivia EN, dll)
//   - img2style   : foto → 80+ GAYA (Studio Ghibli, Disney, Pixar, Demon Slayer,
//                   Genshin-Like, Minecraft, Lego, Van Gogh, Manga, Chibi, dll)
//   - nano-banana : text2img (pollinations) — bukan img2img, dipakai cadangan txt2img
// Gak dipakai: suno (upstream 400 — backend down 8 Sep), img2img tools (upstream error).
// KuroNeko/sylvatica disimpan sebagai FALLBACK (rate-limit 60 req ketat).

import { getHaidarKey } from "../lib/config/env-loader.js";

const HAIDAR_AI_BASE = "https://api.haidarxd.my.id/api/v1";

/** 42 voice TTS natural (verbatim dari validasi param API) */
export const HAIDAR_VOICES = [
  // Indonesia
  "Gadis", "Ardi", "Siti", "Dimas", "Tuti", "Jajang",
  // Inggris
  "Abbi", "Bella", "Hollie", "Maisie", "Mia", "Olivia", "Alfie", "Elliot", "Ethan", "Noah",
  // Arab
  "Meryem", "Ibrahim",
  // Jepang
  "Aoi", "Daichi", "Mayu", "Naoki", "Shiori", "Nanami", "Keita",
  // Korea
  "BongJin", "GookMin", "Hyunsu", "JiMin", "SeoHyeon", "SoonBok", "YuJin", "SunHi", "InJoon",
  // Unik
  "Algenib", "Despina", "Enceladus", "Ava", "Marcello", "William", "Ash", "Sage",
];

/** 80+ gaya img2style (verbatim dari validasi param API) */
export const HAIDAR_STYLES = [
  "Studio Ghibli", "Disney", "Pixar", "Pixel Art", "DreamWorks", "Marvel Comic Anime", "DC Comic",
  "Japanese Anime", "American Cartoon", "Makoto Shinkai", "Japanese Ukiyo-e", "One Piece", "Simpsons",
  "Manga", "Cel-Shaded", "Flat Illustration", "Scrapbook / Journal Anime", "Children's Book",
  "Doodle Art", "Claymation", "Lego", "JoJo's Bizarre Adventure", "Knitted Yarn", "Felted Wool Doll",
  "Rick And Morty", "Kawaii 3D Character", "Snoopy Comic", "Minecraft", "Cartoon Portrait Poster Postcard",
  "Kaleidoscope Anime", "Vintage Oil Painting Anime", "Watercolor", "Acrylic", "Colored Pencil Sketch",
  "Black and White Pencil Sketch", "Printmaking", "Mosaic", "Pastel", "Ink Drawing", "Fresco / Mural",
  "Abstract Art", "Fauvism", "Surrealism Anime", "Pop Art", "Cubism", "Magical Fantasy Anime",
  "Medieval Fantasy Anime", "Gothic Fantasy Anime", "Cyberpunk Anime", "Steampunk Anime",
  "Space Sci-Fi Anime", "Futuristic Sci-Fi Anime", "Hand-Cut Collage", "Shonen Anime", "Shoujo Anime",
  "Kyoto Animation", "Princess Mononoke", "Demon Slayer", "Evangelion", "Tezuka Osamu",
  "Adventure Time", "South Park", "Vtuber Anime", "Chibi / SD", "Manga Panel", "AI Dreamlike Anime",
  "Fan-Art", "Magical Girl Anime", "Kemonomimi / Furry Anime", "Genshin-Like Anime", "Fairytale Anime",
  "Bauhaus", "Memphis Design", "Retro Wave", "Glitch Art", "Van Gogh", "Picasso", "Monet",
  "Children's Crayon Drawing", "Interstellar Mecha Armor Anime", "Pixel Collage", "Graffiti", "Sticker",
  "Fluid Fantasy Sketchbook", "Geometric Softness", "Psychedelic Creating Soul", "Microtopia",
];

/** GET helper AI — THROW error deskriptif (beda dari haidarFetch yang null-safe) */
async function haidarAiGet(path, params, timeoutMs = 120000) {
  const key = getHaidarKey();
  if (!key) throw new Error("key haidar kosong");
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), apikey: key });
  const res = await fetch(`${HAIDAR_AI_BASE}/${path}?${qs}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const json = await res.json().catch(() => ({}));
  if (json?.status === "error" || json?.error) {
    throw new Error(json?.error?.message || "haidar ai gagal");
  }
  if (!json || json?.status !== "success") throw new Error("haidar ai gagal");
  return json?.data !== undefined ? json.data : json;
}

/** TEXT → VIDEO: hasil URL mp4 */
export async function haidarTxt2vid(prompt) {
  const d = await haidarAiGet("ai/txt2vid", { prompt }, 240000);
  const url = d?.url || d?.result?.url;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL video kosong");
  return url;
}

/** TTS natural — hasil URL audio mp3 */
export async function haidarTTS(text, voice = "Gadis") {
  const d = await haidarAiGet("ai/text2speech", { text, voice }, 90000);
  const url = d?.audio_url || d?.url;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL audio kosong");
  return url;
}

/** Foto → gaya (80+ pilihan) — hasil URL gambar */
export async function haidarImg2style(imageUrl, style) {
  if (!HAIDAR_STYLES.includes(style)) throw new Error(`gaya '${style}' gak ada — ketik .img2style list`);
  const d = await haidarAiGet("ai/img2style", { url: imageUrl, style }, 240000);
  const results = d?.results || [];
  const first = results.find((r) => r?.url) || results[0];
  const url = first?.url || d?.url || d?.imageUrl;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL hasil kosong");
  return url;
}

/** Text2img nano-banana (pollinations) — bukan edit, hasil URL gambar baru */
export async function haidarTxt2img(prompt) {
  const d = await haidarAiGet("ai/nano-banana", { prompt }, 180000);
  const url = d?.imageUrl || d?.url;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL gambar kosong");
  return url;
}
