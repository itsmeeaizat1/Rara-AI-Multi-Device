// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/tools/web.js — .web — LIVE HTML DI DALAM WHATSAPP
//
// Request owner 2026-09-07 (inspirasi video bot scene: "html + live, nyambung
// ke websocket, bisa buka YouTube dll di dalam WA"):
// Kirim interactive card dengan tombol nativeFlow cta_url — pas di-tap,
// WhatsApp buka URL di WEBVIEW DI DALAM APLIKASI (gak keluar WA).
// Halaman live-nya di-host oleh bot sendiri (src/lib/nova-web-server.js,
// web/live.html — live via SSE push tiap 2 detik).
//
// Command:
//   .web                     → guide + daftar preset
//   .web list                → daftar preset lengkap
//   .web live                → Nova Live Dashboard (stat server realtime)
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
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "nova";
import { config } from "../../config.js";
import { smallcapsText, toSC } from "../../src/lib/styler.js";
import { novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getNovaWebUrl } from "../../src/lib/nova-web-server.js";

const BOT_REPO = "itsmeeaizat/Nova-AI-Whatsapp-Bot-Multi-Device";

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
const PRESETS = {
  yt: {
    title: "YouTube",
    desc: "Nonton YouTube di dalam WA",
    build: async (args) => {
      // Argumen berupa URL → langsung buka video itu
      const direct = args.find((a) => /^https?:\/\//i.test(a));
      if (direct) return direct;
      const q = args.join(" ").trim();
      if (!q) return "https://m.youtube.com";
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
            ["--no-warnings", "--flat-playlist", "--print", "%(webpage_url)s", `ytsearch1:${q}`],
            { timeout: 10000 },
            (err, stdout) => (err || !stdout ? reject(err) : resolve(stdout.trim().split("\n")[0]))
          );
        });
        if (videoUrl) return videoUrl;
      } catch {}
      // Fallback: buka halaman hasil pencarian
      return `https://m.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    },
  },
  google: {
    title: "Google",
    desc: "Pencarian Google",
    build: async (args) =>
      args.length
        ? `https://www.google.com/search?q=${encodeURIComponent(args.join(" "))}`
        : "https://www.google.com",
  },
  maps: {
    title: "Maps",
    desc: "Google Maps",
    build: async (args) =>
      args.length
        ? `https://www.google.com/maps/search/${encodeURIComponent(args.join(" "))}`
        : "https://www.google.com/maps",
  },
  wiki: {
    title: "Wikipedia",
    desc: "Wikipedia Indonesia",
    build: async (args) =>
      args.length
        ? `https://id.wikipedia.org/w/index.php?search=${encodeURIComponent(args.join(" "))}`
        : "https://id.wikipedia.org",
  },
  berita: {
    title: "Berita",
    desc: "Google News",
    build: async (args) =>
      args.length
        ? `https://news.google.com/search?q=${encodeURIComponent(args.join(" "))}`
        : "https://news.google.com",
  },
  tokopedia: {
    title: "Tokopedia",
    desc: "Cari produk Tokopedia",
    build: async (args) =>
      args.length
        ? `https://www.tokopedia.com/search?st=product&q=${encodeURIComponent(args.join(" "))}`
        : "https://www.tokopedia.com",
  },
  shopee: {
    title: "Shopee",
    desc: "Cari produk Shopee",
    build: async (args) =>
      args.length
        ? `https://shopee.co.id/search?keyword=${encodeURIComponent(args.join(" "))}`
        : "https://shopee.co.id",
  },
  tiktok: {
    title: "TikTok",
    desc: "Cari video TikTok",
    build: async (args) =>
      args.length
        ? `https://www.tiktok.com/search?q=${encodeURIComponent(args.join(" "))}`
        : "https://www.tiktok.com",
  },
  cuaca: {
    title: "Cuaca",
    desc: "wttr.in — cuaca ringan tanpa JS berat",
    build: async (args) =>
      `https://wttr.in/${encodeURIComponent(args.join("_") || "Jakarta")}`,
  },
  gh: {
    title: "GitHub",
    desc: "Buka repo GitHub (tanpa arg → repo bot)",
    build: async (args) => {
      const target = args.join(" ").trim();
      if (!target || target === "repo") return `https://github.com/${BOT_REPO}`;
      if (/^https?:\/\//i.test(target)) return target;
      return `https://github.com/${target.replace(/^@/, "").replace(/^.*github\.com\//i, "")}`;
    },
  },
};

