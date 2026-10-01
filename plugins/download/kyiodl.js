// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kyiodl.js — KyioAPI kategori Downloader (49 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyioy2meta", path: "/api/v2/downloader/y2meta", param: "url", method: "GET", hint: ".kyioy2meta <link YouTube>" },
  { cmd: "kyiosoundcloud", path: "/api/v2/downloader/soundcloud", param: "url", method: "GET", hint: ".kyiosoundcloud <link SoundCloud>" },
  { cmd: "kyiosoundcloudplay", path: "/api/v2/downloader/soundcloud-play", param: "q", method: "GET", hint: ".kyiosoundcloudplay <judul lagu>" },
  { cmd: "kyioaio", path: "/api/v2/downloader/aio", param: "url", method: "GET", hint: ".kyioaio <link apa pun>" },
  { cmd: "kyioaio2", path: "/api/v2/downloader/aio-v2", param: "url", method: "GET", hint: ".kyioaio2 <link apa pun>" },
  { cmd: "kyioaio3", path: "/api/v2/downloader/aio-v3", param: "url", method: "GET", hint: ".kyioaio3 <link apa pun>" },
  { cmd: "kyiosavefrom", path: "/api/v2/downloader/savefrom", param: "url", method: "GET", hint: ".kyiosavefrom <link>" },
  { cmd: "kyiofbdl", path: "/api/v2/downloader/fb", param: "url", method: "GET", hint: ".kyiofbdl <link Facebook>" },
  { cmd: "kyiofbdl2", path: "/api/v2/downloader/fb-v2", param: "url", method: "GET", hint: ".kyiofbdl2 <link Facebook>" },
  { cmd: "kyiofbdl3", path: "/api/v2/downloader/fb-v3", param: "url", method: "GET", hint: ".kyiofbdl3 <link Facebook>" },
  { cmd: "kyiofbdl4", path: "/api/v2/downloader/fb-v4", param: "url", method: "GET", hint: ".kyiofbdl4 <link Facebook>" },
  { cmd: "kyiogdrive", path: "/api/v2/gdrive", param: "url", method: "GET", hint: ".kyiogdrive <link Google Drive>" },
  { cmd: "kyioterabox", path: "/api/v2/terabox", param: "url", method: "GET", hint: ".kyioterabox <link TeraBox>" },
  { cmd: "kyiothreads", path: "/api/v2/downloader/threads", param: "url", method: "GET", hint: ".kyiothreads <link Threads>" },
  { cmd: "kyiomediafire", path: "/api/v2/mediafire", param: "url", method: "GET", hint: ".kyiomediafire <link MediaFire>" },
  { cmd: "kyiopinterest", path: "/api/v2/pinterest", param: "url", method: "GET", hint: ".kyiopinterest <link Pinterest>" },
  { cmd: "kyioytdl6", path: "/api/v2/downloader/ytdl-v6", param: "url", method: "GET", hint: ".kyioytdl6 <link YouTube>" },
  { cmd: "kyioapplemusic2", path: "/api/v2/downloader/apple-music-v2", param: "url", method: "GET", hint: ".kyioapplemusic2 <link Apple Music>" },
  { cmd: "kyiospotifydl", path: "/api/v2/downloader/spotify", param: "url", method: "GET", hint: ".kyiospotifydl <link Spotify>" },
  { cmd: "kyiospotifyplaylist", path: "/api/v2/downloader/spotify-playlist", param: "url", method: "GET", hint: ".kyiospotifyplaylist <link playlist Spotify>" },
  { cmd: "kyioapplemusic", path: "/api/v2/downloader/apple-music", param: "url", method: "GET", hint: ".kyioapplemusic <link Apple Music>" },
  { cmd: "kyioytdl", path: "/api/v2/ytdl", param: "url", method: "GET", hint: ".kyioytdl <link YouTube>" },
  { cmd: "kyioytdl2", path: "/api/v2/ytdl-v2", param: "url", method: "GET", hint: ".kyioytdl2 <link YouTube>" },
  { cmd: "kyioytdl3", path: "/api/v2/ytdl-v3", param: "url", method: "GET", hint: ".kyioytdl3 <link YouTube>" },
  { cmd: "kyioytaudio", path: "/api/v2/yt-audio", param: "url", method: "GET", hint: ".kyioytaudio <link YouTube>" },
  { cmd: "kyioytvideo", path: "/api/v2/yt-video", param: "url", method: "GET", hint: ".kyioytvideo <link YouTube>" },
  { cmd: "kyioytdl4", path: "/api/v2/ytdl-v4", param: "url", method: "GET", hint: ".kyioytdl4 <link YouTube>" },
  { cmd: "kyioytmp3", path: "/api/v2/dl/yt-mp3", param: "url", method: "GET", hint: ".kyioytmp3 <link YouTube>" },
  { cmd: "kyioytplay", path: "/api/v2/dl/yt-play", param: "q", method: "GET", hint: ".kyioytplay <judul lagu>" },
  { cmd: "kyioytplay2", path: "/api/v2/downloader/yt-play-v2", param: "q", method: "GET", hint: ".kyioytplay2 <judul lagu>" },
  { cmd: "kyiospotifysc", path: "/api/v2/dl/spotify-sc", param: "q", method: "GET", hint: ".kyiospotifysc <judul lagu>" },
  { cmd: "kyiospotifyplay", path: "/api/v2/dl/spotify-play", param: "q", method: "GET", hint: ".kyiospotifyplay <judul lagu>" },
  { cmd: "kyiocapcut", path: "/api/v2/dl/capcut", param: "url", method: "GET", hint: ".kyiocapcut <link CapCut>" },
  { cmd: "kyiocapcut2", path: "/api/v2/dl/capcut-v2", param: "url", method: "GET", hint: ".kyiocapcut2 <link CapCut>" },
  { cmd: "kyioytconvert", path: "/api/v2/downloader/ytconvert", param: "url", method: "GET", hint: ".kyioytconvert <link YouTube>" },
  { cmd: "kyioigdl", path: "/api/v2/ig", param: "url", method: "GET", hint: ".kyioigdl <link Instagram>" },
  { cmd: "kyioigdl2", path: "/api/v2/ig-v2", param: "url", method: "GET", hint: ".kyioigdl2 <link Instagram>" },
  { cmd: "kyioigdl3", path: "/api/v2/downloader/ig-v3", param: "url", method: "GET", hint: ".kyioigdl3 <link Instagram>" },
  { cmd: "kyiotiktokdl2", path: "/api/v2/tiktok-v2", param: "url", method: "GET", hint: ".kyiotiktokdl2 <link TikTok>" },
  { cmd: "kyiotiktokdl3", path: "/api/v2/tiktok-v3", param: "url", method: "GET", hint: ".kyiotiktokdl3 <link TikTok>" },
  { cmd: "kyiotiktokdl4", path: "/api/v2/tiktok-v4", param: "url", method: "GET", hint: ".kyiotiktokdl4 <link TikTok>" },
  { cmd: "kyiotiktokdl5", path: "/api/v2/tiktok-v5", param: "url", method: "GET", hint: ".kyiotiktokdl5 <link TikTok>" },
  { cmd: "kyiotiktokdl6", path: "/api/v2/tiktok-v6", param: "url", method: "GET", hint: ".kyiotiktokdl6 <link TikTok>" },
  { cmd: "kyiotiktok", path: "/api/v2/tiktok", param: "url", method: "GET", hint: ".kyiotiktok <link TikTok>" },
  { cmd: "kyiotwdl", path: "/api/v2/twitter", param: "url", method: "GET", hint: ".kyiotwdl <link X/Twitter>" },
  { cmd: "kyiotwdl2", path: "/api/v2/twitter-v2", param: "url", method: "GET", hint: ".kyiotwdl2 <link X/Twitter>" },
  { cmd: "kyioaiodl", path: "/api/v2/aiodl", param: "url", method: "GET", hint: ".kyioaiodl <link apa pun>" },
  { cmd: "kyiotelesticker", path: "/api/v2/downloader/tele-sticker", param: "url", method: "GET", hint: ".kyiotelesticker <link stiker Telegram>" },
  { cmd: "kyioytfast", path: "/api/v2/downloader/yt-fast", param: "url", method: "GET", hint: ".kyioytfast <link YouTube>" },
];

