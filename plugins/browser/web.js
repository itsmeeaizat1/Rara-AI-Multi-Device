// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/browser/web.js — .web — LIVE HTML DI DALAM WHATSAPP
//
// Request owner 2026-09-07 (inspirasi video bot scene: "html + live, nyambung
// ke websocket, bisa buka YouTube dll di dalam WA"):
// Kirim interactive card dengan tombol nativeFlow cta_url — pas di-tap,
// WhatsApp buka URL di WEBVIEW DI DALAM APLIKASI (gak keluar WA).
// Halaman live-nya di-host oleh bot sendiri (src/lib/rara-web-server.js,
// web/live.html — live via SSE push tiap 2 detik).
//
// Command:
//   .web                     → guide + daftar preset
//   .web list                → daftar preset lengkap
//   .web live                → Rara Live Dashboard (stat server realtime)
//   .web yt <judul|url>      → YouTube (query → resolve video pertama via
//                               yt-dlp; gagal → buka halaman hasil cari)
//   .web google <query>      → pencarian Google
//   .web maps <tempat>       → Google Maps
//   .web wiki <query>        → Wikipedia Indonesia
//   .web berita [topik]      → Google News
//   .web tokopedia <produk>  → cari produk Tokopedia
//   .web shopee <produk>     → cari produk Shopee
//   .web tiktok <query>      → cari TikTok
//   .web cuaca <kota>        → wttr.in (halaman cuaca ringan)
//   .web gh <user/repo|repo> → GitHub (tanpa arg → repo bot)
//   .web <url> [judul...]    → card webview untuk URL apa pun (http/https)
//
// CATATAN JUJUR (biar gak halusinasi): ini payload UNOFFICIAL ala scene —
// render webview tergantung versi WhatsApp penerima (Android baru oke,
// iPhone/WA lama kadang cuma buka browser). Meta bisa patch kapan pun.
// Fallback aman udah disediain (link plain text) kalau card gagal.

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "rara";
import { config } from "../../config.js";
import { sendRichMessage } from "../../src/lib/rara-rich-response.js";
import {
  getYouTubeInfo, getYouTubeFeed, formatYouTubeRich, formatYouTubeFeedRich,
  pipedSuggestions, extractVideoId,
} from "../../src/lib/rara-youtube-info.js";
import { sendGoogleSerpRich } from "../../src/lib/rara-web-rich.js";
import { smallcapsText, toSC } from "../../src/lib/styler.js";
import { raraGuide, raraNoInput, raraError } from "../../src/lib/rara-menu-style.js";
import { getNovaWebUrl } from "../../src/lib/rara-web-server.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const BOT_REPO = "itsmeeaizat/Rara-AI-Whatsapp-Bot-Multi-Device";

const pluginConfig = {
  name: "web",
  alias: ["web", "webview", "livehtml"],
  category: "browser",
  description: "Buka halaman web/HTML live di dalam WhatsApp (webview card) — preset lengkap",
  usage: ".web\n.web list\n.web live\n.web yt <judul>\n.web <preset> <query>\n.web <url> [judul]",
  example: ".web live\n.web yt crab rave\n.web google cuaca jakarta\n.web https://example.com Judul Bebas",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 8,
  isEnabled: true,
};

// ── PRESET ─────────────────────────────────────────────────────────────
// Tiap preset: judul tombol + builder URL dari sisa argumen.
// group: search / sosmed / downloader / game / lain

// Helper preset search sederhana: ada argumen → ?query=, kosong → homepage
const q = (home, search) => async (args) =>
  args.length
    ? search.replace("{q}", encodeURIComponent(args.join(" ")))
    : home;

