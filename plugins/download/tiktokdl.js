// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { offerConvert } from "../../src/lib/rara-convert.js";
import axios from "axios";
import { AIRich } from "../../src/lib/rara-builder.js";
import { raraGuide, raraError, raraEmpty, raraNoInput, raraWrap, raraLine, toSC, raraBerhasil, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { getdlTikTokSearch } from "../../src/scraper/getdl-tiktok.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


// Sesi hasil pencarian .tt keyword (ala .play): chat:sender → {videos, at}
const ttSearchSessions = new Map();
const TT_SESSION_TTL = 3 * 60 * 1000; // 3 menit

async function tiktokDl(url) {
  function formatNumber(integer) {
    let numb = parseInt(integer);
    return Number(numb).toLocaleString().replace(/,/g, ".");
  }

  function formatDate(n, locale = "en") {
    let d = new Date(n);
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }

  let data = [];
  const domain = "https://www.tikwm.com/api/";
  const res = (
    await axios.post(
      domain,
      {},
      {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://www.tikwm.com",
          Referer: "https://www.tikwm.com/",
          "Sec-Ch-Ua": '"Not)A;Brand" ;v="24" , "Chromium" ;v="116"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": "Android",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
        },
        params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
      },
    )
  ).data.data;

  // Pagar: link mati/private → tikwm balasin data kosong, jangan crash
  if (!res || !res.id) {
    throw new Error("Video TikTok gak ketemu — link private/udah dihapus?");
  }

  if (res?.duration == 0) {
    res.images.forEach((v) => data.push({ type: "photo", url: v }));
  } else {
    data.push(
      {
        type: "watermark",
        url: "https://www.tikwm.com" + res?.wmplay || "/undefined",
      },
      {
        type: "nowatermark",
        url: "https://www.tikwm.com" + res?.play || "/undefined",
      },
      {
        type: "nowatermark_hd",
        url: "https://www.tikwm.com" + res?.hdplay || "/undefined",
      },
    );
  }

  return {
    status: true,
    title: res.title,
    taken_at: formatDate(res.create_time).replace("1970", ""),
    region: res.region,
    id: res.id,
    durations: res.duration,
    duration: res.duration + " Seconds",
    cover: "https://www.tikwm.com" + res.cover,
    size_wm: res.wm_size,
    size_nowm: res.size,
    size_nowm_hd: res.hd_size,
    data,
    music_info: {
      id: res.music_info.id,
      title: res.music_info.title,
      author: res.music_info.author,
      album: res.music_info.album || null,
      url: "https://www.tikwm.com" + res.music || res.music_info.play,
    },
    stats: {
      views: formatNumber(res.play_count),
      likes: formatNumber(res.digg_count),
      comment: formatNumber(res.comment_count),
      share: formatNumber(res.share_count),
      download: formatNumber(res.download_count),
    },
    author: {
      id: res.author.id,
      fullname: res.author.unique_id,
      nickname: res.author.nickname,
      avatar: "https://www.tikwm.com" + res.author.avatar,
    },
  };
}

