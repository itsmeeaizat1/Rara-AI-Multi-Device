// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .swpost — POSTING STATUS/STORY WA dari bot (teks & media).
// Sistem langka bot MD luar sana yang belum ada di NOVA:
//   .swpost <teks>            → status teks warna
//   reply gambar/video + .swpost [caption] → status media
//   .swpost warna #hex [teks] → status teks custom warna
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

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
        await sock.sendMessage(
          "status@broadcast",
          isVideo
            ? { video: buf, caption: teks || "" }
            : { image: buf, caption: teks || "" }
        );
        return m.reply(
          novaWrap("Status Post", [
            `Status ${isVideo ? "video" : "gambar"} BERHASIL dipost ke story WA.`,
            teks ? `Caption: ${teks}` : "",
          ].filter(Boolean))
        );
      } catch (e) {
        return m.reply(
          novaWrap("Status Post", [
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
      novaWrap("Status Post", [
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
      novaWrap("Status Post", [
        "Status teks BERHASIL dipost ke story WA.",
        `Warna: ${bg}`,
      ])
    );
  } catch (e) {
    return m.reply(
      novaWrap("Status Post", [
        "Gagal posting status teks.",
        `Sebab: ${e?.message || "kirim status gagal"}`,
      ])
    );
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