const PRESETS = {
  yt: {
    title: "YouTube",
    desc: "Nonton YouTube di dalam WA",
    group: "sosmed",
    build: async (args) => {
      // Argumen berupa URL → langsung buka video itu
      const direct = args.find((a) => /^https?:\/\//i.test(a));
      if (direct) return direct;
      const query = args.join(" ").trim();
      if (!query) return "https://m.youtube.com";
      // Query → resolve video pertama via yt-dlp (timeout 10 dtk)
      // Binary: youtube-dl-exec (npm) kalau ada, sisanya PATH sistem.
      try {
        const localBin = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "../../node_modules/youtube-dl-exec/bin/yt-dlp"
        );
        const ytdlp = fsSync.existsSync(localBin) ? localBin : "yt-dlp";
        const videoUrl = await new Promise((resolve, reject) => {
          execFile(
            ytdlp,
            ["--no-warnings", "--flat-playlist", "--print", "%(webpage_url)s", `ytsearch1:${query}`],
            { timeout: 10000 },
            (err, stdout) => (err || !stdout ? reject(err) : resolve(stdout.trim().split("\n")[0]))
          );
        });
        if (videoUrl) return videoUrl;
      } catch {}
      // Fallback: buka halaman hasil pencarian
      return `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    },
  },

  // ── 🔍 SEARCH ENGINE ──
  google: {
    title: "Google",
    desc: "Pencarian Google",
    group: "search",
    build: q("https://www.google.com", "https://www.google.com/search?q={q}"),
  },
  bing: {
    title: "Bing",
    desc: "Microsoft Bing",
    group: "search",
    build: q("https://www.bing.com", "https://www.bing.com/search?q={q}"),
  },
  baidu: {
    title: "Baidu",
    desc: "Search engine China no.1",
    group: "search",
    build: q("https://www.baidu.com", "https://www.baidu.com/s?wd={q}"),
  },
  duckduckgo: {
    title: "DuckDuckGo",
    desc: "Search engine privat tanpa tracking",
    group: "search",
    build: q("https://duckduckgo.com", "https://duckduckgo.com/?q={q}"),
  },
  yahoo: {
    title: "Yahoo",
    desc: "Yahoo Search",
    group: "search",
    build: q("https://search.yahoo.com", "https://search.yahoo.com/search?p={q}"),
  },
  yandex: {
    title: "Yandex",
    desc: "Search engine Rusia",
    group: "search",
    build: q("https://yandex.com", "https://yandex.com/search/?text={q}"),
  },
  brave: {
    title: "Brave",
    desc: "Brave Search independen",
    group: "search",
    build: q("https://search.brave.com", "https://search.brave.com/search?q={q}"),
  },
  ecosia: {
    title: "Ecosia",
    desc: "Search engine tanam pohon",
    group: "search",
    build: q("https://www.ecosia.org", "https://www.ecosia.org/search?q={q}"),
  },

  // ── 💬 SOSMED ──
  tiktok: {
    title: "TikTok",
    desc: "Cari video TikTok",
    group: "sosmed",
    build: q("https://www.tiktok.com", "https://www.tiktok.com/search?q={q}"),
  },
  facebook: {
    title: "Facebook",
    desc: "Facebook / cari orang & post",
    group: "sosmed",
    build: q("https://www.facebook.com", "https://www.facebook.com/search/top?q={q}"),
  },
  instagram: {
    title: "Instagram",
    desc: "Instagram / jelajah hashtag",
    group: "sosmed",
    build: async (args) =>
      args.length
        ? `https://www.instagram.com/explore/tags/${encodeURIComponent(args.join("").replace(/\s+/g, ""))}/`
        : "https://www.instagram.com",
  },
  twitter: {
    title: "X / Twitter",
    desc: "Twitter X — cari post realtime",
    group: "sosmed",
    build: q("https://x.com", "https://x.com/search?q={q}"),
  },
  threads: {
    title: "Threads",
    desc: "Threads by Instagram",
    group: "sosmed",
    build: q("https://www.threads.net", "https://www.threads.net/search?q={q}"),
  },
  reddit: {
    title: "Reddit",
    desc: "Forum diskusi dunia",
    group: "sosmed",
    build: q("https://www.reddit.com", "https://www.reddit.com/search/?q={q}"),
  },
  pinterest: {
    title: "Pinterest",
    desc: "Papan ide & gambar",
    group: "sosmed",
    build: q("https://id.pinterest.com", "https://id.pinterest.com/search/pins/?q={q}"),
  },
  linkedin: {
    title: "LinkedIn",
    desc: "Jejaring profesional",
    group: "sosmed",
    build: q("https://www.linkedin.com", "https://www.linkedin.com/search/results/all/?keywords={q}"),
  },
  telegram: {
    title: "Telegram",
    desc: "Web Telegram (perlu login)",
    group: "sosmed",
    build: async (args) =>
      args.length
        ? `https://t.me/s/${encodeURIComponent(args.join(" ").replace(/^@/, "").replace(/\s+/g, ""))}`
        : "https://web.telegram.org",
  },

  // ── 📥 WEB DOWNLOADER ──
  snaptik: {
    title: "SnapTik",
    desc: "Download video TikTok no watermark",
    group: "downloader",
    build: async () => "https://snaptik.app",
  },
  ssstik: {
    title: "sssTik",
    desc: "Download TikTok tanpa watermark",
    group: "downloader",
    build: async () => "https://ssstik.io",
  },
  sssig: {
    title: "sssInstagram",
    desc: "Download video/reel/foto Instagram",
    group: "downloader",
    build: async () => "https://sssinstagram.com",
  },
  savefrom: {
    title: "SaveFrom",
    desc: "Download video dari banyak situs",
    group: "downloader",
    build: async () => "https://id.savefrom.net",
  },
  y2mate: {
    title: "Y2Mate",
    desc: "Download YouTube MP3/MP4",
    group: "downloader",
    build: async () => "https://www.y2mate.nu",
  },
  ssyoutube: {
    title: "SSYouTube",
    desc: "Download video YouTube",
    group: "downloader",
    build: async () => "https://ssyoutube.com",
  },
  tikwm: {
    title: "TikWM",
    desc: "Download TikTok + Douyin",
    group: "downloader",
    build: async () => "https://tikwm.com",
  },
  sssdouyin: {
    title: "Douyin DL",
    desc: "Download video Douyin",
    group: "downloader",
    build: async () => "https://www.douyin.com",
  },

  // ── 🎮 WEB GAME ──
  game2048: {
    title: "2048",
    desc: "Puzzle angka legendaris",
    group: "game",
    build: async () => "https://play2048.co",
  },
  dino: {
    title: "Dino Chrome",
    desc: "Game T-Rex offline Chrome",
    group: "game",
    build: async () => "https://chromedino.com",
  },
  wordle: {
    title: "Wordle",
    desc: "Tebak kata 5 huruf NYT",
    group: "game",
    build: async () => "https://www.nytimes.com/games/wordle",
  },
  minesweeper: {
    title: "Minesweeper",
    desc: "Tandai bom klasik Windows",
    group: "game",
    build: async () => "https://minesweeper.online",
  },
  qwop: {
    title: "QWOP",
    desc: "Lari paling susah sedunia",
    group: "game",
    build: async () => "https://www.foddy.net/Athletics.html",
  },
  cookieclicker: {
    title: "Cookie Clicker",
    desc: "Klik kuki sampai kecanduan",
    group: "game",
    build: async () => "https://orteil.dashnet.org/cookieclicker",
  },
  sandspiel: {
    title: "Sandspiel",
    desc: "Simulasi pasir & elemen unik",
    group: "game",
    build: async () => "https://sandspiel.club",
  },
  powder: {
    title: "Powder Game",
    desc: "Dust/powder physics game",
    group: "game",
    build: async () => "https://dan-ball.jp/en/javagame/dust/",
  },
  slither: {
    title: "Slither.io",
    desc: "Ular multiplayer battle",
    group: "game",
    build: async () => "https://slither.io",
  },
  agar: {
    title: "Agar.io",
    desc: "Makan tumbuh jadi raksasa",
    group: "game",
    build: async () => "https://agar.io",
  },
  diep: {
    title: "Diep.io",
    desc: "Tank battle multiplayer",
    group: "game",
    build: async () => "https://diep.io",
  },
  paperio: {
    title: "Paper.io",
    desc: " rebut wilayah kertas",
    group: "game",
    build: async () => "https://paper-io.com",
  },
  skribbl: {
    title: "Skribbl.io",
    desc: "Tebak gambar bareng temen",
    group: "game",
    build: async () => "https://skribbl.io",
  },
  krunker: {
    title: "Krunker.io",
    desc: "FPS pixel ringan di browser",
    group: "game",
    build: async () => "https://krunker.io",
  },
  zombsroyale: {
    title: "ZombsRoyale",
    desc: "Battle royale 100 pemain",
    group: "game",
    build: async () => "https://zombsroyale.io",
  },

  // ── 🌐 LAIN-LAIN ──
  maps: {
    title: "Maps",
    desc: "Google Maps",
    group: "lain",
    build: async (args) =>
      args.length
        ? `https://www.google.com/maps/search/${encodeURIComponent(args.join(" "))}`
        : "https://www.google.com/maps",
  },
  wiki: {
    title: "Wikipedia",
    desc: "Wikipedia Indonesia",
    group: "lain",
    build: q("https://id.wikipedia.org", "https://id.wikipedia.org/w/index.php?search={q}"),
  },
  berita: {
    title: "Berita",
    desc: "Google News",
    group: "lain",
    build: q("https://news.google.com", "https://news.google.com/search?q={q}"),
  },
  tokopedia: {
    title: "Tokopedia",
    desc: "Cari produk Tokopedia",
    group: "lain",
    build: q("https://www.tokopedia.com", "https://www.tokopedia.com/search?st=product&q={q}"),
  },
  shopee: {
    title: "Shopee",
    desc: "Cari produk Shopee",
    group: "lain",
    build: q("https://shopee.co.id", "https://shopee.co.id/search?keyword={q}"),
  },
  cuaca: {
    title: "Cuaca",
    desc: "wttr.in — cuaca ringan tanpa JS berat",
    group: "lain",
    build: async (args) =>
      `https://wttr.in/${encodeURIComponent(args.join("_") || "Jakarta")}`,
  },
  gh: {
    title: "GitHub",
    desc: "Buka repo GitHub (tanpa arg → repo bot)",
    group: "lain",
    build: async (args) => {
      const target = args.join(" ").trim();
      if (!target || target === "repo") return `https://github.com/${BOT_REPO}`;
      if (/^https?:\/\//i.test(target)) return target;
      return `https://github.com/${target.replace(/^@/, "").replace(/^.*github\.com\//i, "")}`;
    },
  },
  poki: {
    title: "Poki",
    desc: "Portal ribuan web game",
    group: "game",
    build: q("https://poki.com", "https://poki.com/en/search?q={q}"),
  },
  crazygames: {
    title: "CrazyGames",
    desc: "Portal game online gratis",
    group: "game",
    build: q("https://www.crazygames.com", "https://www.crazygames.com/search?q={q}"),
  },
  iogames: {
    title: "io Games",
    desc: "Direktori semua game .io",
    group: "game",
    build: async () => "https://iogames.space",
  },
};

// Alias preset biar gampang diingat
const PRESET_ALIASES = {
  youtube: "yt",
  x: "twitter",
  tw: "twitter",
  fb: "facebook",
  ig: "instagram",
  tt: "tiktok",
  douyin: "tikwm",
  douyindl: "tikwm",
  yt5s: "ssyoutube",
  snapsave: "sssig",
  snapinsta: "sssig",
  sssinstagram: "sssig",
  notube: "ssyoutube",
  ytmp3: "y2mate",
  2048: "game2048",
  trex: "dino",
  mines: "minesweeper",
  cookie: "cookieclicker",
  slitherio: "slither",
  agario: "agar",
  papers: "paperio",
};

function presetListText() {
  const GROUPS = [
    ["search", "🔍 SEARCH ENGINE"],
    ["sosmed", "💬 SOSMED"],
    ["downloader", "📥 WEB DOWNLOADER"],
    ["game", "🎮 WEB GAME"],
    ["lain", "🌐 LAIN-LAIN"],
  ];
  let out = "「 ✦ WEB PRESET ✦ 」\n";
  for (const [g, label] of GROUPS) {
    const items = Object.entries(PRESETS).filter(([, p]) => p.group === g);
    if (!items.length) continue;
    out += `\n${label}\n`;
    out += items.map(([key, p]) => `• .web ${key} — ${p.desc}`).join("\n");
  }
  out += "\n\n• .web live — Rara Live Dashboard (stat realtime bot)\n• .web <url> [judul] — buka URL apa pun\n• .web list <kata> — filter preset";
  return out;
}

// ── CARD ──────────────────────────────────────────────────────────────
// Bangun interactive card: banner (kalau ada) + body + tombol cta_url.
// Pola sama dengan rara-menu-card (viewOnceMessage → interactiveMessage).
async function sendWebCard(sock, m, { url, title = "", text = "" }) {
  const botName = config.bot?.name || "Rara AI";
  const botVersion = config.bot?.version || "24.0.0";

  // Banner: pakai thumbnail menu bot — kalau gak ada, card tetap jalan tanpa header.
  let header = { title: "", hasMediaAttachment: false };
  try {
    const bannerPath = path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
    const raw = await fs.readFile(bannerPath);
    const prep = await prepareWAMessageMedia({ image: raw }, { upload: sock.waUploadToServer });
    if (prep?.imageMessage) header = { hasMediaAttachment: true, imageMessage: prep.imageMessage };
  } catch {}

  // GUARD SMALLCAPS: body/footer/tombol smallcaps — URL tetap persis.
  const bodyText = smallcapsText(
    `${text || "Klik tombol di bawah untuk buka halaman ini di dalam WhatsApp"}\n\n${url}`
  );
  const footerText = toSC(`${botName} • v${botVersion}`);

  const interactiveObj = {
    header: proto.Message.InteractiveMessage.Header.fromObject(header),
    body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footerText }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
      buttons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: toSC(title || "Buka Halaman"),
            url,
            merchant_url: url,
          }),
        },
      ],
    }),
    contextInfo: {
      mentionedJid: m.sender ? [m.sender] : [],
    },
  };

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveObj),
        },
      },
    },
    { userJid: m.sender }
  );

  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  return true;
}


