// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playvideo.js — Search YouTube → download video → kirim langsung
// Resolusi: 360p / 480p (default) / 720p / HD 1080p
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { downloadVideo as downloadVideoYtDlp } from "../../src/scraper/nova-ytdlp.js";
import { toWhatsAppVideo } from "../../src/lib/nova-ffmpeg.js";
import { novaError, novaGuide, claraWrap, toSC, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { offerConvert } from "../../src/lib/nova-convert.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { sendMenuPreview } from "../../src/lib/send-menu.js";

const IKYY = "https://api.ikyyxd.my.id";

// Session pilihan resolusi (klik tombol) — TTL 5 menit
const PV_TTL = 5 * 60 * 1000;
const pvSessions = new Map(); // m.sender → { video, startedAt }

function savePvSession(m, video) {
  const key = m.sender;
  const old = pvSessions.get(key);
  if (old?.timer) clearTimeout(old.timer);
  const s = { video, startedAt: Date.now(), timer: null };
  s.timer = setTimeout(() => pvSessions.delete(key), PV_TTL);
  pvSessions.set(key, s);
}
function getPvSession(m) {
  const s = pvSessions.get(m.sender);
  if (!s || Date.now() - s.startedAt > PV_TTL) { if (s?.timer) clearTimeout(s.timer); pvSessions.delete(m.sender); return null; }
  return s;
}

async function fetchLyricsSnippet(title) {
  try {
    const { data } = await axios.get(`https://api.nexray.eu.cc/search/lyrics`, {
      params: { q: title },
      timeout: 8000,
    });
    if (data?.status && data?.result?.lyrics?.plain_lyrics) {
      const artist = data.result.artist || data.result.lyrics?.artist_name || null;
      const plain = data.result.lyrics.plain_lyrics.trim();
      const snippet = plain.length > 200 ? plain.slice(0, 200).trim() + "..." : plain;
      return { snippet, artist };
    }
  } catch (e) {
    console.error("[PlayVideo] Lyrics fetch error:", e.message);
  }
  return null;
}

const pluginConfig = {
  name: "playvideo",
  alias: ["playvideo"],
  category: "search",
  description: "Cari & download video YouTube (360p/480p/720p/HD)",
  usage: ".playvideo [360/480/720/hd] <query>",
  example: ".playvideo komang / .playvideo 720 komang",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

// Parse resolusi dari argumen pertama: 360/480/720/1080/hd (default 480)
function parseQualityArgs(args) {
  let quality = "480";
  let explicit = false;
  let query = args.join(" ").trim();
  const first = String(args[0] || "").toLowerCase().replace(/p$/, "");
  if (/^(360|480|720|1080|hd)$/.test(first)) {
    quality = first === "hd" ? "1080" : first;
    explicit = true;
    query = args.slice(1).join(" ").trim();
  }
  return { quality, query, explicit };
}

async function searchYoutube(query) {
  // Try 1: IkyyXD search
  try {
    const { data } = await axios.get(`${IKYY}/search/youtube`, {
      params: { query, apikey: "kyzz" },
      timeout: 15000,
    });
    if (data?.status && data?.result?.length) {
      const v = data.result[0];
      return {
        title: v.title,
        author: v.channel,
        duration: v.duration,
        views: 0,
        description: v.description || null,
        thumbnail: v.imageUrl || "",
        url: v.link,
      };
    }
  } catch (e) {
    console.error("[PlayVideo] IkyyXD search error:", e.message);
  }

  // Try 2: yt-search
  try {
    const yts = (await import("yt-search")).default;
    const search = await yts(query);
    if (search.videos?.length) {
      const v = search.videos[0];
      return {
        title: v.title,
        author: v.author.name,
        duration: v.duration.timestamp,
        views: v.views,
        description: v.description || null,
        thumbnail: v.thumbnail || "",
        url: v.url,
      };
    }
  } catch (e) {
    console.error("[PlayVideo] yt-search error:", e.message);
  }

  return null;
}

async function downloadVideo(url, quality) {
  // Try 1: yt-dlp / cobalt (nova-ytdlp) — dukung pilihan resolusi persis
  try {
    const result = await downloadVideoYtDlp(url, quality);
    if (result?.buffer?.length > 10000) {
      return { buffer: result.buffer, title: result.title };
    }
  } catch (e) {
    console.error("[PlayVideo] nova-ytdlp error:", e.message);
  }

  // Try 2: IkyyXD ytmp4 (tanpa kontrol kualitas — biasanya 720p)
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp4`, {
      params: { q: url, apikey: "kyzz" },
      timeout: 60000,
    });
    if (data?.status && data?.result) {
      const dl = data.result.VideoUrl?.url || data.result.download_url || data.result.url;
      if (dl) {
        const { data: buf } = await axios.get(dl, {
          responseType: "arraybuffer",
          timeout: 120000,
        });
        const buffer = Buffer.from(buf);
        if (buffer.length > 10000) {
          return { buffer, title: data.result.title };
        }
      }
    }
  } catch (e) {
    console.error("[PlayVideo] IkyyXD ytmp4 error:", e.message);
  }

  // Try 3: ytdl.js mp4
  try {
    const result = await ytdl(url, "mp4");
    if (result?.status && result?.dl) {
      const { data: buf } = await axios.get(result.dl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buffer = Buffer.from(buf);
      if (buffer.length > 10000) {
        return { buffer, title: result.title };
      }
    }
  } catch (e) {
    console.error("[PlayVideo] ytdl.js error:", e.message);
  }

  return null;
}

// Kirim video hasil download — dipakai jalur langsung & klik tombol
async function sendPlayVideo(sock, m, video, quality) {
  await m.react("🕒");

  const vid = await downloadVideo(video.url, quality);
  if (!vid?.buffer || vid.buffer.length < 10000) {
    await m.react("❌");
    return m.reply(novaGagal("PlayVideo"));
  }
  console.log(`[PlayVideo] Video OK: ${vid.buffer.length} bytes`);

  // Pastikan H.264+AAC (sumber savetube/ytdl diam-diam kasih AV1/VP9
  // yang gagal diputar di WA) + downscale ke resolusi yang diminta kalau perlu
  try {
    vid.buffer = await toWhatsAppVideo(vid.buffer, { maxHeight: parseInt(quality, 10) });
    console.log(`[PlayVideo] Video setelah convert ${quality}p: ${vid.buffer.length} bytes`);
  } catch (convErr) {
    console.error("[PlayVideo] Convert error, kirim buffer asli:", convErr.message);
  }

  // Ambil lirik (best-effort, gak block kalau gagal/timeout)
  const titleForLyrics = vid.title || video.title;
  const lyricsData = await fetchLyricsSnippet(titleForLyrics);

  const captionLines = [
    `*YouTube Play — Video ${quality === "1080" ? "HD" : quality + "p"}*`,
    ``,
    `*Judul:* ${titleForLyrics}`,
    `*Artis/Channel:* ${lyricsData?.artist || video.author}`,
    `*Durasi:* ${video.duration}`,
    `*Views:* ${video.views ? video.views.toLocaleString("id-ID") : "-"}`,
    `*Deskripsi:* ${video.description ? video.description.slice(0, 150) + (video.description.length > 150 ? "..." : "") : "-"}`,
    `*Link:* ${video.url}`,
  ];
  if (lyricsData?.snippet) {
    captionLines.push(``, `*Lirik:*`, lyricsData.snippet, ``, `Lirik lengkap: .lirik ${titleForLyrics}`);
  }

  // 1. Notifikasi sukses dulu (sesuai request owner)
  await m.react("🐣");
  await m.reply(novaBerhasil("Playvideo"));

  // 2. Baru videonya (caption info nempel di situ)
  await sock.sendMessage(
    m.chat,
    {
      video: vid.buffer,
      caption: captionLines.join("\n"),
      mimetype: "video/mp4",
      fileName: `${(vid.title || video.title).replace(/[^\w\s-]/g, "").substring(0, 50)}.mp4`,
      contextInfo: mediaPreviewCard({
        title: titleForLyrics,
        body: `YouTube Video • ${quality === "1080" ? "HD" : quality + "p"}`,
        sourceUrl: video.url,
        thumbnailUrl: video.thumbnail,
        mediaType: 2,
      }),
    },
    { quoted: m },
  );

  // 3. Tawaran convert di bawahnya
  await offerConvert(sock, m, { buffer: vid.buffer, type: "video", platform: "YouTube", title: titleForLyrics, sourceUrl: video.url });
}

async function handler(m, { sock }) {
  // ── Mode 2: Klik tombol resolusi (.playvideo_360/480/720/hd) ──
  const cmd = (m.command || "").toLowerCase();
  if (/^playvideo_(360|480|720|hd|1080)$/.test(cmd)) {
    const session = getPvSession(m);
    if (!session) {
      await m.react("❗");
      return m.reply(novaGuide("Playvideo", "Pilihan resolusi udah kedaluwarsa nih! Cari ulang videonya ya: .playvideo <judul>", ".playvideo komang"));
    }
    const quality = cmd.split("_")[1] === "hd" ? "1080" : cmd.split("_")[1];
    try {
      await sendPlayVideo(sock, m, session.video, quality);
    } catch (err) {
      console.error("[PlayVideo]", err.message || err);
      await m.react("❌");
      return m.reply(novaGangguan("PlayVideo"));
    }
    return;
  }

  const args = m.args || [];
  const { quality, query, explicit } = parseQualityArgs(args);

  // Usage: pilihan resolusi (default 480p)
  if (!query) {
    return m.reply(claraWrap("Playvideo", [
      `📌 Pilih Resolusi Video:`,
      ``,
      `360p · 480p · 720p · ʜᴅ (1080p)`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}playvideo komang → 480p (default)`,
      `${m.prefix}playvideo 720 komang → 720p`,
      `${m.prefix}playvideo hd komang → ʜᴅ 1080p`,
    ]));
  }

  try {
    await m.react("🕒");

    // Step 1: Search
    const video = await searchYoutube(query);
    if (!video) {
      await m.react("❌");
      return m.reply(novaGagal("PlayVideo"));
    }
    console.log(`[PlayVideo] Found: ${video.title} → ${video.url} (${quality}p)`);

    // Step 2: Kalau user belum pilih resolusi eksplisit → tawarkan tombol
    if (!explicit) {
      savePvSession(m, video);
      await m.react("🐣");
      const infoText = [
        `Video ketemu!`,
        ``,
        `Judul: ${video.title}`,
        `Channel: ${video.author}`,
        `Durasi: ${video.duration}`,
        ``,
        `Pilih resolusi di bawah`,
      ].join("\n");
      return await sendMenuPreview(sock, m, {
        text: infoText,
        footer: "",
        buttons: [
          { id: "playvideo_360", text: toSC("360p") },
          { id: "playvideo_480", text: toSC("480p") },
          { id: "playvideo_720", text: toSC("720p") },
          { id: "playvideo_hd", text: toSC("HD 1080p") },
        ],
        title: `${toSC("Nova AI")} — ${toSC("Playvideo")}`,
        body: toSC(video.title.slice(0, 40)),
        sourceUrl: video.url,
      });
    }

    // Step 3: Resolusi eksplisit (mis. .playvideo 720 judul) → langsung kirim
    await sendPlayVideo(sock, m, video, quality);
  } catch (err) {
    console.error("[PlayVideo]", err.message || err);
    await m.react("❌");
    return m.reply(novaGangguan("PlayVideo"));
  }
}

export { pluginConfig as config, handler };
