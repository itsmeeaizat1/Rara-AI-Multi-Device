// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  Genius Lyrics Scraper (ESM) — TANPA API KEY
//  Target  : https://genius.com/
//  Cara    : public search endpoint (genius.com/api/search/multi)
//            + scrape halaman lirik via cheerio
//  Source  : script CommonJS dari owner (2026-09-06), di-port ke ESM
//            sesuai standar repo. Keunggulan vs genius-lyrics npm
//            (yang dipakai .lirikv2): gak butuh API key genius sama sekali.
//  Live test 2026-09-06: search ✅ (0.5s), scrape lirik ✅
//            (Bohemian Rhapsody 2076 char, label section kebaca).
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  Referer: "https://genius.com/",
};

/**
 * Ambil lirik dari URL halaman lagu Genius (scrape, tanpa key)
 * @param {string} songUrl
 * @returns {Promise<string>} teks lirik
 */
export async function getLyricsByUrl(songUrl) {
  const response = await axios.get(songUrl, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(response.data);

  // Hapus elemen yang bukan bagian dari lirik (credit header, script, style)
  $('[data-exclude-from-selection="true"]').remove();
  $("script, style").remove();

  // Ganti tag <br> dengan baris baru
  $('div[data-lyrics-container="true"] br').replaceWith("\n");
  $(".lyrics br").replaceWith("\n");

  const chunks = [];

  // Layout Genius modern
  $('div[data-lyrics-container="true"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text) chunks.push(text);
  });

  let lyrics = "";
  if (chunks.length > 0) {
    lyrics = chunks.join("\n\n");
  } else if ($(".lyrics").length > 0) {
    // Fallback layout Genius versi lama
    lyrics = $(".lyrics").text().trim();
  }

  lyrics = lyrics.replace(/\n{3,}/g, "\n\n").trim();

  if (!lyrics) {
    throw new Error("Lirik tidak ditemukan di halaman Genius.");
  }
  return lyrics;
}

/**
 * Cari lagu di Genius + ambil metadata & lirik lengkap (tanpa API key)
 * @param {string} query
 * @returns {Promise<{status:boolean, query:string, data?:object, other_results?:array, message?:string}>}
 */
export async function searchSongLyrics(query) {
  if (!query || !query.trim()) {
    throw new Error("Query pencarian tidak boleh kosong");
  }

  const searchUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(query.trim())}`;
  const response = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
  const sections = response.data?.response?.sections || [];

  const songSection = sections.find((sec) => sec.type === "song");
  if (!songSection || !songSection.hits || songSection.hits.length === 0) {
    return {
      status: false,
      message: `Tidak ada hasil yang ditemukan untuk query: "${query}"`,
      query,
      data: null,
    };
  }

  // Ambil lagu paling relevan (hit pertama)
  const topHit = songSection.hits[0].result;
  const lyrics = await getLyricsByUrl(topHit.url);

  return {
    status: true,
    query,
    data: {
      id: topHit.id,
      title: topHit.title,
      full_title: topHit.full_title,
      artist: topHit.artist_names,
      release_date: topHit.release_date_for_display || null,
      url: topHit.url,
      thumbnail: topHit.song_art_image_thumbnail_url || topHit.header_image_url || "",
      stats: topHit.stats || null,
      lyrics,
    },
  };
}
