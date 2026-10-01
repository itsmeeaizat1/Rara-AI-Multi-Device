// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .stalk — cek profil sosial media/game/dev via zelapi.eu.cc /stalk
// 🔹 Owner 14 Sep: fitur baru dari audit zelapi v3.0.0 (448 endpoint).
// 🔹 STRICT: endpoint mati/akun gak ketemu → pesan error asli, no fallback.
// 🔹 10 platform (yang DIVERIFIKASI LIVE hidup): discord, github, githubrepo,
//    roblox, telegram, youtube, pinterest, ttrepost, genshin, mlbb.
// ═════════════════════════════════════════════

import { zelStalk, ZEL_STALK_REGISTRY, _setZelHttpForTest, _setZelKeyForTest } from "../../src/scraper/zelapi.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendImage } from "../../src/lib/rara-message.js";
import { fetchBuffer } from "../../src/lib/rara-utils.js";

export { _setZelHttpForTest, _setZelKeyForTest };

let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "stalk",
  alias: ["stalk", "cekprofil"],
  category: "tools",
  description: "Cek profil Discord/GitHub/Roblox/Telegram/YouTube/Pinterest/Genshin/MLBB/TikTok Repost",
  usage: ".stalk <platform> <query> | .stalk list",
  example: ".stalk github torvalds",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

/** Cari URL gambar avatar/foto profil di kedalaman objek (defensif). */
function findAvatar(o, depth = 0) {
  if (depth > 3 || !o || typeof o !== "object") return null;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && /avatar|profile_pic|picture|image|photo/i.test(k)) {
      let u = v;
      if (u.startsWith("//")) u = "https:" + u;
      if (/^https?:\/\//.test(u)) return u;
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const found = findAvatar(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const LABELS = {
  username: "Username", name: "Nama", full_name: "Nama Lengkap", global_name: "Nama Tampilan",
  title: "Judul", bio: "Bio", signature: "Signature", description: "Deskripsi",
  company: "Perusahaan", location: "Lokasi", followers: "Followers", following: "Following",
  public_repos: "Repo Publik", public_gists: "Gist Publik", subscriber: "Subscriber",
  verified: "Verified", isBanned: "Dibanned", level: "Level", nickname: "Nickname",
  world_level: "World Level", created_at: "Dibuat", url: "URL", profile_url: "Profil",
  stargazers_count: "Stars", forks_count: "Forks", watchers_count: "Watchers",
  language: "Bahasa Utama", visibility: "Visibilitas", private: "Privat",
  displayName: "Display Name", bot: "Bot?", discriminator: "Discriminator",
  total: "Total Video", has_more: "Ada Lagi?",
};

/** Ambil field scalar "menarik" dari objek (rekursif, defensif) — dedup label. */
function extractFields(o, out = [], seen = new Set(), depth = 0) {
  if (depth > 2 || !o || typeof o !== "object" || Array.isArray(o)) return out;
  for (const [k, v] of Object.entries(o)) {
    if (out.length >= 12) break;
    if (/^(status|creator|node_id|id|avatar|avatar_url|profile_pic|image|photo|banner|accent_color)$/i.test(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      if (v === "" || v === "-" || v === null || seen.has(k)) continue;
      seen.add(k);
      const label = LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      out.push(`${label}: ${typeof v === "boolean" ? (v ? "Ya" : "Tidak") : v}`);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      extractFields(v, out, seen, depth + 1);
    }
  }
  return out;
}

function buildStalkCard(platform, data) {
  const label = ZEL_STALK_REGISTRY[platform]?.label || platform;
  // envelope umum: result / data / user / top-level
  const primary = data?.result || data?.data || data?.user || data;
  const lines = [`🔎 *${label.toUpperCase()}*`, ""];

  if (platform === "ttrepost") {
    lines.push(`Username: ${data?.username || "-"}`);
    lines.push(`Total Video: ${data?.total ?? "-"}${data?.has_more ? " (masih ada lagi)" : ""}`);
    const vids = Array.isArray(data?.videos) ? data.videos.slice(0, 5) : [];
    if (vids.length) {
      lines.push("");
      lines.push("*Video Terbaru:*");
      for (const v of vids) {
        lines.push(`• ${(v.judul || "-").slice(0, 60)} (${v.durasi ?? "?"}s)`);
      }
    }
  } else if (platform === "genshin") {
    const u = data?.user || {};
    lines.push(`UID: ${u.uid ?? "-"}`);
    lines.push(...extractFields(u, [], new Set()));
    const chars = Array.isArray(data?.characters) ? data.characters.length : 0;
    lines.push(`Total Karakter: ${chars}`);
  } else {
    lines.push(...extractFields(primary, [], new Set()));
  }

  return { text: lines.join("\n"), avatar: findAvatar(data) };
}

async function handler(m, { sock }) {
  try {
    const args = m.args || [];
    const listAlias = ["list", "daftar"];

    if (!args.length || listAlias.includes((args[0] || "").toLowerCase())) {
      const items = Object.entries(ZEL_STALK_REGISTRY)
        .map(([k, s]) => `• *${k}* — ${s.label} (${s.hint})`)
        .join("\n");
      return m.reply(raraWrap("stalk",
        `🔎 *STALK — CEK PROFIL (ZELAPI)*\n\n${items}\n\n💡 Contoh: *.stalk github torvalds*\n💡 Contoh multi: *.stalk githubrepo torvalds/linux*`));
    }

    const platform = (args[0] || "").toLowerCase();
    const query = args.slice(1).join(" ").trim();

    if (!ZEL_STALK_REGISTRY[platform]) {
      return m.reply(raraWrap("stalk", `⚠️ Platform *${platform}* gak ada.\n\nKetik *.stalk list* buat daftar platform.`));
    }
    if (!query) {
      return m.reply(raraWrap("stalk", `⚠️ *.stalk ${platform}* — ${ZEL_STALK_REGISTRY[platform].hint}\n\nContoh: *.stalk ${platform} ${platform === "githubrepo" ? "torvalds/linux" : platform === "mlbb" ? "123456789 1234" : "namanya"}*`));
    }

    await m.react("🔍");
    const r = await zelStalk(platform, query);
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ Key zelapi belum di-set — owner isi apikeys.json slot *zelapi*.",
        QUERY_KOSONG: `⚠️ ${ZEL_STALK_REGISTRY[platform].hint}`,
        PARAM_KURANG: `⚠️ Format kurang — ${ZEL_STALK_REGISTRY[platform].hint}`,
      };
      return m.reply(raraWrap("stalk", map[r.error] || `❌ *${platform.toUpperCase()} GAGAL:* ${r.error}`));
    }
    await m.react("🐣");

    const card = buildStalkCard(platform, r.data);
    if (card.avatar) {
      try {
        const buf = await getBuf(card.avatar);
        return await sendImage(sock, m.chat, buf, raraWrap("stalk", card.text), { quoted: m });
      } catch {
        // gagal download avatar → tetep kirim teks
      }
    }
    return m.reply(raraWrap("stalk", card.text));
  } catch (err) {
    console.error("[stalk]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("stalk", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig, handler, pluginConfig as config };
export default { pluginConfig, handler };
