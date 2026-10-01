// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/bandcamp.js — BANDCAMP DIRECT ENGINE (ala Mori)
// Sumber referensi: github.com/coflyn/Mori — Bandcamp direct page scrape.
// Pattern VERIFIED LIVE 2026-09-07: page 200, trackinfo berupa JSON
// HTML-encoded (&quot;file&quot;:{&quot;mp3-128&quot;:&quot;https://t4.bcbits.com/stream/...&quot;})
// — stream URL langsung, tanpa key, tanpa server pihak ketiga.
// Support: /track/ (single) + /album/ (semua track di album).

// PENTING: pakai fetch native, BUKAN axios — redirect bandcamp custom-domain
// (mis. music.monstercat.com → monstercatmedia.bandcamp.com) via axios
// dapet stub anti-bot 3KB tanpa trackinfo; fetch native dapet full page.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Ambil array JSON setelah "trackinfo": — balanced-bracket scan
// biar gak gampang pecah walau ada kurung di dalam string.
function extractTrackinfo(html) {
  const decoded = decodeEntities(html);
  const idx = decoded.indexOf("trackinfo");
  if (idx === -1) return null;
  const open = decoded.indexOf("[", idx);
  if (open === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = open; i < decoded.length && i < open + 200000; i++) {
    const c = decoded[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (inStr) { if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(decoded.slice(open, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function matchProp(html, prop) {
  // og:image / og:title bisa kebentuk 2 urutan atribut
  const re = new RegExp(
    `(?:<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["'][^>]*>)`
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] || m[2]) : null;
}

export async function bandcampDownload(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Halaman bandcamp gak kebuka (HTTP ${res.status})`);
  }
  const html = await res.text();
  const trackinfo = extractTrackinfo(html);
  if (!trackinfo || !trackinfo.length) {
    throw new Error("trackinfo gak ketemu — bukan halaman track/album bandcamp atau strukturnya berubah");
  }

  const art = matchProp(html, "og:image");
  const albumTitle = matchProp(html, "og:title");
  const isAlbum = /\/album\//.test(url);

  const tracks = [];
  for (const t of trackinfo) {
    const mp3 = t?.file?.["mp3-128"] || t?.file?.["mp3-v0"];
    if (!mp3) continue;
    tracks.push({
      title: String(t.title || "Untitled").trim(),
      artist: t.artist || null,
      url: mp3,
      duration: t.duration ? Math.round(t.duration) : null,
    });
  }
  if (!tracks.length) {
    throw new Error("Gak ada stream mp3 di trackinfo (track mungkin unreleased)");
  }

  return {
    status: true,
    type: isAlbum ? "album" : "track",
    album: albumTitle || tracks[0].title,
    art,
    tracks,
  };
}

