// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .swpost — POSTING STATUS/STORY WA dari bot (teks & media).
// Sistem langka bot MD luar sana yang belum ada di RARA:
//   .swpost <teks>            → status teks warna
//   reply gambar/video + .swpost [caption] → status media
//   .swpost warna #hex [teks] → status teks custom warna
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch owner) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "statuspost",
  alias: ["swpost", "statuspost", "postsw"],
  category: "owner",
  description: "Posting status/story WA dari bot (teks & media)",
  usage: ".swpost <teks> | reply media + .swpost <caption> | .swpost warna #hex <teks>",
  example: ".swpost selamat pagi semuanya",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const DEFAULT_BG = "#822b9d";

function parseArgs(raw) {
  const parts = (raw || "").trim().split(/\s+/);
  const out = { warna: null, teks: "" };
  if (!parts.length) return out;
  if (parts[0] === "warna" || parts[0] === "color") {
    const hex = (parts[1] || "").toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(hex)) {
      out.warna = hex;
      out.teks = parts.slice(2).join(" ");
    } else {
      out.warna = DEFAULT_BG;
      out.teks = parts.slice(1).join(" ");
    }
  } else {
    out.teks = parts.join(" ");
  }
  return out;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const raw = (m.text || "").trim();
  // buang command dari teks
  const body = raw.replace(/^\.\w+/i, "").trim();
  const { warna, teks } = parseArgs(body);
  const cfg = db.setting("swPost") || { bg: DEFAULT_BG, font: 3 };
  const bg = warna || cfg.bg || DEFAULT_BG;

  // ── Jalur media: reply gambar/video ──
  if (m.quoted) {
    const type = m.quoted.type;
    if (["imageMessage", "videoMessage"].includes(type)) {
      try {
        const buf = await m.quoted.download();
        const isVideo = type === "videoMessage";
        const card = await dlCard(isVideo ? "video" : "gambar", { buffer: buf }, [["Engine", "WhatsApp Status"], ["Tipe", isVideo ? "Video" : "Gambar"]]);
        await sock.sendMessage(
          "status@broadcast",
          isVideo
            ? { video: buf, caption: card ? `${teks || ""}\n\n${card}` : (teks || "") }
            : { image: buf, caption: card ? `${teks || ""}\n\n${card}` : (teks || "") }
        );
        return m.reply(
          raraWrap("Status Post", [
            `Status ${isVideo ? "video" : "gambar"} BERHASIL dipost ke story WA.`,
            teks ? `Caption: ${teks}` : "",
          ].filter(Boolean))
        );
      } catch (e) {
        return m.reply(
          raraWrap("Status Post", [
            "Gagal posting status media.",
            `Sebab: ${e?.message || "unduh media gagal"}`,
          ])
        );
      }
    }
  }

  // ── Jalur teks ──
  if (!teks) {
    return m.reply(
      raraWrap("Status Post", [
        "Posting status/story WA dari bot",
        "",
        "Cara pakai:",
        ".swpost <teks> — status teks",
        "reply gambar/video + .swpost <caption> — status media",
        ".swpost warna #1e40af <teks> — teks dengan warna khusus",
        "",
        `Warna default: ${cfg.bg || DEFAULT_BG}`,
      ]),
      { commandName: "swpost" }
    );
  }

  try {
    await sock.sendMessage("status@broadcast", { text: teks }, {
      backgroundColor: bg,
      font: Number(cfg.font) || 3,
    });
    return m.reply(
      raraWrap("Status Post", [
        "Status teks BERHASIL dipost ke story WA.",
        `Warna: ${bg}`,
      ])
    );
  } catch (e) {
    return m.reply(
      raraWrap("Status Post", [
        "Gagal posting status teks.",
        `Sebab: ${e?.message || "kirim status gagal"}`,
      ])
    );
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
