// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/spotidown.js — Cari & download lagu Spotify via spotidown.app
// Request owner 11 Sep 2026: "buat fitur play tp versi spotify .playspotify"
// Port dari kode owner: flow form spotifyurl (home /en6 → hidden inputs) →
// POST /action (hasil list lagu, form submitspurl pertama) → POST /action/track
// (link download a.abutton). Meta lagu dari input data (base64 JSON: name,
// artist, album, duration, cover).

import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const http = axios.create({
  timeout: 30000,
  headers: { "User-Agent": USER_AGENT },
  validateStatus: () => true,
});

async function postForm(url, body, cookieHeader) {
  const res = await http.post(url, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: "https://spotidown.app/en6",
      Origin: "https://spotidown.app",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} dari spotidown`);
  return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
}

/**
 * Cari lagu di Spotify (via spotidown.app) + ambil link download mp3.
 * @param {string} query — judul lagu / nama artis / link track spotify
 * @returns {object} { title, artist, album, duration, image, download_url }
 */
export async function searchSpotiDown(query) {
  if (!query || typeof query !== "string") throw new Error("Query kosong");

  // 1. Home page — ambil cookie + hidden input form spotifyurl
  const resHome = await http.get("https://spotidown.app/en6");
  if (resHome.status !== 200) throw new Error("spotidown.app gak kebuka");
  const cookies = resHome.headers["set-cookie"] || [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  const $1 = cheerio.load(resHome.data);
  const hiddenInputs = {};
  $1('form[name="spotifyurl"] input[type="hidden"]').each((_, el) => {
    const name = $1(el).attr("name");
    const val = $1(el).attr("value") || "";
    if (name) hiddenInputs[name] = val;
  });

  // 2. POST /action — cari lagu (query bebas ATAU link spotify)
  const paramsAction = new URLSearchParams();
  paramsAction.append("url", query);
  for (const [k, v] of Object.entries(hiddenInputs)) paramsAction.append(k, v);

  const responseData = await postForm("https://spotidown.app/action", paramsAction.toString(), cookieHeader);
  if (responseData.error) throw new Error(responseData.message || "Gagal mencari lagu");

  // 3. Ambil form track pertama dari hasil
  const $2 = cheerio.load(responseData.data);
  const firstForm = $2('form[name="submitspurl"]').first();
  if (!firstForm.length) throw new Error("Lagu tidak ditemukan");

  const rawData = firstForm.find('input[name="data"]').val();
  const baseVal = firstForm.find('input[name="base"]').val();
  const tokenVal = firstForm.find('input[name="token"]').val();

  // Meta lagu: input data = base64 JSON (name/artist/album/duration/cover)
  let trackMeta = {};
  if (rawData) {
    try {
      trackMeta = JSON.parse(Buffer.from(rawData, "base64").toString("utf-8"));
    } catch {}
  }

  // 4. POST /action/track — dapetin link download
  const paramsTrack = new URLSearchParams();
  paramsTrack.append("data", rawData);
  paramsTrack.append("base", baseVal);
  paramsTrack.append("token", tokenVal);

  let downloadUrl = null;
  const trackRespData = await postForm("https://spotidown.app/action/track", paramsTrack.toString(), cookieHeader);
  if (!trackRespData.error && trackRespData.data) {
    const $dl = cheerio.load(trackRespData.data);
    downloadUrl = $dl("a.abutton[href]").attr("href") || null;
  }

  if (!downloadUrl) throw new Error("Link download gak ketemu");

  return {
    title: trackMeta.name || null,
    artist: trackMeta.artist || null,
    album: trackMeta.album || null,
    duration: trackMeta.duration || null,
    image: trackMeta.cover || null,
    download_url: downloadUrl,
  };
}

/**
 * Download mp3 hasil pencarian → Buffer.
 * @param {string} url — download_url dari searchSpotiDown
 * @returns {Promise<Buffer>}
 */
export async function downloadSpotiAudio(url) {
  const res = await http.get(url, { responseType: "arraybuffer", timeout: 120000 });
  if (res.status !== 200) throw new Error(`Download gagal HTTP ${res.status}`);
  const buffer = Buffer.from(res.data);
  if (buffer.length < 10000) throw new Error("File audio kosong");
  return buffer;
}
