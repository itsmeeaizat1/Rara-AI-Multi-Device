// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kyiomovie.js — KyioAPI kategori Movie & Anime (21 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyiodanbooru", path: "/api/v2/search/danbooru", param: "q", method: "GET", hint: ".kyiodanbooru <tag>" },
  { cmd: "kyiodanborupopular", path: "/api/v2/search/danbooru-popular", param: "none", method: "GET", hint: ".kyiodanborupopular" },
  { cmd: "kyiodanborurandom", path: "/api/v2/search/danbooru-random", param: "none", method: "GET", hint: ".kyiodanborurandom" },
  { cmd: "kyiokonachan", path: "/api/v2/search/konachan", param: "q", method: "GET", hint: ".kyiokonachan <tag>" },
  { cmd: "kyiokucing", path: "/api/v2/anime/kucing", param: "none", method: "GET", hint: ".kyiokucing (foto kucing)" },
  { cmd: "kyioanimequote", path: "/api/v2/quotes/anime", param: "none", method: "GET", hint: ".kyioanimequote" },
  { cmd: "kyiocharacter", path: "/api/v2/character", param: "q", method: "GET", hint: ".kyiocharacter <nama karakter>" },
  { cmd: "kyiodonghub", path: "/api/v2/anime/donghub", param: "q", method: "GET", hint: ".kyiodonghub <judul donghua>" },
  { cmd: "kyiolk21", path: "/api/v2/movie/lk21", param: "q", method: "GET", hint: ".kyiolk21 <judul film> (premium — 3x gratis)", note: "premium, 3x gratis" },
  { cmd: "kyiomyanimelist", path: "/api/v2/myanimelist", param: "q", method: "GET", hint: ".kyiomyanimelist <judul anime>" },
  { cmd: "kyiootakudesu", path: "/api/v2/anime/otakudesu", param: "q", method: "GET", hint: ".kyiootakudesu <judul anime>" },
  { cmd: "kyioanimeindo", path: "/api/v2/anime/animeindo", param: "q", method: "GET", hint: ".kyioanimeindo <judul anime>" },
  { cmd: "kyiowaifugallery", path: "/api/v2/anime/waifu-gallery", param: "q", method: "GET", hint: ".kyiowaifugallery <kategori>" },
  { cmd: "kyioshinigami", path: "/api/v2/manga/shinigami/search", param: "q", method: "GET", hint: ".kyioshinigami <judul manga>" },
  { cmd: "kyioshinigamidetail", path: "/api/v2/manga/shinigami/detail", param: "q", method: "GET", hint: ".kyioshinigamidetail <url manga>" },
  { cmd: "kyioshinigamichapter", path: "/api/v2/manga/shinigami/chapter", param: "q", method: "GET", hint: ".kyioshinigamichapter <url chapter>" },
  { cmd: "kyioluvyaa", path: "/api/v2/manga/luvyaa", param: "q", method: "POST", hint: ".kyioluvyaa <judul manga>" },
  { cmd: "kyiotracemoe", path: "/api/v2/tracemoe", param: "url", method: "GET", hint: ".kyiotracemoe <reply screenshot anime>" },
  { cmd: "kyiosakuranovel", path: "/api/v2/anime/sakuranovel", param: "q", method: "GET", hint: ".kyiosakuranovel <judul novel>" },
  { cmd: "kyioklikxximovie", path: "/api/v2/movie/klikxxi", param: "q", method: "GET", hint: ".kyioklikxximovie <judul film>" },
  { cmd: "kyioanimewallpaper", path: "/api/v2/anime/wallpaper", param: "type", method: "GET", hint: ".kyioanimewallpaper <karakter/anime>" },
];

const pluginConfig = {
  name: "kyiomovie",
  alias: ["kyiomovie", "kyiodanbooru", "kyiodanborupopular", "kyiodanborurandom", "kyiokonachan", "kyiokucing", "kyioanimequote", "kyiocharacter", "kyiodonghub", "kyiolk21", "kyiomyanimelist", "kyiootakudesu", "kyioanimeindo", "kyiowaifugallery", "kyioshinigami", "kyioshinigamidetail", "kyioshinigamichapter", "kyioluvyaa", "kyiotracemoe", "kyiosakuranovel", "kyioklikxximovie", "kyioanimewallpaper"],
  category: "anime",
  desc: "KyioAPI Movie & Anime — 21 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiodanbooru <tag>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Movie & Anime" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
