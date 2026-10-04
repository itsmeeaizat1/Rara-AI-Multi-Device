// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { scSearch } from "./soundcloud.js";
import scdl from "../../src/scraper/soundclouddl.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
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
  name: "playsoundcloud",
  alias: ["playsoundcloud", "playsc"],
  category: "search",
  description: "Cari dan download lagu dari SoundCloud",
  usage: ".playsc judul",
  example: ".playsc Only We Know",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { args, sock }) {
  if (!args[0]) {
    let txt = `🎶 *play soundcloud* 🎶\n\n`;
    txt += `Halo kak! Pengen dengerin lagu dari SoundCloud? Aku bisa cariin sekalian downloadin format MP3-nya buat kamu!\n\n`;
    txt += `*cara pakai:*\n`;
    txt += `👉 \`${m.prefix}playsc <judul lagu>\`\n\n`;
    txt += `*contoh:*\n`;
    txt += `\`${m.prefix}playsc Only We Know\``;
    return await m.reply(raraWrap("playsoundcloud", txt));
  }
  try {
    const searchResults = await scSearch(args.join(" "));
    if (!searchResults.length) {
      return m.reply(raraError("PlaySoundcloud", "Lagunya gak nemu nih! Coba judul lain ya"));
    }

    const track = searchResults[0];
    const downloadInfo = await scdl(track.url);
    let contentTxt = `🎵 *judul :* ${downloadInfo.title}\n`;
    contentTxt += `👤 *uploader :* ${downloadInfo.uploader}\n`;
    contentTxt += `⏱️ *durasi :* ${downloadInfo.duration}\n`;
    contentTxt += `👁️ *views :* ${downloadInfo.views}\n`;
    contentTxt += `❤️ *likes :* ${downloadInfo.likes}\n`;
    contentTxt += `📦 *ukuran :* ${downloadInfo.size}`;

    let txt = `🎉 *berhasil download lagu!* 🎉\n\n`;
    txt += contentTxt.trim().split("\n").map(line => `${line}`).join("\n");
    txt += `\n\n`;
    txt += `_Audio MP3 sedang dikirim, ditunggu ya kak!_ 🎶`;

    await sock.sendMedia(m.chat, downloadInfo.thumbnail || track.artwork, txt.trim(), m, { type: "image" });
    await sock.sendMedia(m.chat, downloadInfo.download_url, downloadInfo.title, m, { type: "audio" });
    const c = await dlCard("audio", { url: downloadInfo.download_url }, [["Judul", String(downloadInfo.title || "SoundCloud Audio").slice(0, 40)], ["Uploader", String(downloadInfo.uploader || "-").slice(0, 40)]]);
    if (c) await m.reply(c);
  } catch (e) {
    m.reply(raraError("PlaySoundcloud", `Gagal download lagu nih: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
