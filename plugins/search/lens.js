// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Lens — Reverse Image Trace
 * Fitur: .lens (reply foto) → lacak asal gambar:
 *   1. 🎬 Anime scene → trace.moe (frame anime EXAKT: judul + episode +
 *      menit ke berapa + preview)
 *   2. 🌐 Sumber web → AI vision baca gambar (objek/teks/landmark) →
 *      websearch → kandidat sumber asli
 * Berguna buat lacak makan/detek hoaks dari screenshot.
 */
import { raraWrap, tipText } from "../../src/lib/rara-menu-style.js";
import { visionScan } from "../../src/lib/rara-vision-chain.js";
import { searchWeb } from "../../src/lib/rara-websearch.js";
import { uploadToUguu } from "../../src/scraper/kuroneko.js";

const pluginConfig = {
  name: "lens",
  alias: ["lens", "reverselens", "asalgambar"],
  category: "search",
  description: "Lacak asal gambar — anime (trace.moe) + sumber web via AI",
  usage: ".lens (reply foto)",
  example: ".lens (reply screenshot)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const TRACE_MIN_SIMILARITY = 0.80;

/** trace.moe — frame anime exact. input: URL gambar publik. */
export async function traceAnime(url) {
  const res = await fetch(`https://api.trace.moe/search?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error("trace.moe HTTP " + res.status);
  const data = await res.json().catch(() => ({}));
  const best = (data?.result || [])[0];
  if (!best || Number(best.similarity || 0) < TRACE_MIN_SIMILARITY) return null;
  return {
    anilistId: best.anilist,
    filename: String(best.filename || ""),
    episode: best.episode,
    at: best.at, // detik timestamp
    similarity: Math.round(Number(best.similarity) * 100),
    image: best.image, // preview frame
    video: best.video,
  };
}

/** Judul anime dari AniList id (fallback: parse filename). */
export async function fetchAniListTitle(anilistId) {
  if (!anilistId) return "";
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: `query($id: Int){ Media(id: $id, type: ANIME){ title { romaji english } } }`, variables: { id: anilistId } }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json().catch(() => ({}));
    const t = j?.data?.Media?.title;
    return t?.english || t?.romaji || "";
  } catch {
    return "";
  }
}

export function fmtTimestamp(sec) {
  const s = Math.floor(Number(sec) || 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const VISION_PROMPT = `Describe this image in English for reverse image search purposes, max 60 words. Include: main subject/object names, visible text (exact quotes), landmark or location guesses, art style (photo/anime/screenshot/meme/poster), and any distinctive searchable details. Output ONLY the description text, no extra words.`;

/** AI vision baca gambar → deskripsi → websearch kandidat sumber. */
export async function traceWeb(buffer) {
  const vis = await visionScan({ imageBuffer: buffer, question: VISION_PROMPT, instruction: "You are a visual analysis assistant. Answer in English only." });
  if (!vis?.status || !vis?.text) throw new Error("AI vision gak jawab");
  const desc = String(vis.text).trim().slice(0, 300);
  const hits = await searchWeb(desc, { limit: 5 });
  const results = (hits || []).map((h) => ({
    title: String(h.title || h.name || "").slice(0, 80),
    url: String(h.url || h.link || ""),
    snippet: String(h.snippet || h.description || "").slice(0, 120),
  })).filter((r) => r.url);
  return { desc, results };
}

// seams e2e
let _traceAnimeFn = traceAnime;
let _traceWebFn = traceWeb;
let _anilistFn = fetchAniListTitle;
export function _setLensDepsForTest({ traceAnime: ta, traceWeb: tw, anilist } = {}) {
  if (ta) _traceAnimeFn = ta;
  if (tw) _traceWebFn = tw;
  if (anilist) _anilistFn = anilist;
}
export function _resetLensDepsForTest() {
  _traceAnimeFn = traceAnime;
  _traceWebFn = traceWeb;
  _anilistFn = fetchAniListTitle;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;

  if (!isPhoto) {
    return m.reply(
      raraWrap("Lens", [
        "🔍 Lacak asal gambar",
        "",
        `Cara pakai: reply/kirim foto, terus ketik ${prefix}lens`,
        "",
        "Yang dicek:",
        "🎬 Screenshot anime → judul + episode + menit ke-N (trace.moe)",
        "🌐 Gambar biasa → AI baca isinya → nyari kandidat sumber asli di web",
        "",
        "Kepake buat: nemu screenshot anime keren (apa judulnya?), atau ngecek screenshot tebar-baran itu asli atau hoax ✨",
      ].join("\n")) + "\n" + tipText(`Contoh: reply screenshot + ketik ${prefix}lens`)
    );
  }

  await m.react("🧠");
  try {
    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
    if (!buffer || buffer.length < 1000) throw new Error("foto gak kebaca");

    await m.react("🛠️");

    // jalur anime: upload publik → trace.moe
    let anime = null;
    try {
      const url = await uploadToUguu(buffer, "lens.jpg");
      anime = await _traceAnimeFn(url);
    } catch (e) { console.error("[lens] trace.moe:", e.message); }

    // jalur web: AI deskripsi → search (paralel friendly, tapi sequential aman)
    let web = null;
    try { web = await _traceWebFn(buffer); } catch (e) { console.error("[lens] webtrace:", e.message); }

    if (!anime && (!web || !web.results?.length)) {
      await m.react("❌");
      return m.reply(raraWrap("Lens", [
        "🔍 Gak ketemu sumber yang mirip.",
        "",
        "Coba foto yang lebih jelas, atau gambarna emang nggak pernah ada di web (foto pribadi).",
      ].join("\n")));
    }

    // kartu hasil
    const lines = ["🔍 *HASIL PELACAKAN GAMBAR*", ""];

    if (anime) {
      const title = (await _anilistFn(anime.anilistId)) || anime.filename.split(" - ")[0] || "";
      lines.push("〔 🎬 Anime Ditemukan! 〕");
      lines.push(`📺 Judul: *${title}*`);
      if (anime.episode != null) lines.push(`🎞 Episode: ${anime.episode}`);
      if (anime.at != null) lines.push(`⏱ Momen: menit ${fmtTimestamp(anime.at)}`);
      lines.push(`🎯 Kesamaan: ${anime.similarity}%`);
      lines.push("");
      // preview frame dikirim sebagai gambar biar kecewa gak 😄
      try {
        await sock.sendMedia(m.chat, { url: anime.image }, raraWrap("Lens", `🎬 ${title}${anime.episode != null ? " — Episode " + anime.episode : ""} @ ${fmtTimestamp(anime.at)}`), m, { type: "image" });
      } catch (e) { console.error("[lens] preview:", e.message); }
    }

    if (web?.results?.length) {
      lines.push("〔 🌐 Kandidat Sumber Web 〕");
      web.results.slice(0, 4).forEach((r, i) => {
        lines.push(`${i + 1}. ${r.title}`);
        lines.push(`   ${r.url}`);
      });
      lines.push("");
      lines.push(`🤖 AI baca gambar: _${web.desc}_`);
    }

    lines.push("");
    lines.push("_cek link-nya buat mastiin sumber aslinya ya_");

    await m.reply(raraWrap("Lens", lines.join("\n")));
    await m.react("🐣");
  } catch (e) {
    console.error("[lens]", e.message || e);
    await m.react("❌");
    await m.reply(raraWrap("Lens", [
      "❌ Gagal lacak gambar.",
      "",
      "Server pelacak lagi sibuk — coba lagi bentar lagi ya.",
    ].join("\n")));
  }
}

export { pluginConfig as config, handler };
