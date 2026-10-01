// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spotplay.js — Putar musik dari Spotify (engine azbry)
//
// REVISI 14 Sep 2026 (owner: "disamain krna beda endpoint tp untuk dichat
// sama" → dikoreksi "gak mau dipakein formatter/card builder bareng yg
// dipaksa 2-2nya sama, tiap fitur field-nya beda-beda, takut ada yg field
// gak ada — pisah aja tiap fitur format cardnya"): dulu cuma kirim file
// audio doang tanpa card sama sekali. Sekarang dapet card, TAPI builder-nya
// LOKAL di file ini sendiri (gak import lib bersama) dengan field PALING
// MINIM dari 3 fitur spotify — karena API azbry cuma dikonfirmasi ngasih
// title/artist/downloadLink doang (live-checked 14 Sep 2026: 403 konsisten,
// gak bisa diverifikasi field lengkapnya). Album/Genre/Durasi DIOMIT kalau
// emang gak ada, gak dipaksa sama kayak .playspotify/.spotifyplay2.
import te from "../../src/lib/rara-error.js";
import raraApi from "../../src/lib/rara-apimanager.js";
import { raraWrap, raraBerhasil } from "../../src/lib/rara-menu-style.js";

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

// Card LOKAL punya .spotplay sendiri — field paling minim, cuma yang
// DIKONFIRMASI ada dari API azbry (title/artist/link). Album/Genre/Durasi
// dipasang OPSIONAL kalau kebetulan API ngasih (defensif, belum
// terverifikasi live karena endpoint lagi 403) — DIOMIT kalau kosong.
export function buildSpotplayCard({ title, album, genre, duration, artist, url }) {
  const lines = [`*Judul:* ${title || "-"}`];
  if (album) lines.push(`*Album:* ${album}`);
  if (genre) lines.push(`*Genre:* ${genre}`);
  if (duration) lines.push(`*Durasi:* ${duration}`);
  lines.push(`*Artis:* ${artist || "-"}`);
  lines.push(`*Format:* Audio MP3`);
  lines.push(``, `*Link:* ${url || "-"}`);
  return lines.join("\n");
}

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query)
    { const __navText = `⚠️ *cara pakai*\n\n\`${m.prefix}spotplay <query>\``; return await m.reply( __navText, "spotplay"); };
  try {
    await m.react("🕒");

    const data = await raraApi.azbry.spotplay(query, {
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

    // 2. Card info DIBAWAH media — builder & field LOKAL punya fitur ini,
    // cuma pakai apa yang beneran dikasih API (gak ada enrichment tambahan
    // biar sesuai data mentah azbry apa adanya)
    const cardText = buildSpotplayCard({
      title,
      album: result.album || null,
      genre: result.genre || null,
      duration: result.duration || null,
      artist,
      url: result.url || result.sourceUrl || "https://open.spotify.com/",
    });
    await m.reply(cardText);
    await m.react("🐣");
    await m.reply(raraBerhasil("spotplay"));
  } catch (e) {
    console.log(e);
    await m.react("❌");
    m.reply(raraWrap("spotplay", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
