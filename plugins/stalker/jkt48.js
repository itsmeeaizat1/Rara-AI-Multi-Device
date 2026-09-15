// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .jkt48 — data SHOWROOM JKT48 dari zelapi.eu.cc (5 endpoint):
//   info | comments | gift | rank | stream
// 🔹 .jkt48 <kind> <roomId> [| cookies]
// 🔹 roomId = room_id SHOWROOM (angka). cookies opsional (data
//   tertentu butuh session Showroom lo sendiri).
// 🔹 STRICT SATUAN: endpoint mati → error asli, no fallback.
// ═════════════════════════════════════════════

import { jktShowroom, ZEL_JKT48_KINDS, _setZelJktHttpForTest, _setZelJktKeyForTest } from "../../src/scraper/zeljkt.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jkt48",
  alias: ["showroomjkt", "jktshowroom", "showroom"],
  category: "stalker",
  description: "Data SHOWROOM JKT48 — info/komentar/gift/rank/stream live",
  usage: ".jkt48 <info|comments|gift|rank|stream> <roomId> [| cookies]",
  example: ".jkt48 info 123456",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const KIND_DESC = {
  info: "Info room live (judul, status, penonton)",
  comments: "Komentar live terbaru",
  gift: "Gift yang masuk selama live",
  rank: "Rank/level fans di room",
  stream: "Link streaming live (m3u8)",
};

// ── renderer JSON defensif (bentuk respon zelapi gak terdokumentasi rapi) ──
function fmtVal(v, depth = 0) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string") return v.length > 120 ? v.slice(0, 120) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function renderJson(o, depth = 0, maxRows = 24) {
  const lines = [];
  if (Array.isArray(o)) {
    o.slice(0, 12).forEach((item, i) => {
      if (typeof item === "string" || typeof item === "number") lines.push(`${i + 1}. ${fmtVal(item)}`);
      else if (item && typeof item === "object") {
        const sub = renderJson(item, depth + 1, maxRows).split("\n").filter(Boolean);
        lines.push(`${i + 1}. ${sub[0] || ""}` + (sub.length > 1 ? sub.slice(1, 3).join(" · ") : ""));
      }
      if (lines.length >= maxRows) return;
    });
    if (o.length > 12) lines.push(`… +${o.length - 12} lainnya`);
    return lines.join("\n");
  }
  if (o && typeof o === "object") {
    let n = 0;
    for (const [k, v] of Object.entries(o)) {
      if (n >= maxRows) { lines.push("…"); break; }
      if (v === null || v === undefined || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        lines.push(`${k}: ${fmtVal(v)}`);
        n++;
      } else if (Array.isArray(v)) {
        lines.push(`${k}: (${v.length} item)`);
        if (v.length && depth < 1 && n < maxRows - 2) {
          const sub = renderJson(v, depth + 1).split("\n").filter(Boolean).slice(0, 3);
          sub.forEach((s) => lines.push("  " + s));
          n += sub.length + 1;
        }
        n++;
      } else if (typeof v === "object") {
        const sub = renderJson(v, depth + 1, maxRows).split("\n").filter(Boolean).slice(0, 4);
        lines.push(`${k}:`);
        sub.forEach((s) => lines.push("  " + s));
        n += sub.length + 1;
      }
    }
    return lines.join("\n");
  }
  return fmtVal(o);
}

// cari URL stream di data (m3u8/mp4) buat ditonjolin
function findStreamUrl(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 4) return null;
  for (const v of Object.values(o)) {
    if (typeof v === "string" && /^https?:\/\/\S+\.(m3u8|mp4)/i.test(v)) return v;
    const r = findStreamUrl(v, depth + 1);
    if (r) return r;
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map(String);
    const prefix = m.prefix || ".";

    if (!args.length) {
      const kinds = ZEL_JKT48_KINDS.map((k) => `• *${k}* — ${KIND_DESC[k] || ""}`).join("\n");
      return m.reply(claraWrap("jkt48",
        `🎬 SHOWROOM JKT48 — 5 jenis data\n\n${kinds}\n\nCara pakai: ${prefix}jkt48 <jenis> <roomId> [| cookies]\nroomId = angka room SHOWROOM (ada di link share room member).\nContoh: ${prefix}jkt48 info 123456`));
    }

    const kind = (args[0] || "").toLowerCase();
    if (!ZEL_JKT48_KINDS.includes(kind)) {
      return m.reply(claraWrap("jkt48",
        `Jenis "${args[0]}" gak ada — pilihan: ${ZEL_JKT48_KINDS.join(" / ")}`, "error"));
    }

    // .jkt48 info 123456 | cookiespanjang
    let roomId = args[1] || "";
    let cookies = "";
    if (args.length > 1) {
      const joined = args.slice(1).join(" ");
      const pipeParts = joined.split("|").map((s) => s.trim());
      roomId = (pipeParts[0] || "").split(/\s+/)[0] || "";
      cookies = pipeParts[1] || "";
    }
    if (!roomId) {
      return m.reply(claraWrap("jkt48",
        `roomId-nya mana? Contoh: ${prefix}jkt48 ${kind} 123456`, "error"));
    }

    await m.react("🧠");
    const r = await jktShowroom(kind, roomId, cookies);
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "API key zelapi belum diisi — isi apikeys.json (zelapi) di server.",
        ROOM_ID_KOSONG: "roomId harus angka room SHOWROOM.",
      };
      return m.reply(claraWrap("jkt48", map[r.error] || `Endpoint JKT48 Showroom error: ${r.error}`, "error"));
    }

    await m.react("🐣");
    const streamUrl = kind === "stream" ? findStreamUrl(r.data) : null;
    const body = renderJson(r.data) || "Respon kosong dari endpoint.";
    let out = `*SHOWROOM ${kind.toUpperCase()}* — room ${roomId}\n\n${body}`;
    if (streamUrl) out += `\n\n🔗 Link stream:\n${streamUrl}`;
    return m.reply(claraWrap("jkt48", out));
  } catch (err) {
    await m.react("❌");
    return m.reply(claraWrap("jkt48", "gagal proses: " + (err?.message || "error"), "error"));
  }
}

export { pluginConfig as config, handler, _setZelJktHttpForTest, _setZelJktKeyForTest };
export default { pluginConfig, handler, command: pluginConfig.name };