function presetListText() {
  const lines = Object.entries(PRESETS).map(
    ([key, p]) => `• .web ${key} — ${p.desc}`
  );
  return `「 ✦ WEB PRESET ✦ 」\n\n${lines.join("\n")}\n• .web live — Nova Live Dashboard (stat realtime bot)\n• .web <url> [judul] — buka URL apa pun`;
}

// ── CARD ──────────────────────────────────────────────────────────────
// Bangun interactive card: banner (kalau ada) + body + tombol cta_url.
// Pola sama dengan nova-menu-card (viewOnceMessage → interactiveMessage).
async function sendWebCard(sock, m, { url, title = "", text = "" }) {
  const botName = config.bot?.name || "Nova AI";
  const botVersion = config.bot?.version || "23.0.0";

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

// ── HANDLER ───────────────────────────────────────────────────────────
async function handler(sock, m, { args, text, react, reply }) {
  const cmd = (args[0] || "").toLowerCase();

  // Guide
  if (!cmd) {
    return reply(
      novaGuide(
        "web",
        "Buka halaman web/HTML live langsung di dalam WhatsApp — preset lengkap untuk nonton, cari, belanja.",
        ".web list (lihat semua preset)\n.web live\n.web yt judul lagu",
        "Webview muncul di WhatsApp versi baru (Android); versi lama/iPhone bisa buka browser biasa."
      )
    );
  }

  // Daftar preset
  if (cmd === "list" || cmd === "preset" || cmd === "presets") {
    return reply(presetListText());
  }

  // Preset: Nova Live Dashboard
  if (cmd === "live" || cmd === "dashboard") {
    await react("🕒");
    const url = getNovaWebUrl();
    try {
      await sendWebCard(sock, m, {
        url,
        title: "Nova Live Dashboard",
        text: "Nova Live Dashboard - stat server realtime\nJam live - Uptime - RAM - CPU - Demo YouTube",
      });
      await react("🐣");
    } catch (e) {
      await react("❌");
      return reply(
        `Card webview gagal dikirim — fallback link biasa:\n${url}\n\nInfo: ${e?.message || "unknown error"}`
      );
    }
    return;
  }

  // Preset situs (yt, google, maps, dll)
  const preset = PRESETS[cmd];
  if (preset) {
    await react("🕒");
    try {
      const url = await preset.build(args.slice(1));
      await sendWebCard(sock, m, { url, title: preset.title });
      await react("🐣");
    } catch (e) {
      await react("❌");
      return reply(`Preset .web ${cmd} gagal: ${e?.message || "unknown error"}`);
    }
    return;
  }

  // URL custom
  const maybeUrl = args.find((a) => /^https?:\/\//i.test(a));
  if (!maybeUrl) {
    await react("❗");
    return reply(novaNoInput("web", `Format salah. Ketik .web list buat lihat semua preset, atau masukkan URL diawali http:// atau https://`));
  }

  await react("🕒");
  // Judul = semua args SETELAH url
  const urlIdx = args.indexOf(maybeUrl);
  const title = args.slice(urlIdx + 1).join(" ").slice(0, 40);

  try {
    await sendWebCard(sock, m, { url: maybeUrl, title });
    await react("🐣");
  } catch (e) {
    await react("❌");
    return reply(`Card webview gagal — fallback link: ${maybeUrl}\n\nInfo: ${e?.message || "unknown error"}`);
  }
}

export { pluginConfig as config, handler };
