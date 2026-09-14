// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spotplay.js — Putar musik dari Spotify (engine azbry)
// REVISI 14 Sep 2026 (owner: "disamain krna beda endpoint tp untuk dichat
// sama") — dulu cuma kirim file audio doang, gak ada info card sama sekali.
// Sekarang pakai buildSpotifyPlayCard bareng .playspotify/.spotifyplay2
// (src/lib/nova-spotify-play-card.js), dikirim DIBAWAH media. Album/Genre/
// Durasi gak dijamin ada dari azbry → di-enrich best-effort dari iTunes.
// GOTCHA: endpoint azbry LIVE-CHECKED 14 Sep 2026 → 403 konsisten (source
// spotify.com kena blok), jadi belum bisa live-verified end-to-end — tapi
// kode + card format tetap dipasang biar otomatis jalan begitu upstream pulih.
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap, novaBerhasil } from "../../src/lib/nova-menu-style.js";
import { buildSpotifyPlayCard, enrichSpotifyMeta } from "../../src/lib/nova-spotify-play-card.js";

const pluginConfig = {
  name: "spotplay",
  alias: ["spotplay"],
  category: "search",
  description: "Putar musik dari Spotify",
  usage: ".spotplay <query>",
  example: ".spotplay neffex grateful",
  cooldown: 20,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query)
    { const __navText = `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n\`${m.prefix}spotplay <query>\``; return await m.reply( __navText, "spotplay"); };
  try {
    await m.react("🕒");

    const data = await novaApi.azbry.spotplay(query, {
      timeout: 30000,
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!data?.status || !data?.result?.downloadLink) {
      throw new Error(data?.message || "Lagu Spotify tidak ditemukan");
    }

    const result = data.result;
    const title = result.title || query;
    const artist = result.artist || null;

    // 1. Media dulu (audio gak bisa caption di WhatsApp)
    await sock.sendMedia(m.chat, result.downloadLink, null, m, {
      type: "audio",
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${artist || "Spotify"} - ${title}.mp3`,
    });

    // 2. Enrich Album/Genre/Durasi yang kosong dari engine (best-effort)
    const meta = await enrichSpotifyMeta(title, artist, {
      needAlbum: !result.album,
      needGenre: true,
      needDuration: !result.duration,
    });

    // 3. Card info DIBAWAH media — field sama persis .playspotify/.spotifyplay2
    const cardText = buildSpotifyPlayCard({
      title,
      album: result.album || meta.album,
      genre: meta.genre,
      duration: result.duration || meta.duration,
      artist,
      format: "Audio MP3",
      url: result.url || result.sourceUrl || "https://open.spotify.com/",
    });
    await m.reply(cardText);
    await m.react("🐣");
    await m.reply(novaBerhasil("spotplay"));
  } catch (e) {
    console.log(e);
    await m.react("❌");
    m.reply(claraWrap("spotplay", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
