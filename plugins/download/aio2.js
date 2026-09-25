// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aio2.js — AIO Downloader v2 dengan PEMILIH KUALITAS (porting fitur .aio
// script JPM APENBOTZ, 21 Sep 2026: "fitur yg work aja diporting jd v2").
// Beda dari downloader lain di Nova (one-shot kirim 1 hasil terbaik):
// .aio2 ngasih POPUP pilih resolusi/format — video (ditandain 🔊 punya
// audio / no-audio), audio per bitrate, foto slides TikTok satu-satu,
// file TeraBox per item — dipilih → dikirim sebagai DOCUMENT (anti
// kompres WA). Engine: api.nexray.web.id /downloader/aio + /downloader/terabox.
import { aioDl, teraboxDl } from "../../src/scraper/nexray-dl.js";
import { registerChoice } from "../../src/lib/nova-aio2-session.js";
import { fetchChoiceBuffer } from "../../src/scraper/nexray-dl.js";
import { toSC, claraWrap, novaGuide, novaGuideV2, novaSalahV2 } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "aio2",
  alias: ["aio2", "aiov2", "dl2"],
  category: "download",
  description: "AIO downloader v2 — popup pilih resolusi/format (video/audio/foto/TeraBox)",
  usage: ".aio2 <link>",
  example: ".aio2 https://youtube.com/watch?v=xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 12, energi: 2, isEnabled: true,
};

const PLATFORM_ICON = {
  youtube: "🎬", tiktok: "🎵", instagram: "📸", twitter: "🐦", x: "🐦",
  facebook: "📘", terabox: "📦", pinterest: "📌", unknown: "📥",
};

const MIMETYPE_MAP = {
  mp4: "video/mp4", mkv: "video/mp4", mov: "video/mp4", avi: "video/mp4", webm: "video/webm",
  mp3: "audio/mpeg", m4a: "audio/mp4", opus: "audio/opus", wav: "audio/wav",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  pdf: "application/pdf", zip: "application/zip", "7z": "application/x-7z-compressed",
  apk: "application/vnd.android.package-archive",
};

function mimeOf(ext, fallback) {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  return MIMETYPE_MAP[e] || fallback || "application/octet-stream";
}

function slug(text, max = 40) {
  return String(text || "AIO2")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, max) || "AIO2";
}

/** Susun rows per section dari medias hasil API — pola JPM disesuaikan. */
export function buildPickerSections(medias, { source, statistics } = {}) {
  const videos = [];
  const audios = [];
  const images = [];
  for (const m of medias) {
    const type = String(m?.type || "").toLowerCase();
    const ext = String(m?.extension || m?.ext || "").toLowerCase().replace(/^\./, "");
    if (type === "video" || (!type && /\.(mp4|mkv|mov|webm)$/i.test(m?.url || ""))) videos.push({ ...m, ext: ext || "mp4" });
    else if (type === "audio" || (!type && /\.(mp3|m4a|opus)$/i.test(m?.url || ""))) audios.push({ ...m, ext: ext || "mp3" });
    else if (type === "image") images.push({ ...m, ext: ext || "jpg" });
  }
  // video: yang punya audio duluan, lalu resolusi tertinggi (pola JPM)
  videos.sort((a, b) => {
    if (a.is_audio && !b.is_audio) return -1;
    if (!a.is_audio && b.is_audio) return 1;
    return (b.height || b.size || 0) - (a.height || a.size || 0);
  });
  audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const sections = [];
  if (images.length) {
    sections.push({
      title: `Foto (${images.length})`,
      rows: images.map((m, i) => ({
        title: `Foto ${i + 1} dari ${images.length}`,
        description: `${m.ext.toUpperCase()} · ${m.width && m.height ? m.width + "x" + m.height : m.quality || ""}`,
        id: `.aio2dl ${m.ext}|image/jpeg|${m.url}`,
      })),
    });
  }
  if (videos.length) {
    sections.push({
      title: "Video",
      rows: videos.map((m) => {
        const hasAudio = m.is_audio ? " 🔊" : " (no audio)";
        const res = m.width && m.height ? ` · ${m.width}x${m.height}` : "";
        const kbps = m.bitrate ? ` · ${Math.round(m.bitrate / 1000)} kbps` : "";
        return {
          title: `${m.label || m.quality || "Video"}${m.is_audio === undefined ? "" : hasAudio}`,
          description: `${m.ext.toUpperCase()}${res}${kbps}`.trim(),
          id: `.aio2dl ${m.ext}|${(m.mimeType || mimeOf(m.ext, "video/mp4")).split(";")[0]}|${m.url}`,
        };
      }),
    });
  }
  if (audios.length) {
    sections.push({
      title: "Audio",
      rows: audios.map((m) => ({
        title: `${m.label || m.quality || "Audio"}`,
        description: `${m.ext.toUpperCase()}${m.audioSampleRate ? " · " + m.audioSampleRate + " Hz" : ""}${m.bitrate ? " · " + Math.round(m.bitrate / 1000) + " kbps" : ""}`,
        id: `.aio2dl ${m.ext}|${mimeOf(m.ext, "audio/mpeg")}|${m.url}`,
      })),
    });
  }
  return { sections, statsText: statistics ? statistics : null };
}

