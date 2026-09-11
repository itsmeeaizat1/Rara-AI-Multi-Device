// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playspotify.js — Play versi Spotify: cari lagu Spotify → download mp3 → kirim
// Request owner 11 Sep 2026: "buat fitur play tp versi spotify .playspotify"
// Engine: spotidown.app (src/scraper/spotidown.js) — meta lengkap dari Spotify
// (judul/artis/album/durasi/cover) + file mp3, dikirim pola .play:
// react 🕒→🐣, info section, file audio, offer convert.
import { searchSpotiDown, downloadSpotiAudio } from "../../src/scraper/spotidown.js";
import { novaGagal, novaGangguan, novaDlUsage, novaBerhasil } from "../../src/lib/nova-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";

const pluginConfig = {
  name: "playspotify",
  alias: ["playspotify"],
  category: "search",
  description: "Cari & kirim lagu versi Spotify (mp3, meta asli Spotify)",
  usage: ".playspotify <judul lagu>",
  example: ".playspotify faded alan walker",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = (m.args || []).join(" ").trim();

  if (!query) {
    return m.reply(
      novaDlUsage("Playspotify", {
        prefix: m.prefix,
        command: "playspotify",
        cara: [`${m.prefix}playspotify [judul lagu]`],
        contoh: [`${m.prefix}playspotify Faded Alan Walker`],
      })
    );
  }

  try {
    await m.react("🕒");

    // Step 1: Cari lagu (spotidown.app — meta asli Spotify)
    const track = await searchSpotiDown(query);
    console.log(`[Playspotify] Found: ${track.title} — ${track.artist} (${track.duration})`);
    await m.react("🎨");

    // Step 2: Download mp3
    const buffer = await downloadSpotiAudio(track.download_url);
    console.log(`[Playspotify] Audio OK: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

    const title = track.title || query;

    // Info section — WhatsApp gak support caption di pesan audio (pola .play)
    const infoLines = [
      `*Spotify Play — Audio*`,
      ``,
      `*Judul:* ${title}`,
      `*Artis:* ${track.artist || "-"}`,
      `*Album:* ${track.album || "-"}`,
      `*Durasi:* ${track.duration || "-"}`,
      `*Sumber:* Spotify (via spotidown)`,
    ];
    await m.reply(infoLines.join("\n"));

    // Step 3: File audionya + preview card meta Spotify
    await sock.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${title.replace(/[^\w\s-]/g, "").substring(0, 50)}.mp3`,
        contextInfo: mediaPreviewCard({
          title,
          body: `Spotify Audio • ${track.artist || ""}`,
          sourceUrl: "https://open.spotify.com/",
          thumbnailUrl: track.image,
        }),
      },
      { quoted: m }
    );

    // Step 4: Tawaran convert di bawahnya
    await offerConvert(sock, m, { buffer, type: "audio", platform: "Spotify", title, sourceUrl: "https://spotidown.app/" });
    await m.react("🐣");
    await m.reply(novaBerhasil("Playspotify"));
  } catch (err) {
    console.error("[Playspotify]", err.message || err);
    await m.react("❌");
    if (/tidak ditemukan|gak ketemu/i.test(err.message || "")) {
      return m.reply(
        novaGagal("Playspotify") + `\nLagu \`${query}\` gak ketemu — coba judul lengkapnya atau kata kunci lain.`
      );
    }
    if (/Link download gak ketemu|kosong/i.test(err.message || "")) {
      return m.reply(
        novaGagal("Playspotify") + "\nKetemu lagunya tapi file audionya gagal diambil — coba lagi sebentar ya."
      );
    }
    return m.reply(novaGangguan("Playspotify"));
  }
}

export { pluginConfig as config, handler };
