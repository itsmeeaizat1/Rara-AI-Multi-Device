// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-onepunya.js — client REST API Onepunya (onepunya.qzz.io) 31 endpoint.
// Auth: header x-api-key — key dari .setkey onepunya <key> (nova-api-keys.js).
// Struktur respon: { status: boolean, message?: string, result: any }
// Fitur: pixiv & youtube & ytmusic search · image gen · upscale/removebg ·
// AI chat & multimodal · TTS (ms-neural, VITS, anime-speech) · downloader
// (yt/fb/ig/tiktok/snack/douyin) · hololive · hentai (nhentai).
// Seam: _setOnepunyaHttpForTest(fn) buat e2e (ganti transport tanpa network).
import axios from "axios";

const BASE = "https://onepunya.qzz.io";
const DEFAULT_TIMEOUT = 60_000;
const SLOW_TIMEOUT = 120_000; // image-gen/upscale/anime-speech bisa lama

// ── seam e2e ──
let _http = null;
export function _setOnepunyaHttpForTest(fn) { _http = fn; }
export function _resetOnepunyaHttpForTest() { _http = null; }

// ── core ──
async function onepunyaRequest(method, path, { query = null, body = null, timeout = DEFAULT_TIMEOUT, apiKey = "" } = {}) {
  if (_http) return _http(method, path, { query, body });
  const headers = { "x-api-key": apiKey };
  if (body) headers["Content-Type"] = "application/json";
  let url = BASE + path;
  if (query && typeof query === "object") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += "?" + s;
  }
  const res = await axios({ method, url, headers, data: body, timeout, validateStatus: () => true });
  if (typeof res.data !== "object" || res.data === null) {
    throw new Error(`ONEPUNYA_ERROR: HTTP ${res.status} (respon bukan JSON — server upstream bermasalah)`);
  }
  if (res.data.status === false) {
    throw new Error(String(res.data.message || "ONEPUNYA_ERROR: respon gagal"));
  }
  if (res.status >= 400) {
    throw new Error(String(res.data.message || `ONEPUNYA_ERROR: HTTP ${res.status}`));
  }
  return res.data.result;
}

// helper: panggil dengan key; tanpa key → error jelas
function needKey(apiKey) {
  if (!apiKey) throw new Error("API_KEY_REQUIRED: API key Onepunya belum di-set — owner ketik .setkey onepunya <key>");
}

// ═══ SEARCH TOOLS ═══
export async function pixivSearch(apiKey, query) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/search/pixiv", { query: { query }, apiKey });
}
export async function pixiv18Search(apiKey, query) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/search/pixiv18", { body: { query }, apiKey });
}
export async function youtubeSearch(apiKey, query) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/search/youtube", { query: { query }, apiKey });
}
export async function ytmusicPlay(apiKey, title) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/search/ytmusic_play", { query: { title }, apiKey });
}

// ═══ AI TOOLS ═══
export async function imageGeneration(apiKey, prompt) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-images/generation", { body: { prompt }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function upscaleImage(apiKey, image, model = "GFPGANv1.4", rescale = 2) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-image/upscale", { body: { image, model, rescale }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function removeBg(apiKey, image) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-image/removebg", { body: { image }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function aiChat(apiKey, { model = "CHATGPT", messages, stream = false, markdown = false }) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-chat/generation", { body: { model, messages, stream, markdown }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function multimodalChat(apiKey, { system = "", input_file = "", model = "0", messages }) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-chat/multimodal", { body: { system, input_file, model, messages }, timeout: SLOW_TIMEOUT, apiKey });
}

// ═══ TTS / VOICE ═══
export async function ttsGeneration(apiKey, text, voice = "id-ID-ArdiNeural") {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-voice/tts-generation", { body: { text, voice }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function ttsVoiceList(apiKey) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/ai-voice/tts-voice", { apiKey });
}
export async function vitsLanguages(apiKey) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/ai-audio/vits-tts-languages", { apiKey });
}
export async function vitsModels(apiKey, language) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/ai-audio/vits-tts-models", { query: { language }, apiKey });
}
export async function vitsTtsGenerate(apiKey, { language = "Indonesian", model = "csukuangfj/vits-piper-id_ID-news_tts-medium", text, sid = 10, speed = 1 }) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-audio/vits-tts-generate", { body: { language, model, text, sid, speed }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function animeSpeech(apiKey, text, speaker_id = 100) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/ai-voice/anime_speech", { body: { text, speaker_id }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function animeSpeakerIds(apiKey) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/ai-voice/anime_get_sid", { apiKey });
}

// ═══ DOWNLOADER ═══
export async function youtubeDownload(apiKey, url, format = "MP4", quality = "720p") {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/youtube", { body: { url, format, quality }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function snackvideoDownload(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/snackvideo", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function tiktokDownload(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/tiktok", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function douyinDownload(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/douyin", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function instaDownload(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/insta", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function facebookDownload(apiKey, url, format = "MP4") {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/download/facebook", { body: { url, format }, timeout: SLOW_TIMEOUT, apiKey });
}

// ═══ HOLOLIVE ═══
export async function holoLive(apiKey, { org = "", type = "", limit = 10 } = {}) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hololive/live", { query: { org, type, limit }, apiKey });
}
export async function holoVideos(apiKey, { org = "", type = "", limit = 10 } = {}) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hololive/video", { query: { org, type, limit }, apiKey });
}
export async function holoVideoById(apiKey, video_id) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hololive/video_by_id", { query: { video_id }, apiKey });
}
export async function holoChannel(apiKey, { org = "", type = "", limit = 10 } = {}) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hololive/channel", { query: { org, type, limit }, apiKey });
}
export async function holoChannelById(apiKey, channel_id) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hololive/channel_by_id", { query: { channel_id }, apiKey });
}
export async function holoSearch(apiKey, { q, target = "vtuber", limit = 10 } = {}) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/hololive/search", { body: { q, target, limit }, apiKey });
}

// ═══ NSFW / HENTAI (nhentai) ═══
export async function hentaiSearch(apiKey, q) {
  needKey(apiKey);
  return onepunyaRequest("GET", "/api/hentai/search", { query: { q }, apiKey });
}
export async function hentaiEpisode(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/hentai/episode", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
export async function hentaiDownload(apiKey, url) {
  needKey(apiKey);
  return onepunyaRequest("POST", "/api/hentai/download", { body: { url }, timeout: SLOW_TIMEOUT, apiKey });
}
