// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kyiosearch.js — KyioAPI kategori Search (49 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyioonesearch", path: "/api/v2/search/onesearch", param: "q", method: "GET", hint: ".kyioonesearch <query>" },
  { cmd: "kyiobluearchivesearch", path: "/api/v2/bluearchive-search", param: "q", method: "GET", hint: ".kyiobluearchivesearch <nama karakter>" },
  { cmd: "kyiopixiv", path: "/api/v2/search/pixiv", param: "q", method: "GET", hint: ".kyiopixiv <kata kunci>" },
  { cmd: "kyiopixiv2", path: "/api/v2/search/pixiv-v2", param: "q", method: "GET", hint: ".kyiopixiv2 <kata kunci>" },
  { cmd: "kyiomangadex", path: "/api/v2/search/mangadex", param: "q", method: "GET", hint: ".kyiomangadex <judul manga>" },
  { cmd: "kyiostickerlysearch", path: "/api/v2/search/stickerly", param: "q", method: "GET", hint: ".kyiostickerlysearch <kata kunci>" },
  { cmd: "kyiomelolo", path: "/api/v2/search/melolo", param: "q", method: "GET", hint: ".kyiomelolo <judul drama>" },
  { cmd: "kyioapkmody", path: "/api/v2/apkmody", param: "q", method: "GET", hint: ".kyioapkmody <nama apk>" },
  { cmd: "kyioapkpure", path: "/api/v2/search/apkpure", param: "q", method: "GET", hint: ".kyioapkpure <nama apk>" },
  { cmd: "kyioplaystore", path: "/api/v2/search/playstore", param: "q", method: "GET", hint: ".kyioplaystore <nama aplikasi>" },
  { cmd: "kyioscribd", path: "/api/v2/search/scribd", param: "q", method: "GET", hint: ".kyioscribd <judul dokumen>" },
  { cmd: "kyiobrainly", path: "/api/v2/search/brainly", param: "q", method: "GET", hint: ".kyiobrainly <pertanyaan>" },
  { cmd: "kyiokbbi2", path: "/api/v2/search/kbbi-v2", param: "q", method: "GET", hint: ".kyiokbbi2 <kata>" },
  { cmd: "kyiokbbi", path: "/api/v2/search/kbbi", param: "q", method: "GET", hint: ".kyiokbbi <kata>" },
  { cmd: "kyiopddikti", path: "/api/v2/search/pddikti", param: "q", method: "GET", hint: ".kyiopddikti <nama mahasiswa/kampus>" },
  { cmd: "kyiostackoverflow", path: "/api/v2/search/stackoverflow", param: "q", method: "GET", hint: ".kyiostackoverflow <pertanyaan teknis>" },
  { cmd: "kyioan1", path: "/api/v2/search/an1", param: "q", method: "GET", hint: ".kyioan1 <nama apk/game>" },
  { cmd: "kyiokomiku", path: "/api/v2/search/komiku", param: "q", method: "GET", hint: ".kyiokomiku <judul komik>" },
  { cmd: "kyiosteam", path: "/api/v2/search/steam", param: "q", method: "GET", hint: ".kyiosteam <nama game>" },
  { cmd: "kyiogsmarena", path: "/api/v2/search/gsmarena", param: "q", method: "GET", hint: ".kyiogsmarena <nama hp>" },
  { cmd: "kyiotmdb", path: "/api/v2/search/tmdb-movie", param: "q", method: "GET", hint: ".kyiotmdb <judul film>" },
  { cmd: "kyiojobstreet", path: "/api/v2/search/jobstreet", param: "q", method: "GET", hint: ".kyiojobstreet <pekerjaan>" },
  { cmd: "kyionpm", path: "/api/v2/search/npm", param: "q", method: "GET", hint: ".kyionpm <nama package>" },
  { cmd: "kyioklikxxi", path: "/api/v2/search/klikxxi", param: "q", method: "GET", hint: ".kyioklikxxi <judul film>" },
  { cmd: "kyiowikipedia", path: "/api/v2/search/wikipedia", param: "q", method: "GET", hint: ".kyiowikipedia <topik>" },
  { cmd: "kyiowikipedia2", path: "/api/v2/search/wikipedia-v2", param: "q", method: "GET", hint: ".kyiowikipedia2 <topik>" },
  { cmd: "kyioacode", path: "/api/v2/search/acode", param: "q", method: "GET", hint: ".kyioacode <nama plugin Acode>" },
  { cmd: "kyioloker", path: "/api/v2/search/loker", param: "q", method: "GET", hint: ".kyioloker <pekerjaan>" },
  { cmd: "kyiolyrics", path: "/api/v2/search/lyrics", param: "q", method: "GET", hint: ".kyiolyrics <judul lagu>" },
  { cmd: "kyiolyrics2", path: "/api/v2/search/lyrics-2", param: "q", method: "GET", hint: ".kyiolyrics2 <judul lagu> (lirik + LRC sync)" },
  { cmd: "kyiolyrics3", path: "/api/v2/search/lyrics-v3", param: "q", method: "GET", hint: ".kyiolyrics3 <judul lagu>" },
  { cmd: "kyioigreels", path: "/api/v2/search/reels", param: "q", method: "GET", hint: ".kyioigreels <kata kunci>" },
  { cmd: "kyiowebai", path: "/api/v2/search/web-ai", param: "q", method: "GET", hint: ".kyiowebai <pertanyaan> (riset AI real-time)" },
  { cmd: "kyiowebsearch", path: "/api/v2/search/web", param: "q", method: "GET", hint: ".kyiowebsearch <query>" },
  { cmd: "kyiofbsearch", path: "/api/v2/search/facebook", param: "q", method: "GET", hint: ".kyiofbsearch <kata kunci video FB>" },
  { cmd: "kyiogoogle", path: "/api/v2/search/google", param: "q", method: "GET", hint: ".kyiogoogle <query>" },
  { cmd: "kyiohuggingface", path: "/api/v2/search/huggingface", param: "q", method: "GET", hint: ".kyiohuggingface <nama model>" },
  { cmd: "kyiowebtoons", path: "/api/v2/search/webtoons", param: "q", method: "GET", hint: ".kyiowebtoons <judul webtoon LINE>" },
  { cmd: "kyiotokopedia", path: "/api/v2/search/tokopedia", param: "q", method: "GET", hint: ".kyiotokopedia <nama produk>" },
  { cmd: "kyioytsearch", path: "/api/v2/search/youtube", param: "q", method: "GET", hint: ".kyioytsearch <kata kunci>" },
  { cmd: "kyioytmusic", path: "/api/v2/search/ytmusic", param: "q", method: "GET", hint: ".kyioytmusic <judul lagu>" },
  { cmd: "kyiospotifysearch", path: "/api/v2/search/spotify-v2", param: "q", method: "GET", hint: ".kyiospotifysearch <judul lagu>" },
  { cmd: "kyioytsearch2", path: "/api/v2/search/yt-v2", param: "q", method: "GET", hint: ".kyioytsearch2 <kata kunci>" },
  { cmd: "kyioytsearch3", path: "/api/v2/search/yt138", param: "q", method: "GET", hint: ".kyioytsearch3 <kata kunci>" },
  { cmd: "kyiopinterestsearch", path: "/api/v2/search/pinterest", param: "q", method: "GET", hint: ".kyiopinterestsearch <kata kunci>" },
  { cmd: "kyiotiktoksearch", path: "/api/v2/search/tiktok", param: "q", method: "GET", hint: ".kyiotiktoksearch <kata kunci>" },
  { cmd: "kyiotiktoksearch2", path: "/api/v2/search/tiktok-v2", param: "q", method: "GET", hint: ".kyiotiktoksearch2 <kata kunci> (Revid AI)" },
  { cmd: "kyioigsearch", path: "/api/v2/search/ig", param: "q", method: "GET", hint: ".kyioigsearch <username>" },
  { cmd: "kyiotwitterjobs", path: "/api/v2/search/twitter-jobs", param: "q", method: "GET", hint: ".kyiotwitterjobs <posisi kerja>" },
];