/** Popup single_select — pola proven grading.js (placeholder Elaina V3). */
async function sendPicker(m, sock, { source, title, author, bodyText, sections, statsText }) {
  const botName = config?.bot?.name || "Nova AI";
  const icon = PLATFORM_ICON[source] || "📥";
  const lines = [
    `*${icon} ${toSC("AIO Downloader v2")}*`,
    "",
    title ? `📝 ${String(title).slice(0, 80)}` : "",
    author ? `👤 ${String(author).slice(0, 50)}` : "",
    statsText ? `👁️ ${statsText.play_count?.toLocaleString("id-ID")} · ❤️ ${statsText.digg_count?.toLocaleString("id-ID")} · 💬 ${statsText.comment_count?.toLocaleString("id-ID")}` : "",
    "",
    `Pilih kualitas/format yang mau kamu unduh:`,
  ].filter((x) => x !== "");
  const buttons = [
    { name: "single_select", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    { name: "call_permission_request", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: toSC("Pilih Kualitas"),
        sections: sections.map((s) => ({ title: s.title, rows: s.rows })),
      }),
    },
  ];
  await sock.sendMessage(m.chat, {
    interactiveMessage: {
      body: { text: lines.join("\n") },
      footer: { text: toSC(`${botName} — AIO v2`) },
      header: { title: "", hasMediaAttachment: false },
      nativeFlowMessage: { buttons },
    },
  }, { quoted: m });
  return true;
}

/** Kirim langsung tanpa popup kalau cuma 1 pilihan (hemat langkah). */
async function sendSingle(m, sock, media, meta) {
  const ext = String(media?.extension || media?.ext || "bin").toLowerCase();
  const mime = mimeOf(ext, media?.mimeType || "application/octet-stream");
  try {
    const buf = await fetchChoiceBuffer(media.url);
    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: mime,
      fileName: `${slug(meta.title)}.${ext}`,
    }, { quoted: m });
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("AIO v2", `Gagal unduh file: ${e?.message || e}`, "error"));
  }
  return true;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const url = String(m.text || "").trim();

  if (!url) {
    return m.reply(novaGuideV2("aio2", {
 kaomoji: "(๑˃ᴗ˂)ﻭ",
 sapaan: "pengen pilih kualitas sendiri? pakai yang ini! (⌒‿⌒)♡",
      cara: "tempel linknya sesudah command",
      contoh: `${prefix}aio2 https://youtube.com/watch?v=xxx`,
      note: "popup pilihan kualitas bakal muncul, tinggal balas nomornya",
      spec: ["⚡ energi 2", "⏱ 12dtk", "💸 gratis"],
    }));
  }
  if (!/^https?:\/\//i.test(url)) {
    return m.reply(novaSalahV2("aio2", {
 kaomoji: "(;∀;)",
      pesan: "linknya gak valid kak, harus diawali http atau https~ ulangi ya",
      contoh: `${prefix}aio2 link`,
    }));
  }

  try {
    await m.react("🧠");

    // ── TeraBox link → endpoint khusus, fallback aio umum ──
    if (/terabox|teraboxapp|1024tera/i.test(url)) {
      try {
        const tb = await teraboxDl(url);
        const rows = tb.files.map((f) => {
          const ext = String(f.filename || "").split(".").pop()?.toLowerCase() || "bin";
          const size = f.size_formatted ? ` · ${f.size_formatted}` : "";
          const dur = f.duration ? ` · ⏱️ ${f.duration}` : "";
          return {
            title: `📁 ${String(f.filename || "File").slice(0, 30)}`,
            description: `${f.quality || ""}${size}${dur}`.replace(/^ · /, ""),
            id: `.aio2dl ${ext}|${mimeOf(ext)}|${f.download_url}`,
          };
        });
        registerChoice(m.chat, tb.files.map((f) => f.download_url));
        await m.react("🔍");
        await sendPicker(m, sock, {
          source: "terabox",
          title: `TeraBox — ${tb.total} file`,
          author: tb.folder,
          sections: [{ title: `File (total ${tb.total})`, rows }],
        });
        return { handled: true };
      } catch {
        // terabox endpoint nolak → lanjut jalur aio umum di bawah
      }
    }

    // ── AIO umum ──
    const res = await aioDl(url);
    const { sections, statsText } = buildPickerSections(res.medias, { source: res.source, statistics: res.statistics });
    if (!sections.length) {
      await m.react("❌");
      return m.reply(claraWrap("AIO v2", `Link-nya gak punya media yang bisa diunduh (sumber: ${res.source}).`, "error"));
    }
    registerChoice(m.chat, res.medias.map((x) => x.url));

    // cuma 1 pilihan → langsung kirim, gak perlu popup
    const totalRows = sections.reduce((n, s) => n + s.rows.length, 0);
    if (totalRows === 1) {
      const media = res.medias.find((x) => x.url) || res.medias[0];
      return sendSingle(m, sock, media, res);
    }

    await m.react("🔍");
    await sendPicker(m, sock, {
      source: res.source,
      title: res.title,
      author: res.author,
      statsText,
      bodyText: null,
      sections,
    });
    return { handled: true };
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("AIO v2", `${e?.message || e} — coba link lain, atau pakai downloader spesifik platform (.tiktok/.ytmp4/.teraboxv2).`, "error"));
  }
}

export { pluginConfig as config, handler };
