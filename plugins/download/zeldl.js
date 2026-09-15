// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zeldl — downloader ZelAPI (kategori /docs/download zelapi):
//   all (generic multi-platform) | spotify (meta + preview) | scribd (meta + dl)
// 🔹 .zeldl <url> — kind auto-detect dari link
// 🔹 Alias: .zscribd <link> .zspotify <link> .zalldl <url> .zdownloader
// 🔹 Endpoint zelapi lain udah disweep 15 Sep 2026 — yang hidup cuma 3 ini
//   (youtube/dafont/lk21/idlix/pixiv/dzstream/9xbuddy dll mati server-side).
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import {
  zeldlDownload, ZEL_DL_KINDS, detectZelDlKind, collectLinks, pickDirectLink, mediaTypeOf,
  _setZelDlHttpForTest, _setZelDlKeyForTest,
} from "../../src/scraper/zeldl.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { fetchBuffer } from "../../src/lib/nova-utils.js";

// seam test: mock unduh file
let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "zeldl",
  alias: ["zdownloader", "zeldownload", "zalldl", "zscribd", "zspotify"],
  category: "download",
  description: "Downloader ZelAPI — generic multi-platform, Spotify, Scribd",
  usage: ".zeldl <url> — kind otomatis dari link",
  example: ".zeldl <link> | .zscribd <link scribd> | .zspotify <link spotify>",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 300) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};