// ── MODE KIRIM LINK ────────────────────────────────────────────────────
// card  → webview interaktif di dalam WA (default)
// text  → link dikirim sebagai markdown code block (trik ala TikTok):
//         dibuka di browser bawaan HP, posisi chat gak kegeser pas balik,
//         cocok banget buat main game sambil mantengin chat.
const TEXT_MODE_TOKENS = new Set(["md", "markdown", "text"]);

async function getWebSendMode() {
  try {
    const db = await getDatabase();
    return db.data.settings?.webSendMode === "text" ? "text" : "card";
  } catch {
    return "card";
  }
}

async function setWebSendMode(mode) {
  try {
    const db = await getDatabase();
    if (!db.data.settings) db.data.settings = {};
    db.data.settings.webSendMode = mode;
    await db.save();
  } catch (e) {
    console.error("[web.js] gagal simpan webSendMode:", e?.message);
  }
}

async function sendWebLinkText(reply, url, title, modeNote) {
  return reply(
    (title ? `*${title}*\n\n` : "") +
      (modeNote
        ? "Ketuk link di bawah — dibuka di browser, chat gak bakal kegeser:\n\n"
        : "") +
      "```\n" + url + "\n```"
  );
}

// ── HANDLER ───────────────────────────────────────────────────────────
async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();

  // Guide
  if (!cmd) {
    return m.reply(
      raraGuide(
        "web",
        "Buka halaman web/HTML live langsung di dalam WhatsApp — preset lengkap untuk nonton, cari, belanja.",
        ".web list (lihat semua preset)\n.web mode card/text — atur cara kirim link\n.web yt judul lagu\n.web 2048 md — link text sekali pakai",
        "Webview muncul di WhatsApp versi baru (Android); versi lama/iPhone bisa buka browser biasa."
      )
    );
  }

  // Daftar preset (bisa difilter: .web list game / .web list search)
  if (cmd === "list" || cmd === "preset" || cmd === "presets") {
    const filterKey = (args[1] || "").toLowerCase();
    if (filterKey) {
      const all = Object.entries(PRESETS).filter(
        ([key, p]) =>
          key.includes(filterKey) ||
          (p.title || "").toLowerCase().includes(filterKey) ||
          (p.group || "").includes(filterKey) ||
          (p.desc || "").toLowerCase().includes(filterKey)
      );
      if (!all.length) return m.reply(raraError("Web", `Gak ada preset yang cocok dengan kata "${filterKey}". Ketik .web list buat lihat semua.`));
      return m.reply(
        `「 ✦ WEB PRESET ✦ 」\n\n` +
          all.map(([key, p]) => `• .web ${key} — ${p.desc}`).join("\n")
      );
    }
    return m.reply(presetListText());
  }

  // Preset: Rara Live Dashboard
  if (cmd === "live" || cmd === "dashboard") {
    await m.react("🕒");
    const url = getNovaWebUrl();
    try {
      await sendWebCard(sock, m, {
        url,
        title: "Rara Live Dashboard",
        text: "Rara Live Dashboard - stat server realtime\nJam live - Uptime - RAM - CPU - Demo YouTube",
      });
      await m.react("🐣");
    } catch (e) {
      await m.react("❌");
      return m.reply(
        `Card webview gagal dikirim — fallback link biasa:\n${url}\n\nInfo: ${e?.message || "unknown error"}`
      );
    }
    return;
  }

  // Mode kirim link: card (webview) / text (markdown, chat gak kegeser)
  if (cmd === "mode") {
    const sub = (args[1] || "").toLowerCase();
    const current = await getWebSendMode();
    if (sub === "card" || sub === "text") {
      await setWebSendMode(sub);
      return m.reply(
        sub === "text"
          ? `Mode kirim link: TEXT (markdown).\nLink dikirim sebagai code block — dibuka di browser bawaan, posisi chat gak kegeser pas balik. Cocok buat main game.\n\nBuat balik ke webview interaktif: .web mode card\nSekali pakai aja: .web <preset> md`
          : `Mode kirim link: CARD (webview interaktif).\nLink dibuka di dalam WhatsApp.\n\nBuat mode aman chat gak kegeser: .web mode text`
      );
    }
    return m.reply(
      raraGuide(
        "web mode",
        `Mode kirim link sekarang: ${current === "text" ? "TEXT (markdown)" : "CARD (webview)"}`,
        ".web mode card — webview interaktif di dalam WA\n.web mode text — link markdown code block, chat gak kegeser"
      )
    );
  }

  // Preset situs (yt, google, maps, dll)
  const presetKey = PRESETS[cmd] ? cmd : PRESET_ALIASES[cmd];
  const preset = presetKey ? PRESETS[presetKey] : null;

  // ── AI RICH (owner 10 Sep 2026: "fitur ai rich cm buat cmd .web —
  // .web youtube yg kebuka ai rich youtube, .web google yg kebuka ai
  // rich google search") — .web youtube/google <query> dirender AI rich
  // ala situs aslinya. Rich gagal → jatuh ke flow webview card lama. ──
  if (preset && (presetKey === "yt" || presetKey === "google")) {
    const richArgs = args.slice(1).filter((a) => !TEXT_MODE_TOKENS.has(String(a).toLowerCase()));
    const richQuery = richArgs.join(" ").trim();
    if (richQuery) {
      await m.react("🕒");
      let richOk = false;
      try {
        if (presetKey === "yt") {
          if (extractVideoId(richQuery)) {
            // .web youtube <link> → detail 1 video (tampilan watch page)
            const info = await getYouTubeInfo(richQuery);
            if (info) {
              const rich = formatYouTubeRich(info.video, {
                chips: [`${m.prefix}playaudio ${info.video.title}`, `${m.prefix}playvideo ${info.video.title}`],
              });
              richOk = await sendRichMessage(sock, m.chat, rich);
            }
          } else {
            // .web youtube <query> → feed hasil search ala YouTube asli
            const [feed, sugg] = await Promise.all([
              getYouTubeFeed(richQuery),
              pipedSuggestions(richQuery),
            ]);
            if (feed) {
              const chips = [
                `${m.prefix}playaudio ${richQuery}`,
                `${m.prefix}playvideo ${richQuery}`,
                ...sugg.filter((s) => s && s !== richQuery).slice(0, 2).map((s) => `${m.prefix}web youtube ${s}`),
              ];
              const rich = formatYouTubeFeedRich(feed.items, { query: richQuery, chips });
              richOk = await sendRichMessage(sock, m.chat, rich);
            }
          }
        } else if (presetKey === "google") {
          // .web google <query> → SERP ala buka google chrome
          richOk = await sendGoogleSerpRich(sock, m.chat, richQuery, { prefix: m.prefix });
        }
      } catch {}
      if (richOk) {
        await m.react("🐣");
        return;
      }
      // rich gagal → lanjut flow webview card lama di bawah (gak return)
      await m.react("🕒");
    }
  }

  if (preset) {
    await m.react("🕒");
    try {
      // flag sekali-pakai: .web 2048 md → kirim link text walau mode card
      const clean = args.slice(1).filter((a) => !TEXT_MODE_TOKENS.has(String(a).toLowerCase()));
      const oneOffText = clean.length !== args.slice(1).length;
      const url = await preset.build(clean);
      const useText = oneOffText || (await getWebSendMode()) === "text";
      if (useText) {
        await sendWebLinkText(m.reply, url, preset.title, oneOffText);
      } else {
        await sendWebCard(sock, m, { url, title: preset.title });
      }
      await m.react("🐣");
    } catch (e) {
      await m.react("❌");
      return m.reply(`Preset .web ${cmd} gagal: ${e?.message || "unknown error"}`);
    }
    return;
  }

  // URL custom
  const maybeUrl = args.find((a) => /^https?:\/\//i.test(a));
  if (!maybeUrl) {
    await m.react("❗");
    return m.reply(raraNoInput("web", `Format salah. Ketik .web list buat lihat semua preset, atau masukkan URL diawali http:// atau https://`));
  }

  await m.react("🕒");
  // Judul = semua args SETELAH url
  const urlIdx = args.indexOf(maybeUrl);
  const title = args.slice(urlIdx + 1).join(" ").slice(0, 40);

  try {
    // flag sekali-pakai md/text di URL custom juga
    const rawArgs = args.filter((a) => !TEXT_MODE_TOKENS.has(String(a).toLowerCase()));
    const oneOffText = rawArgs.length !== args.length;
    if (oneOffText || (await getWebSendMode()) === "text") {
      await sendWebLinkText(m.reply, maybeUrl, title, oneOffText);
    } else {
      await sendWebCard(sock, m, { url: maybeUrl, title });
    }
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    return m.reply(`Card webview gagal — fallback link: ${maybeUrl}\n\nInfo: ${e?.message || "unknown error"}`);
  }
}

export { pluginConfig as config, handler, PRESETS, PRESET_ALIASES, presetListText };