const pluginConfig = {
  name: ["tiktok", "tt", "ttmp4"],
  alias: ["tiktok", "tt", "ttmp4"],
  category: "download",
  description: "Download video TikTok (link) atau search keyword ala .play — list pilih nomor (data up-to-date via GetDL)",
  usage: ".tiktok <url/keyword> atau .tt <nomor> buat pilih hasil",
  example: ".tiktok https://vt.tiktok.com/xxx · .tt supra mk4 → .tt 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  const prefix = m.prefix;
  const command = m?.command;
  if (!text) {
    return m.reply(raraGuide("tiktok", {
 kaomoji: "(≧◡≦) ♡",
 sapaan: "tiktok favorit mau disimpen? kasih link atau keywordnya! (⌒‿⌒)ﻭ",
      cara: "tempel linknya atau ketik keyword pencariannya",
      contoh: `${prefix + command} https://vt.tiktok.com/xxx · ${prefix + command} viral`,
      note: "kalo pake keyword, nanti bot cariin videonya dulu",
      spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
    }), { commandName: "tiktok" });
  }
  // ─── Pilih hasil pencarian sebelumnya (ala .play): .tt 2 ───
  const isUrl = /https?:\/\/|tiktok\.com|vt\.tiktok|douyin/i.test(text);
  const pickMatch = text.match(/^(\d{1,2})$/);
  if (!isUrl && pickMatch) {
    const sesiKey = `${m.chat}:${m.sender}`;
    const sesi = ttSearchSessions.get(sesiKey);
    if (sesi && Date.now() - sesi.at < TT_SESSION_TTL) {
      const idx = parseInt(pickMatch[1], 10);
      const video = sesi.videos[idx - 1];
      if (!video) {
        await m.react("❗");
        return m.reply(raraWrap("TikTok Search", `Nomor ${idx} gak ada di hasil pencarian (1-${sesi.videos.length}). Ketik ulang keyword-nya ya!`));
      }
      try {
        await m.react("🕒");
        await m.react("⏬");
        let card = "";
        try {
          const info = await probeMedia(video.playUrl);
          card = mediaResultCard({
            header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
            title: video.title || "TikTok Video",
            type: "video",
            platform: "TikTok",
            duration: video.duration || null,
            size: info.size,
            mime: info.mime,
          });
        } catch {}
        await sock.sendMessage(m.chat, {
          video: { url: video.playUrl },
          caption: card || tiktokCaption({
            title: video.title || "TikTok Video",
            duration: video.duration || null,
            download: "SD",
          }),
          contextInfo: mediaPreviewCard({
            title: video.title || "TikTok Video",
            body: `TikTok • Hasil #${idx} dari pencarian`,
            sourceUrl: video.playUrl,
            thumbnailUrl: video.cover || "",
            mediaType: 2,
          }),
        }, { quoted: m });
        await m.react("🐣");
        await offerConvert(sock, m, { mediaUrl: video.playUrl, type: "video", platform: "TikTok", title: video.title, sourceUrl: video.playUrl });
        return;
      } catch (err) {
        console.error("[TikTok Search Pick]", err.message || err);
        await m.react("❌");
        return m.reply(raraGangguan("TikTok Search"));
      }
    }
    // Gak ada sesi aktif → jatuh ke search biasa dengan keyword angka
  }

  // ─── Jalur keyword search (bukan URL) — ala .play ───
  if (!isUrl) {
    try {
      await m.react("🕒");
      await m.react("🔍");
      // Data UP-TO-DATE via GetDL (request owner 2026-09-06: search lama
      // sering munculin video 2023). Fallback ke scraper lama kalau GetDL mati.
      let videos = [];
      let source = "GetDL";
      try {
        videos = await getdlTikTokSearch(text, { count: 10 });
      } catch (gdErr) {
        console.log("[TikTok Search] GetDL gagal, fallback scraper lama:", gdErr.message);
        videos = await tiktokSearchVideo(text, { count: 15 });
        source = "scraper lama";
      }
      if (!videos || videos.length === 0) {
        await m.react("❗");
        return m.reply(raraWrap("TikTok Search", `Gak nemu video untuk keyword: ${text}`));
      }

      // Simpan sesi biar bisa dipilih nomornya
      const sesiKey = `${m.chat}:${m.sender}`;
      ttSearchSessions.set(sesiKey, { videos, at: Date.now() });
      // Bersihin sesi basi biar gak numpuk di memori
      if (ttSearchSessions.size > 100) {
        const now = Date.now();
        for (const [k, v] of ttSearchSessions) {
          if (now - v.at > TT_SESSION_TTL) ttSearchSessions.delete(k);
        }
      }

      // List hasil bernomor (box smallcaps — format reply command)
      const listLines = videos.slice(0, 10).map((v, i) => {
        const dur = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, "0")}` : "-";
        return `│ ${i + 1}. ${String(v.title).slice(0, 45)}${String(v.title).length > 45 ? "..." : ""}\n│    🕒 ${dur}${v.createdAt ? ` · ${new Date(v.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}`;
      });
      await m.react("🐣");
      return m.reply(raraWrap(`TikTok Search — ${source}`, [
        `📌 Hasil pencarian untuk: ${text}`,
        ``,
        ...listLines,
        ``,
        `💡 Balas nomornya buat download: ${prefix + command} <nomor>`,
        `💡 Sesi aktif ${TT_SESSION_TTL / 60000} menit`,
      ]));
    } catch (err) {
      console.error("[TikTok Search]", err.message || err);
      await m.react("❌");
      return m.reply(raraGangguan("TikTok Search"));
    }
  }

  try {
    // Try IkyyXD tiktok first (uses "query" param + apikey)
    const ikyyResult = await ikyyDl("tiktok", text, { urlParam: "query", extraParams: { apikey: getApiKey("kyzz") } });
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      // format owner 19 Sep: judul/uploader/username/durasi/view/like/komentar/share/download
      const caption = tiktokCaption({
        title: ikyyResult.title || "TikTok Video",
        uploader: ikyyResult.author || null,
        duration: ikyyResult.duration || null,
        download: "HD",
      });
      let card = "";
      try {
        const info = await probeMedia(video.url);
        card = mediaResultCard({
          header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
          title: ikyyResult.title || "TikTok Video",
          author: ikyyResult.author || null,
          type: "video",
          platform: "TikTok",
          duration: ikyyResult.duration || null,
          quality: "HD",
          size: info.size,
          mime: info.mime,
        });
      } catch {}
      await sock.sendMessage(m.chat, {
        video: { url: video.url },
        caption: card || caption,
        contextInfo: mediaPreviewCard({
          title: ikyyResult.title || "TikTok Video",
          body: "TikTok • Video HD",
          sourceUrl: text,
          thumbnailUrl: ikyyResult.thumbnail || "",
          mediaType: 2,
        }),
      }, { quoted: m });
      await offerConvert(sock, m, { mediaUrl: video.url, type: "video", platform: "TikTok", title: ikyyResult.title, sourceUrl: text });
      return;
      await m.reply(raraBerhasil("TikTok"));
    }

    // Fallback to tikwm
    const result = await tiktokDl(text);
    const builder = new AIRich(sock);

    if (result.durations > 0 && result.duration !== "0 Seconds") {
      let zann = result.data.find(
        (e) => e.type == "nowatermark_hd" || e.type == "nowatermark",
      );

      // format owner 19 Sep: judul/uploader/username/durasi/view/like/komentar/share/download
      // (tikwm kasih hdplay → HD; cuma play biasa → SD — jujur sesuai kemampuan)
      const caption = tiktokCaption({
        title: result.title || "TikTok Video",
        uploader: result.author?.nickname || null,
        username: result.author?.fullname || null,
        duration: result.durations || null,
        views: result.stats?.views || null,
        likes: result.stats?.likes || null,
        comments: result.stats?.comment || null,
        shares: result.stats?.share || null,
        download: zann?.type === "nowatermark_hd" ? "HD" : "SD",
      });

      let card = "";
      try {
        const info = await probeMedia(zann.url);
        card = mediaResultCard({
          header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
          title: result.title || "TikTok Video",
          author: result.author?.nickname || null,
          authorHandle: result.author?.fullname || null,
          type: "video",
          platform: "TikTok",
          duration: result.durations || null,
          views: result.stats?.views || null,
          likes: result.stats?.likes || null,
          comments: result.stats?.comment || null,
          shares: result.stats?.share || null,
          quality: zann?.type === "nowatermark_hd" ? "HD" : "SD",
          size: info.size || (zann?.type === "nowatermark_hd" ? result.size_nowm_hd : result.size_nowm),
          mime: info.mime,
        });
      } catch {}
      await sock.sendMessage(m.chat, {
        video: { url: zann.url },
        caption: card || caption,
        contextInfo: mediaPreviewCard({
          title: result.title || "TikTok Video",
          body: `TikTok • ${result.author?.nickname || "Video"}`,
          sourceUrl: text,
          thumbnailUrl: result.cover || "",
          mediaType: 2,
        }),
      }, { quoted: m });
      await m.reply(raraBerhasil("TikTok"));
      await offerConvert(sock, m, { mediaUrl: zann.url, type: "video", platform: "TikTok", title: result.title, sourceUrl: text });

      await sock.sendMessage(
        m.chat,
        {
          footer: "🌿 Mau dapetin audio nya juga? kalau mau bisa tekan tombol dibawah",
          text: "",
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                title: "📩 Unduh Audionya",
                id: `${m.prefix}ttmp3 ${text}`,
              }),
            },
          ,
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Kembali",
                id: m.prefix + "menu"
              })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Tanya AI",
                id: m.prefix + "aihelp"
              })
            }
          ],
        },
        { quoted: m }
      );
    } else {
      const sabila = result.data?.map((zan) => ({
        image: { url: zan.url },
      }));
      await sock.sendMessage(
        m.chat,
        {
          albumMessage: sabila,
        },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error(e);
    m.reply(raraGangguan("TikTok"));
  }
}

export { pluginConfig as config, handler };