function safeName(title, ext) {
  const base = (title || "zelapi-media").replace(/[\\/:*?"<>|\n\r]/g, "").trim().slice(0, 60) || "zelapi-media";
  return `${base}.${ext}`;
}
const extOf = (u) => (String(u).split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || "mp4").toLowerCase();

// ── renderer kartu per kind ──
function cardSpotify(r) {
  const a = r?.result || r || {};
  const lines = [];
  if (v(a.title)) lines.push(`🎵 ${a.title}`);
  const artist = Array.isArray(a.artists) && a.artists.length ? a.artists.join(", ") : v(a.artist);
  if (artist) lines.push(`🎤 ${artist}`);
  if (v(a.album)) lines.push(`💿 ${a.album}`);
  const meta = [];
  if (v(a.duration)) meta.push(a.duration);
  if (v(a.release_year)) meta.push(a.release_year);
  if (meta.length) lines.push(`⏱️ ${meta.join(" · ")}`);
  if (v(a.thumbnail)) lines.push(`🖼️ ${a.thumbnail}`);
  return lines.join("\n");
}

function cardScribd(r) {
  const d = r?.document || {};
  const lines = [];
  if (v(d.title)) lines.push(`📄 ${d.title}`);
  if (v(d.author?.name)) lines.push(`👤 ${d.author.name}`);
  const meta = [];
  if (v(d.page_count)) meta.push(`${d.page_count} halaman`);
  if (v(d.views)) meta.push(`${d.views} views`);
  if (v(d.language)) meta.push(String(d.language).toUpperCase());
  if (meta.length) lines.push(`📊 ${meta.join(" · ")}`);
  if (v(d.description)) lines.push(`\n📝 ${short(d.description, 250)}`);
  const dl = d.download;
  if (dl && typeof dl === "object") {
    if (dl.is_available && Array.isArray(dl.formats) && dl.formats.length) lines.push(`\n✅ Bisa diunduh: ${dl.formats.join(", ")}`);
    else if (dl.is_available) lines.push("\n✅ Dokumen bisa diunduh");
    else lines.push("\n❌ Dokumen gak tersedia buat diunduh" + (dl.requires_login ? " (butuh login)" : dl.requires_subscription ? " (butuh langganan)" : ""));
  }
  return lines.length ? lines.join("\n") : null;
}

function cardAll(r, links) {
  const res = r?.result || {};
  const lines = [];
  if (v(res.title) || v(r?.title)) lines.push(`🎬 ${v(res.title) || v(r.title)}`);
  if (v(res.author) || v(r?.author)) lines.push(`👤 ${v(res.author) || v(r.author)}`);
  if (!links.length) {
    lines.push(`❌ ${v(res.error_message) || v(r?.message) || "ZelAPI gak nemu link unduhan buat URL ini"}`);
    return lines.join("\n");
  }
  lines.push("", `📥 ${links.length} link unduhan:`);
  links.slice(0, 5).forEach((l, i) => {
    const lab = l.label ? ` (${l.label})` : "";
    lines.push(`${i + 1}. ${short(l.url, 90)}${lab}`);
  });
  if (links.length > 5) lines.push(`… +${links.length - 5} lainnya`);
  return lines.join("\n");
}

// ── kirim media ke WA (pola alldownloaderv4) ──
async function sendMedia(sock, m, { buffer, type, url, title }) {
  const ext = extOf(url);
  if (type === "audio") {
    await sock.sendMessage(m.chat, { audio: buffer, mimetype: "audio/mpeg", ptt: false, fileName: safeName(title, ext === "mp3" ? "mp3" : ext) }, { quoted: m });
  } else if (type === "image") {
    await sock.sendMessage(m.chat, { image: buffer }, { quoted: m });
  } else if (type === "document") {
    await sock.sendMessage(m.chat, { document: buffer, fileName: safeName(title, ext), mimetype: "application/octet-stream" }, { quoted: m });
  } else {
    await sock.sendMessage(m.chat, { video: buffer, caption: `_(via zelapi) ${short(title || "media", 60)}`, mimetype: "video/mp4" }, { quoted: m });
  }
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const raw = (m.args || []).map(String).join(" ").trim();
    let kind = null;
    if (command === "zscribd") kind = "scribd";
    else if (command === "zspotify") kind = "spotify";
    else if (command === "zalldl" || command === "zdownloader" || command === "zeldownload") kind = "all";
    if (!raw) {
      await m.reply(claraWrap("zeldl", [
        "📥 ZELAPI DOWNLOADER — 3 engine hidup:",
        "",
        "▸ .zeldl <url> — generic multi-platform (auto-detect)",
        "▸ .zspotify <link spotify> — info lagu + preview audio",
        "▸ .zscribd <link scribd> — info dokumen + status unduh",
        "",
        "endpoint zelapi lain (youtube/lk21/idlix/pixiv/dafont dll) mati server-side — gak dipasang.",
      ].join("\n")));
      return;
    }
    if (!kind) kind = detectZelDlKind(raw);

    await m.react("🧠");
    const r = await zeldlDownload(kind, raw);
    if (!r.ok) { await m.react("❌"); await m.reply(claraWrap("zeldl", `Downloader ${ZEL_DL_KINDS[kind].label} bermasalah: ${r.error}`)); return; }

    if (kind === "scribd") {
      const card = cardScribd(r.data);
      if (/client challenge/i.test(String(r.data?.document?.title))) {
        await m.react("❌");
        await m.reply(claraWrap("zeldl", "Scribd nge-block scraper (Client Challenge) — coba dokumen lain"));
        return;
      }
      await m.reply(claraWrap("zeldl", card || "Data scribd kosong"));
      await m.react("🐣");
      return;
    }

    if (kind === "spotify") {
      const card = cardSpotify(r.data);
      await m.reply(claraWrap("zeldl", [
        "✅ SPOTIFY (zelapi)",
        "",
        card,
        "",
        r.data?.result?.audio_preview ? "🎧 preview 30 dtk nyusul…" : "gak ada preview buat lagu ini",
      ].join("\n")));
      const prev = v(r.data?.result?.audio_preview);
      if (prev) {
        try {
          const buf = await getBuf(prev);
          if (buf && buf.length > 1000) {
            await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: false, fileName: safeName(r.data?.result?.title, "mp3") }, { quoted: m });
          }
        } catch { /* preview gagal — kartu udah cukup */ }
      }
      await m.react("🐣");
      return;
    }

    // kind === all
    const links = collectLinks(r.data);
    const card = cardAll(r.data, links);
    const direct = pickDirectLink(links);
    if (direct) {
      await m.reply(claraWrap("zeldl", `${card}\n\n⏳ media nyusul, lagi diunduh…`));
      try {
        const buf = await getBuf(direct.url);
        if (!buf || buf.length < 1000) throw new Error("file kosong");
        await sendMedia(sock, m, { buffer: buf, type: mediaTypeOf(direct.url), url: direct.url, title: r.data?.result?.title });
        await m.react("🐣");
        return;
      } catch {
        await m.react("❌");
        await m.reply(claraWrap("zeldl", "Media gagal diunduh dari server — link di atas masih bisa dipakai manual"));
        return;
      }
    }
    await m.reply(claraWrap("zeldl", card));
    await m.react(links.length ? "🐣" : "❌");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(claraWrap("zeldl", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