const pluginConfig = {
  name: "kyiodl",
  alias: ["kyiodl", "kyioy2meta", "kyiosoundcloud", "kyiosoundcloudplay", "kyioaio", "kyioaio2", "kyioaio3", "kyiosavefrom", "kyiofbdl", "kyiofbdl2", "kyiofbdl3", "kyiofbdl4", "kyiogdrive", "kyioterabox", "kyiothreads", "kyiomediafire", "kyiopinterest", "kyioytdl6", "kyioapplemusic2", "kyiospotifydl", "kyiospotifyplaylist", "kyioapplemusic", "kyioytdl", "kyioytdl2", "kyioytdl3", "kyioytaudio", "kyioytvideo", "kyioytdl4", "kyioytmp3", "kyioytplay", "kyioytplay2", "kyiospotifysc", "kyiospotifyplay", "kyiocapcut", "kyiocapcut2", "kyioytconvert", "kyioigdl", "kyioigdl2", "kyioigdl3", "kyiotiktokdl2", "kyiotiktokdl3", "kyiotiktokdl4", "kyiotiktokdl5", "kyiotiktokdl6", "kyiotiktok", "kyiotwdl", "kyiotwdl2", "kyioaiodl", "kyiotelesticker", "kyioytfast"],
  category: "download",
  desc: "KyioAPI Downloader — 49 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyioy2meta <link YouTube>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Downloader" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