const pluginConfig = {
  name: "kyiosearch",
  alias: ["kyiosearch", "kyioonesearch", "kyiobluearchivesearch", "kyiopixiv", "kyiopixiv2", "kyiomangadex", "kyiostickerlysearch", "kyiomelolo", "kyioapkmody", "kyioapkpure", "kyioplaystore", "kyioscribd", "kyiobrainly", "kyiokbbi2", "kyiokbbi", "kyiopddikti", "kyiostackoverflow", "kyioan1", "kyiokomiku", "kyiosteam", "kyiogsmarena", "kyiotmdb", "kyiojobstreet", "kyionpm", "kyioklikxxi", "kyiowikipedia", "kyiowikipedia2", "kyioacode", "kyioloker", "kyiolyrics", "kyiolyrics2", "kyiolyrics3", "kyioigreels", "kyiowebai", "kyiowebsearch", "kyiofbsearch", "kyiogoogle", "kyiohuggingface", "kyiowebtoons", "kyiotokopedia", "kyioytsearch", "kyioytmusic", "kyiospotifysearch", "kyioytsearch2", "kyioytsearch3", "kyiopinterestsearch", "kyiotiktoksearch", "kyiotiktoksearch2", "kyioigsearch", "kyiotwitterjobs"],
  category: "search",
  desc: "KyioAPI Search — 49 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyioonesearch <query>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Search" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
