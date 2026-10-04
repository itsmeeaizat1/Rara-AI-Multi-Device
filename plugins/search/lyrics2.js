// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Lirik2 (v2 — Genius no-key scraper)
 * Fitur: Cari lirik lagu via scrape Genius.com TANPA API KEY.
 *        Source: script CommonJS dari owner (2026-09-06), di-port ke ESM
 *        di src/scraper/genius-lyrics.js.
 *        Beda dari .lirikv2 (genius-lyrics npm, butuh API key genius):
 *        engine ini murni scrape — hidup selama genius.com hidup.
 *        .lirik lama (nexray) otomatis fallback ke engine ini pas gagal.
 */

import { searchSongLyrics } from "../../src/scraper/genius-lyrics.js";
import { raraGuide, raraEmpty, raraError, toSC } from "../../src/lib/rara-menu-style.js";
import { lyricsCaption, enrichLyricsMeta } from "../../src/lib/rara-lyrics-format.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch download) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const pluginConfig = {
  name: "lirik2",
  alias: ["lirik2"],
  category: "search",
  description: "Cari lirik lagu via Genius (scrape langsung, tanpa API key)",
  usage: ".lirik2 <judul lagu>",
  example: ".lirik2 bohemian rhapsody",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = (m.text || "").trim();

  if (!query) {
    await m.react("❗");
    return m.reply(raraGuide("Lirik2", "Mau nyari lirik lagu? Ketik judul atau judul + artisnya ya!", `${m.prefix}lirik2 sempurna andra`));
  }

  try {
    await m.react("🕒");

    const result = await searchSongLyrics(query);

    if (!result?.status || !result?.data?.lyrics) {
      await m.react("❗");
      return m.reply(raraEmpty("Lirik2", `Gak nemu lirik untuk "${query}". Coba judul yang lebih spesifik, atau tambahin nama artisnya ya!`));
    }

    const d = result.data;

    // Caption hasil: plain text rapi (aturan: hasil fitur plain text)
    let lyrics = d.lyrics;
    if (lyrics.length > 3500) {
      lyrics = lyrics.slice(0, 3500) + "\n\n... (lirik dipotong, lengkapnya di " + d.url + ")";
    }

    // format owner 19 Sep: judul/artis/album/durasi → lirik
    // (genius scrape gak punya album/durasi → enrich dari LRCLIB)
    const meta = await enrichLyricsMeta(d.title, d.artist);
    const caption =
      lyricsCaption({
        title: d.title, artist: d.artist,
        album: meta?.album, duration: meta?.duration,
        lyrics,
      }) + `\n\nSource: Genius`;

    await m.react("🐣");

    // Kirim dengan thumbnail kalau ada
    if (d.thumbnail) {
      try {
        await sock.sendMessage(m.chat, { image: { url: d.thumbnail }, caption: ((await dlCard("gambar", { url: d.thumbnail }, [["Judul", String(d.title || query).slice(0, 40)], ["Penyanyi", String(d.artist || "-").slice(0, 40)]])) || caption) }, { quoted: m });
        return;
      } catch {
        // Thumbnail gagal → fallback ke text
      }
    }
    return m.reply(caption);
  } catch (err) {
    console.error("[lirik2] error:", err.message);
    await m.react("❗");
    return m.reply(raraError("Lirik2", "Server Genius lagi ngambek nih, coba lagi ya!"));
  }
}

export { pluginConfig as config, handler };
