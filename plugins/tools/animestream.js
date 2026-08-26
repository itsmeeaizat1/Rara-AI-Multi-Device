// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animestream2",
  alias: ["animestream2", "animestream", "animeinfo", "streamanime"],
  category: "tools",
  description: "Cari & streaming anime dari 14+ situs (Otakudesu, Samehadaku, dll)",
  usage: ".animestream <command> [args]",
  example: ".animestream search boruto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

const API_BASE = "https://www.sankavollerei.web.id";

// === RATE LIMITER ===
// Max 25 req/min (safety margin below 30 limit)
const RATE_LIMIT = 25;
const RATE_WINDOW = 60000; // 1 minute in ms
let requestTimestamps = [];

async function rateLimitedGet(endpoint) {
  // Clean old timestamps
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_WINDOW,
  );

  // If at limit, wait until oldest timestamp expires
  if (requestTimestamps.length >= RATE_LIMIT) {
    const oldest = requestTimestamps[0];
    const waitTime = RATE_WINDOW - (now - oldest) + 500; // +500ms buffer
    console.log(`[ANIMESTREAM] Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise((r) => setTimeout(r, waitTime));
    // Clean again after waiting
    const now2 = Date.now();
    requestTimestamps = requestTimestamps.filter(
      (ts) => now2 - ts < RATE_WINDOW,
    );
  }

  // Record this request
  requestTimestamps.push(Date.now());

  const url = `${API_BASE}${endpoint}`;
  const res = await axios.get(url, {
    timeout: 25000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    validateStatus: () => true,
  });

  return res;
}

// === SOURCES ===
const SOURCES = {
  otakudesu: {
    search: (q) => `/anime/search/${encodeURIComponent(q)}`,
    home: () => `/anime/home`,
    detail: (slug) => `/anime/anime/${slug}`,
    episode: (slug) => `/anime/episode/${slug}`,
    ongoing: (page) => `/anime/ongoing-anime${page ? `?page=${page}` : ""}`,
    completed: (page) => `/anime/complete-anime${page ? `?page=${page}` : ""}`,
    schedule: () => `/anime/schedule`,
    batch: (slug) => `/anime/batch/${slug}`,
    genre: () => `/anime/genre`,
    genreAnime: (slug, page) => `/anime/genre/${slug}${page ? `?page=${page}` : ""}`,
    searchKey: "animeList",
    titleKey: "title",
    idKey: "animeId",
    hrefKey: "href",
  },
  samehadaku: {
    search: (q) => `/anime/samehadaku/search?q=${encodeURIComponent(q)}`,
    home: () => `/anime/samehadaku/home`,
    detail: (slug) => `/anime/samehadaku/anime/${slug}`,
    episode: (slug) => `/anime/samehadaku/episode/${slug}`,
    ongoing: (page) => `/anime/samehadaku/ongoing${page ? `?page=${page}` : ""}`,
    completed: (page) => `/anime/samehadaku/completed${page ? `?page=${page}` : ""}`,
    popular: (page) => `/anime/samehadaku/popular${page ? `?page=${page}` : ""}`,
    schedule: () => `/anime/samehadaku/schedule`,
    searchKey: "results",
    titleKey: "title",
    idKey: "animeId",
    hrefKey: "href",
  },
  donghua: {
    search: (q, page) => `/anime/donghua/search/${encodeURIComponent(q)}/${page || 1}`,
    home: (page) => `/anime/donghua/home/${page || 1}`,
    detail: (slug) => `/anime/donghua/detail/${slug}`,
    episode: (slug) => `/anime/donghua/episode/${slug}`,
    ongoing: (page) => `/anime/donghua/ongoing/${page || 1}`,
    completed: (page) => `/anime/donghua/completed/${page || 1}`,
    latest: (page) => `/anime/donghua/latest/${page || 1}`,
    schedule: () => `/anime/donghua/schedule`,
    searchKey: "animeList",
    titleKey: "title",
    idKey: "animeId",
    hrefKey: "href",
  },
  kusonime: {
    search: (q, page) => `/anime/kusonime/search/${encodeURIComponent(q)}${page ? `?page=${page}` : ""}`,
    latest: (page) => `/anime/kusonime/latest${page ? `?page=${page}` : ""}`,
    detail: (slug) => `/anime/kusonime/detail/${slug}`,
    searchKey: "animeList",
    titleKey: "title",
    idKey: "slug",
    hrefKey: "href",
  },
  anoboy: {
    search: (q, page) => `/anime/anoboy/search/${encodeURIComponent(q)}${page ? `?page=${page}` : ""}`,
    home: (page) => `/anime/anoboy/home${page ? `?page=${page}` : ""}`,
    detail: (slug) => `/anime/anoboy/anime/${slug}`,
    episode: (slug) => `/anime/anoboy/episode/${slug}`,
    searchKey: "animeList",
    titleKey: "title",
    idKey: "slug",
    hrefKey: "href",
  },
  oploverz: {
    search: (q) => `/anime/oploverz/search/${encodeURIComponent(q)}`,
    home: () => `/anime/oploverz/home`,
    ongoing: (page) => `/anime/oploverz/ongoing${page ? `?page=${page}` : ""}`,
    completed: (page) => `/anime/oploverz/completed${page ? `?page=${page}` : ""}`,
    detail: (slug) => `/anime/oploverz/anime/${slug}`,
    episode: (slug) => `/anime/oploverz/episode/${slug}`,
    searchKey: "animeList",
    titleKey: "title",
    idKey: "animeId",
    hrefKey: "href",
  },
};

const SOURCE_ALIASES = {
  ota: "otakudesu", otakudesu: "otakudesu", od: "otakudesu",
  same: "samehadaku", samehadaku: "samehadaku", sh: "samehadaku",
  donghua: "donghua", dh: "donghua", dong: "donghua",
  kuso: "kusonime", kusonime: "kusonime", kn: "kusonime",
  anoboy: "anoboy", ab: "anoboy",
  oploverz: "oploverz", op: "oploverz", opl: "oploverz",
};

// === HELPERS ===
function extractAnimeList(data, source) {
  const cfg = SOURCES[source];
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];
  // Try searchKey first, then common keys
  const keys = [cfg.searchKey, "animeList", "results", "data", "list"];
  for (const k of keys) {
    if (data[k] && Array.isArray(data[k])) return data[k];
  }
  // Check nested
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

function truncate(str, max = 300) {
  if (!str) return "N/A";
  if (typeof str === "object") {
    if (str.paragraphs) return str.paragraphs.join("\n\n").slice(0, max);
    return JSON.stringify(str).slice(0, max);
  }
  return str.length > max ? str.slice(0, max) + "..." : str;
}

// === HANDLERS ===
async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase().trim();
  const sourceInput = (args[1] || "").toLowerCase().trim();

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Anime Stream Search\n\n`;
    txt += `14+ situs anime (Sanka API)\n`;
    txt += `Rate limit: 25 req/min (safe mode)\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}animestream search <judul>\` - Cari anime\n`;
    txt += `2. \`${m.prefix}animestream detail <slug>\` - Detail anime + episode list\n`;
    txt += `3. \`${m.prefix}animestream episode <slug>\` - Link nonton episode\n`;
    txt += `4. \`${m.prefix}animestream home\` - Halaman utama\n`;
    txt += `5. \`${m.prefix}animestream ongoing\` - Anime ongoing\n`;
    txt += `6. \`${m.prefix}animestream completed\` - Anime tamat\n`;
    txt += `7. \`${m.prefix}animestream schedule\` - Jadwal rilis\n`;
    txt += `8. \`${m.prefix}animestream popular\` - Anime populer (Samehadaku)\n\n`;
    txt += `Pilih sumber (default: otakudesu):\n`;
    txt += `\`${Object.keys(SOURCES).join("`, `")}\`\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}animestream search boruto\`\n`;
    txt += `\`${m.prefix}animestream search one piece samehadaku\`\n`;
    txt += `\`${m.prefix}animestream detail borot-sub-indo\`\n`;
    txt += `\`${m.prefix}animestream ongoing donghua\``;
    return await m.reply( txt, { commandName: "animestream" });
  }

  await m.react("🕒");

  try {
    // Determine source
    let source = "otakudesu";
    let cmdArgs = args.slice(1);

    // Check if second arg is a source name
    if (sourceInput && SOURCE_ALIASES[sourceInput]) {
      source = SOURCE_ALIASES[sourceInput];
      cmdArgs = args.slice(2);
    }

    const cfg = SOURCES[source];
    if (!cfg) {
      return m.reply(claraWrap("animestream2", `Sumber tidak ditemukan!\n\nTersedia: ${Object.keys(SOURCES).join(", ")}`));
    }

    // === SEARCH ===
    if (cmd === "search" || cmd === "cari" || cmd === "s") {
      const query = cmdArgs.join(" ").trim();
      if (!query) {
        return m.reply(`Masukkan judul anime!\n\n\`${m.prefix}animestream search <judul>\``);
      }

      const endpoint = cfg.search(query);
      const res = await rateLimitedGet(endpoint);

      if (res.status !== 200 || !res.data?.ok) {
        return m.reply(claraWrap("animestream2", `Gagal mencari. API mungkin sedang maintenance.`));
      }

      const list = extractAnimeList(res.data.data, source);
      if (!list.length) {
        return m.reply(claraWrap("animestream2", `Anime "${query}" tidak ditemukan di ${source}!`));
      }

      let txt = `Hasil Pencarian: ${query}\n`;
      txt += `Sumber: ${source}\n`;
      txt += `Ditemukan: ${list.length} anime\n\n`;

      for (let i = 0; i < Math.min(list.length, 10); i++) {
        const a = list[i];
        const title = a[cfg.titleKey] || a.title || a.name || "?";
        const id = a[cfg.idKey] || a.slug || a.animeId || "";
        const href = a[cfg.hrefKey] || "";
        const slug = id || (href ? href.split("/").pop() : "");

        txt += `${i + 1}. ${title}\n`;
        if (a.status) txt += `   Status: ${a.status}\n`;
        if (a.episodes) txt += `   Episodes: ${a.episodes}\n`;
        if (slug) txt += `   Detail: \`${m.prefix}animestream detail ${slug}${source !== "otakudesu" ? " " + source : ""}\`\n`;
        txt += `\n`;
      }

      if (list.length > 10) txt += `Dan ${list.length - 10} lainnya...`;
      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === DETAIL ===
    else if (cmd === "detail" || cmd === "d" || cmd === "info") {
      const slug = cmdArgs.join(" ").trim();
      if (!slug) {
        return m.reply(claraWrap("Animestream", `Masukkan slug anime!\n\nGunakan search dulu untuk mencari slug.`));
      }

      const endpoint = cfg.detail(slug);
      const res = await rateLimitedGet(endpoint);

      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil detail. Periksa slug atau coba sumber lain.`));
      }

      const a = res.data.data;
      let txt = `Detail Anime\n\n`;
      txt += `Title: ${a.title || "?"}\n`;
      if (a.japanese) txt += `Japanese: ${a.japanese}\n`;
      if (a.status) txt += `Status: ${a.status}\n`;
      if (a.type) txt += `Type: ${a.type}\n`;
      if (a.rating) txt += `Rating: ${a.rating}\n`;
      if (a.score) txt += `Score: ${a.score}\n`;
      if (a.studio) txt += `Studio: ${a.studio}\n`;
      if (a.releaseDate) txt += `Released: ${a.releaseDate}\n`;
      if (a.totalEpisodes) txt += `Total Episodes: ${a.totalEpisodes}\n`;

      // Genres
      const genres = a.genres || [];
      if (genres.length) {
        const genreNames = genres.map((g) => (typeof g === "object" ? g.name : g));
        txt += `Genres: ${genreNames.join(", ")}\n`;
      }

      txt += `\n`;

      // Synopsis
      if (a.synopsis) {
        txt += `Synopsis:\n${truncate(a.synopsis, 400)}\n\n`;
      }

      // Episode list
      const episodes = a.episodeList || a.episodes || [];
      if (episodes.length) {
        txt += `Episodes (${episodes.length} total):\n`;
        for (let i = 0; i < Math.min(episodes.length, 10); i++) {
          const ep = episodes[i];
          const epTitle = ep.title || ep.episode || `Episode ${i + 1}`;
          const epHref = ep.href || "";
          const epSlug = epHref ? epHref.split("/").pop() : (ep.slug || ep.episodeId || "");
          txt += `${i + 1}. ${epTitle}\n`;
          if (epSlug) txt += `   Nonton: \`${m.prefix}animestream episode ${epSlug}${source !== "otakudesu" ? " " + source : ""}\`\n`;
        }
        if (episodes.length > 10) txt += `\nDan ${episodes.length - 10} episode lainnya...`;
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === EPISODE ===
    else if (cmd === "episode" || cmd === "e" || cmd === "nonton" || cmd === "watch") {
      const slug = cmdArgs.join(" ").trim();
      if (!slug) {
        return m.reply(claraWrap("Animestream", `Masukkan slug episode!\n\nGunakan detail untuk melihat daftar episode.`));
      }

      const endpoint = cfg.episode(slug);
      const res = await rateLimitedGet(endpoint);

      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil link episode.`));
      }

      const data = res.data.data;
      let txt = `Link Nonton Episode\n\n`;
      txt += `Title: ${data.title || slug}\n`;

      // Stream servers
      const servers = data.serverList || data.servers || data.streamServers || [];
      if (servers.length) {
        txt += `\nServer Streaming:\n`;
        for (let i = 0; i < servers.length; i++) {
          const s = servers[i];
          const sName = s.name || s.serverName || `Server ${i + 1}`;
          const sUrl = s.url || s.embedUrl || s.link || "";
          txt += `${i + 1}. ${sName}\n`;
          if (sUrl) txt += `   ${sUrl}\n`;
        }
      }

      // Download links
      const downloads = data.downloadList || data.downloads || [];
      if (downloads.length) {
        txt += `\nDownload Links:\n`;
        for (let i = 0; i < Math.min(downloads.length, 5); i++) {
          const dl = downloads[i];
          const q = dl.quality || dl.title || `Quality ${i + 1}`;
          txt += `${q}:\n`;
          const links = dl.links || dl.downloadLinks || [];
          for (const l of links) {
            txt += `   ${l.name || l.host || "?"}: ${l.url || l.link || ""}\n`;
          }
        }
      }

      if (!servers.length && !downloads.length) {
        txt += `\nTidak ada link tersedia. Mungkin perlu akses via server ID.\n`;
        if (data.serverId) {
          txt += `Coba: \`${m.prefix}animestream server ${data.serverId}\``;
        }
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === HOME ===
    else if (cmd === "home" || cmd === "h" || cmd === "beranda") {
      const endpoint = cfg.home();
      const res = await rateLimitedGet(endpoint);

      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil data home.`));
      }

      const data = res.data.data;
      let txt = `Anime Home (${source})\n\n`;

      // Ongoing
      const ongoing = data.ongoing?.animeList || data.ongoing || [];
      if (ongoing.length) {
        txt += `Sedang Tayang:\n`;
        for (let i = 0; i < Math.min(ongoing.length, 5); i++) {
          const a = ongoing[i];
          txt += `${i + 1}. ${a.title || "?"}`;
          if (a.episodes) txt += ` (${a.episodes} eps)`;
          txt += `\n`;
        }
        txt += `\n`;
      }

      // Latest/Release
      const latest = data.latestRelease?.animeList || data.latest || [];
      if (latest.length) {
        txt += `Rilisan Terbaru:\n`;
        for (let i = 0; i < Math.min(latest.length, 5); i++) {
          const a = latest[i];
          txt += `${i + 1}. ${a.title || "?"}\n`;
          if (a.releaseDay) txt += `   Hari: ${a.releaseDay}\n`;
        }
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === ONGOING ===
    else if (cmd === "ongoing" || cmd === "o" || cmd === "tayang") {
      const page = parseInt(cmdArgs[0]) || 1;
      const endpoint = cfg.ongoing ? cfg.ongoing(page) : null;
      if (!endpoint) {
        return m.reply(claraWrap("Animestream", `Sumber ${source} tidak punya endpoint ongoing.`));
      }

      const res = await rateLimitedGet(endpoint);
      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil data ongoing.`));
      }

      const list = extractAnimeList(res.data.data, source);
      let txt = `Anime Ongoing (${source})\n`;
      txt += `Halaman ${page}\n\n`;

      for (let i = 0; i < Math.min(list.length, 10); i++) {
        const a = list[i];
        txt += `${i + 1}. ${a[cfg.titleKey] || a.title || "?"}\n`;
        if (a.episodes) txt += `   ${a.episodes} eps\n`;
        if (a.releaseDay) txt += `   Hari: ${a.releaseDay}\n`;
        const id = a[cfg.idKey] || a.slug || "";
        if (id) txt += `   \`${m.prefix}animestream detail ${id}${source !== "otakudesu" ? " " + source : ""}\`\n`;
        txt += `\n`;
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === COMPLETED ===
    else if (cmd === "completed" || cmd === "c" || cmd === "tamat") {
      const page = parseInt(cmdArgs[0]) || 1;
      const endpoint = cfg.completed ? cfg.completed(page) : null;
      if (!endpoint) {
        return m.reply(claraWrap("Animestream", `Sumber ${source} tidak punya endpoint completed.`));
      }

      const res = await rateLimitedGet(endpoint);
      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil data completed.`));
      }

      const list = extractAnimeList(res.data.data, source);
      let txt = `Anime Tamat (${source})\n`;
      txt += `Halaman ${page}\n\n`;

      for (let i = 0; i < Math.min(list.length, 10); i++) {
        const a = list[i];
        txt += `${i + 1}. ${a[cfg.titleKey] || a.title || "?"}\n`;
        const id = a[cfg.idKey] || a.slug || "";
        if (id) txt += `   \`${m.prefix}animestream detail ${id}${source !== "otakudesu" ? " " + source : ""}\`\n`;
        txt += `\n`;
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === SCHEDULE ===
    else if (cmd === "schedule" || cmd === "jadwal") {
      const endpoint = cfg.schedule ? cfg.schedule() : null;
      if (!endpoint) {
        return m.reply(claraWrap("Animestream", `Sumber ${source} tidak punya endpoint schedule.`));
      }

      const res = await rateLimitedGet(endpoint);
      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil jadwal rilis.`));
      }

      const data = res.data.data;
      let txt = `Jadwal Rilis Anime (${source})\n\n`;

      if (Array.isArray(data)) {
        for (const day of data) {
          const dayName = day.day || day.name || "?";
          const animes = day.animeList || day.anime || [];
          txt += `${dayName}:\n`;
          for (const a of animes) {
            txt += `   ${a.title || a.name || "?"}\n`;
          }
          txt += `\n`;
        }
      } else if (typeof data === "object") {
        for (const [day, animes] of Object.entries(data)) {
          txt += `${day}:\n`;
          if (Array.isArray(animes)) {
            for (const a of animes) {
              txt += `   ${typeof a === "string" ? a : (a.title || a.name || "?")}\n`;
            }
          }
          txt += `\n`;
        }
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }

    // === POPULAR (Samehadaku only) ===
    else if (cmd === "popular" || cmd === "populer") {
      const page = parseInt(cmdArgs[0]) || 1;
      if (source !== "samehadaku") {
        return m.reply(`Popular hanya tersedia di samehadaku.\n\n\`${m.prefix}animestream popular samehadaku\``);
      }

      const endpoint = cfg.popular(page);
      const res = await rateLimitedGet(endpoint);
      if (res.status !== 200 || !res.data?.data) {
        return m.reply(claraWrap("animestream2", `Gagal mengambil data popular.`));
      }

      const list = extractAnimeList(res.data.data, source);
      let txt = `Anime Populer (Samehadaku)\n`;
      txt += `Halaman ${page}\n\n`;

      for (let i = 0; i < Math.min(list.length, 10); i++) {
        const a = list[i];
        txt += `${i + 1}. ${a[cfg.titleKey] || a.title || "?"}\n`;
        if (a.rating) txt += `   Rating: ${a.rating}\n`;
        const id = a[cfg.idKey] || a.slug || "";
        if (id) txt += `   \`${m.prefix}animestream detail ${id} samehadaku\`\n`;
        txt += `\n`;
      }

      await m.reply(claraWrap("animestream2", txt));
      await m.react("🐣");
    }


    // === GENRE LIST (Otakudesu only) ===
    else if (cmd === "genre" || cmd === "g" || cmd === "genres") {
      if (!cfg.genre) {
        return m.reply(`Genre tidak tersedia di ${source}.\n\nCoba: \`${m.prefix}animestream genre otakudesu\``);
      }

      // If there's a slug argument, show anime by genre
      const genreSlug = cmdArgs[0];
      if (genreSlug) {
        const page = parseInt(cmdArgs[1]) || 1;
        const endpoint = cfg.genreAnime ? cfg.genreAnime(genreSlug, page) : null;
        if (!endpoint) {
          return m.reply(claraWrap("Animestream", `Genre anime tidak tersedia di ${source}.`));
        }

        const res = await rateLimitedGet(endpoint);
        if (res.status !== 200 || !res.data?.data) {
          return m.reply(claraWrap("animestream2", `Gagal mengambil anime genre "${genreSlug}".`));
        }

        const list = extractAnimeList(res.data.data, source);
        let txt = `Anime Genre: ${genreSlug}\n`;
        txt += `Sumber: ${source} | Halaman ${page}\n\n`;

        for (let i = 0; i < Math.min(list.length, 15); i++) {
          const a = list[i];
          txt += `${i + 1}. ${a[cfg.titleKey] || a.title || "?"}\n`;
          const id = a[cfg.idKey] || a.slug || "";
          if (id) txt += `   \`${m.prefix}animestream detail ${id}${source !== "otakudesu" ? " " + source : ""}\`\n`;
          txt += `\n`;
        }

        txt += `Halaman ${page}. Ketik angka untuk ganti halaman.\n`;
        txt += `Contoh: \`${m.prefix}animestream genre ${genreSlug} ${page + 1}${source !== "otakudesu" ? " " + source : ""}\``;

        await m.reply(claraWrap("animestream2", txt));
        await m.react("🐣");
      } else {
        // List all genres
        const endpoint = cfg.genre();
        const res = await rateLimitedGet(endpoint);
        if (res.status !== 200 || !res.data?.data) {
          return m.reply(claraWrap("animestream2", `Gagal mengambil daftar genre.`));
        }

        const genreData = res.data.data;
        let genres = [];
        if (Array.isArray(genreData)) {
          genres = genreData;
        } else if (genreData?.genreList) {
          genres = genreData.genreList;
        } else if (genreData?.genres) {
          genres = genreData.genres;
        }

        let txt = `Daftar Genre (${source})\n\n`;
        for (let i = 0; i < Math.min(genres.length, 30); i++) {
          const g = genres[i];
          const name = typeof g === "string" ? g : (g.name || g.title || g.genre || "?");
          const slug = typeof g === "string" ? g.toLowerCase() : (g.slug || g.id || g.link || "");
          txt += `${i + 1}. ${name}\n`;
          if (slug) txt += `   \`${m.prefix}animestream genre ${slug}${source !== "otakudesu" ? " " + source : ""}\`\n`;
        }

        if (genres.length > 30) {
          txt += `\n... dan ${genres.length - 30} genre lainnya.\n`;
        }

        await m.reply(claraWrap("animestream2", txt));
        await m.react("🐣");
      }
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}animestream help\` untuk melihat semua perintah.`);
    }
  } catch (e) {
    console.error("[ANIMESTREAM] Error:", e.message);
    let txt = `Gagal memproses!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("animestream2", txt));
  }
}

export { pluginConfig as config, handler };
