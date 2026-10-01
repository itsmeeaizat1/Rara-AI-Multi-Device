// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Menfess — porting script menfess bot standalone (owner, 9 Sep 2026):
// menfess anonim (!menfess @target) / non-anonim (!sayfess @target) ke channel terpusat,
// reply, like dedup, list, detail, limit harian per user, mode anon reply, stats, hapus (owner).
// Command: .menfess @target <pesan> | .menfess say @target <pesan> | reply/like/list/read/
//          del/setchannel/mode/limit/stats/help
// Data tersimpan di db.setting("menfess") — persisten via nova-database.

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { fromSC } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "menfess",
  alias: ["menfess"],
  category: "confess menfess",
  description: "Menfess ke @target via channel terpusat — anonim/non-anonim + reply, like, limit harian",
  usage: ".menfess @target <pesan> (anonim)\n.menfess say @target <pesan> (non-anonim)\n.menfess reply <id> <balasan>\n.menfess like <id>\n.menfess list\n.menfess read <id/nomor>\n.menfess setchannel (di grup)\n.menfess mode <anon/nonanon>\n.menfess limit <1-20>\n.menfess del <id/nomor> (owner)\n.menfess stats",
  example: ".menfess @Budi aku suka sama kamu\n.menfess say @Sinta terima kasih ya\n.menfess list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 0,
  isEnabled: true,
};

const MAX_LEN = 500;
const MIN_LEN = 3;
const SUBS = new Set(["say", "reply", "balas", "like", "suka", "list", "daftar", "read", "baca", "detail",
  "del", "hapus", "delete", "setchannel", "setgrup", "set", "delchannel", "resetchannel",
  "mode", "limit", "stats", "stat", "statistik", "help", "bantuan", "menu"]);

// ── helpers data (pola confessch: satu key settings global) ──
function getMf(db) {
  try {
    let mf = db.setting("menfess");
    if (!mf || typeof mf !== "object") mf = {};
    if (!Array.isArray(mf.posts)) mf.posts = [];
    if (typeof mf.counter !== "number") mf.counter = 0;
    if (typeof mf.anonymousMode !== "boolean") mf.anonymousMode = true; // default: reply anonim
    if (!mf.channel) mf.channel = null; // jid grup/channel tujuan menfess
    if (typeof mf.dailyLimit !== "number" || mf.dailyLimit < 1) mf.dailyLimit = 3; // batas per user per hari
    return mf;
  } catch (e) {
    console.error("[menfess] getMf error:", e.message);
    return { posts: [], counter: 0, anonymousMode: true, channel: null, dailyLimit: 3 };
  }
}

function saveMf(db, mf) {
  try {
    db.setting("menfess", mf);
    db.save();
  } catch (e) {
    console.error("[menfess] saveMf error:", e.message);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "unknown";
  }
}

// tanggal lokal (Asia/Jakarta) YYYY-MM-DD — buat hitung limit harian
function getToday() {
  try {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function sameDay(ts) {
  try {
    return new Date(ts).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }) === getToday();
  } catch {
    return false;
  }
}

// jumlah menfess user ini hari ini (anonim + non-anonim dihitung)
function getUserTodayCount(mf, sender) {
  return mf.posts.filter((p) => p.sender === sender && sameDay(p.timestamp)).length;
}

// cari menfess berdasarkan id (string pendek) ATAU nomor urut (#N)
function findPost(mf, key) {
  // key di-normalisasi dari smallcaps — user sering copy ID langsung dari
  // pesan bot yang udah ke-smallcaps guard global (mtsy → mtsy)
  const k = fromSC(String(key || "")).trim();
  if (!k) return null;
  const byId = mf.posts.find((p) => p.id === k);
  if (byId) return byId;
  const num = parseInt(k, 10);
  if (!Number.isNaN(num)) return mf.posts.find((p) => p.number === num) || null;
  return null;
}

// ── format pesan ke channel ──
function buildChannelPost(post) {
  const dari = post.anonymous ? "🔒 Dari: Anonim" : `👤 Dari: ${post.senderName}`;
  return [
    `📨 MENFESS #${post.number}`,
    "",
    dari,
    `👤 Untuk: @${post.target}`,
    "",
    `💬 "${post.message}"`,
    "",
    `📅 ${formatTime(post.timestamp)}`,
    `💬 Balas: .menfess reply ${post.id} <pesan>`,
    `❤️ Suka: .menfess like ${post.id}`,
    `📖 Detail: .menfess read ${post.number}`,
    `🔗 ID: ${post.id}`,
  ].join("\n");
}

function buildChannelReply(post, reply) {
  return [
    `💬 REPLY MENFESS #${post.number}`,
    "",
    `📨 Dari: ${reply.anonymous ? "🔒 Anonim" : reply.senderName}`,
    `👤 Untuk: @${post.target}`,
    `💬 "${reply.message}"`,
    "",
    `📅 ${formatTime(reply.timestamp)}`,
  ].join("\n");
}

// ── inti kirim menfess (anonim & non-anonim) ──
async function sendMenfess(m, sock, db, mf, target, message, anonymous) {
  if (!target || !message) {
    await m.react("❗");
    return m.reply(claraWrap("menfess", [
      anonymous
        ? `Format: ${m.prefix}menfess @target <pesan>`
        : `Format: ${m.prefix}menfess say @target <pesan>`,
      ``,
      `💡 Contoh: ${m.prefix}menfess @Budi aku suka sama kamu`,
    ].join("\n"), "error"));
  }
  if (message.length < MIN_LEN) {
    await m.react("❗");
    return m.reply(claraWrap("menfess", `Pesan kependekan! Minimal ${MIN_LEN} karakter.`, "error"));
  }
  if (message.length > MAX_LEN) {
    await m.react("❗");
    return m.reply(claraWrap("menfess", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
  }

  // limit harian per user
  const todayCount = getUserTodayCount(mf, m.sender);
  if (todayCount >= mf.dailyLimit) {
    await m.react("❗");
    return m.reply(claraWrap("menfess", [
      `⚠️ Kamu sudah mencapai batas harian (*${mf.dailyLimit} menfess*).`,
      ``,
      `Coba lagi besok! 🌙`,
    ].join("\n"), "error"));
  }

  await m.react("🕒");
  mf.counter = (mf.counter || 0) + 1;
  const post = {
    id: generateId(),
    number: mf.counter,
    message,
    sender: m.sender,
    senderName: m.pushName || "User",
    target: target.replace(/^@+/, ""), // simpan tanpa @ (ala @username script)
    targetName: target.replace(/^@+/, ""),
    timestamp: Date.now(),
    anonymous,
    likes: [],
    replies: [],
    status: "active",
  };
  mf.posts.push(post);
  saveMf(db, mf);

  if (mf.channel) {
    try {
      await sock.sendMessage(mf.channel, { text: buildChannelPost(post) });
    } catch (e) {
      console.error("[menfess] kirim ke channel gagal:", e.message);
    }
    await m.react("🐣");
    return m.reply(claraWrap("menfess", [
      `✅ Menfess ${anonymous ? "anonim" : "dari *" + post.senderName + "*"} untuk *@${post.target}* terkirim!`,
      ``,
      `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      `📊 Jatah hari ini: *${todayCount + 1}/${mf.dailyLimit}*`,
    ].join("\n")));
  }
  await m.react("🐣");
  return m.reply(claraWrap("menfess", [
    `✅ Menfess *#${post.number}* tersimpan!`,
    ``,
    `📌 Belum ada channel menfess diatur.`,
    `Owner bisa set: ${m.prefix}menfess setchannel (di grup target)`,
  ].join("\n")));
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.fullArgs || m.text || "").trim().split(/\s+/).filter(Boolean);
  const sub = (args[0] || "").toLowerCase();
  const mf = getMf(db);

  // ─── HELP / no-arg ───
  if (!sub || sub === "help" || sub === "bantuan" || sub === "menu") {
    await m.react("🐣");
    return m.reply(claraWrap("menfess", [
      `Menfess ke @target via channel terpusat — 2 versi: anonim & non-anonim.`,
      ``,
      `💌 KIRIM MENFESS`,
      `🔒 Anonim : ${m.prefix}menfess @target <pesan>`,
      `👤 Non-anonim : ${m.prefix}menfess say @target <pesan>`,
      ``,
      `💬 REPLY — ${m.prefix}menfess reply <id> <pesan>`,
      `${mf.anonymousMode ? "🔒 Anonim (sesuai mode)" : "👤 Nama terlihat (sesuai mode)"} — atur via mode owner`,
      ``,
      `❤️ LIKE — ${m.prefix}menfess like <id>`,
      `📖 DETAIL — ${m.prefix}menfess read <id/nomor>`,
      `📋 DAFTAR — ${m.prefix}menfess list`,
      ``,
      `🔧 OWNER`,
      `${m.prefix}menfess setchannel (di grup target)`,
      `${m.prefix}menfess mode <anon/nonanon> — atur reply`,
      `${m.prefix}menfess limit <1-20> — batas harian per user`,
      `${m.prefix}menfess del <id/nomor>`,
      ``,
      `📊 ${m.prefix}menfess stats — statistik menfess`,
      `❓ Channel: ${mf.channel ? "✅ sudah diatur" : "❌ belum diatur"} | Limit harian: ${mf.dailyLimit}`,
    ].join("\n")));
  }

  // ─── SAY (non-anonim) — ala !sayfess @target pesan ───
  if (sub === "say" || sub === "ngomong") {
    const target = args[1] || "";
    const message = args.slice(2).join(" ").trim();
    return sendMenfess(m, sock, db, mf, target, message, false);
  }

  // ─── REPLY ───
  if (sub === "reply" || sub === "balas") {
    const key = args[1] || "";
    const replyMsg = args.slice(2).join(" ").trim();
    const post = findPost(mf, key);

    if (!key || !replyMsg) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", [
        `Format: ${m.prefix}menfess reply <id/nomor> <pesan>`,
        ``,
        `💡 Contoh: ${m.prefix}menfess reply ${mf.posts.at(-1)?.id || "abc12"} aku setuju!`,
      ].join("\n"), "error"));
    }
    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", `Menfess dengan id/nomor *${key}* gak ditemukan!`, "error"));
    }
    if (replyMsg.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", `Balasan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
    }

    await m.react("🕒");
    const reply = {
      id: generateId(),
      message: replyMsg,
      sender: m.sender,
      senderName: m.pushName || "User",
      anonymous: mf.anonymousMode, // reply ikut mode global (ala script)
      timestamp: Date.now(),
    };
    post.replies = post.replies || [];
    post.replies.push(reply);
    saveMf(db, mf);

    if (mf.channel) {
      try {
        await sock.sendMessage(mf.channel, { text: buildChannelReply(post, reply) });
      } catch (e) {
        console.error("[menfess] kirim reply ke channel gagal:", e.message);
      }
    }
    await m.react("🐣");
    return m.reply(claraWrap("menfess", [
      `✅ Balasan untuk menfess *#${post.number}* terkirim!`,
      `🔒 Identitas kamu: ${mf.anonymousMode ? "anonim" : "kelihatan (" + reply.senderName + ")"}`,
    ].join("\n")));
  }

  // ─── LIKE ───
  if (sub === "like" || sub === "suka") {
    const key = args[1] || "";
    const post = findPost(mf, key);

    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", `Menfess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }

    post.likes = post.likes || [];
    if (post.likes.includes(m.sender)) {
      await m.react("🐣");
      return m.reply(claraWrap("menfess", `❤️ Kamu sudah menyukai menfess *#${post.number}*!`));
    }
    post.likes.push(m.sender);
    saveMf(db, mf);
    await m.react("❤️");
    return m.reply(claraWrap("menfess", [
      `❤️ Kamu menyukai menfess *#${post.number}*!`,
      `Total suka: *${post.likes.length}*`,
    ].join("\n")));
  }

  // ─── LIST ───
  if (sub === "list" || sub === "daftar") {
    if (mf.posts.length === 0) {
      await m.react("🐣");
      return m.reply(claraWrap("menfess", [
        `📭 Belum ada menfess.`,
        ``,
        `💡 Mulai: ${m.prefix}menfess @target <pesan>`,
      ].join("\n")));
    }

    const latest = mf.posts.slice(-10).reverse();
    let msg = `📋 MENFESS TERAKHIR (${latest.length} dari ${mf.posts.length} total)\n\n`;
    latest.forEach((p) => {
      const type = p.anonymous ? "🔒 Anonim" : `👤 ${p.senderName}`;
      const preview = p.message.length > 35 ? p.message.slice(0, 35) + "..." : p.message;
      msg += `*#${p.number}* ${type} → @${p.target}\n`;
      msg += `📝 ${preview}\n`;
      msg += `❤️ ${p.likes?.length || 0} | 💬 ${(p.replies || []).length} | 🆔 ${p.id}\n\n`;
    });
    await m.react("🐣");
    return m.reply(claraWrap("menfess", msg));
  }

  // ─── READ / DETAIL ───
  if (sub === "read" || sub === "baca" || sub === "detail") {
    const key = args[1] || "";
    const post = findPost(mf, key);

    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", `Menfess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }

    let msg = `📨 MENFESS #${post.number}\n\n`;
    msg += `👤 Dari: ${post.anonymous ? "🔒 Anonim" : post.senderName}\n`;
    msg += `👤 Untuk: @${post.target}\n\n`;
    msg += `💬 "${post.message}"\n\n`;
    msg += `📅 ${formatTime(post.timestamp)}\n`;
    msg += `❤️ ${post.likes?.length || 0} suka\n`;
    msg += `💬 ${(post.replies || []).length} balasan\n\n`;

    const replies = post.replies || [];
    if (replies.length > 0) {
      msg += `📩 BALASAN:\n`;
      replies.slice(-5).forEach((r) => {
        msg += `• ${r.anonymous ? "🔒 Anonim" : r.senderName}: "${r.message}"\n`;
      });
      if (replies.length > 5) msg += `... dan ${replies.length - 5} balasan lainnya\n`;
    } else {
      msg += `📩 Belum ada balasan.\n`;
    }
    await m.react("🐣");
    return m.reply(claraWrap("menfess", msg));
  }

  // ─── SETCHANNEL (owner, di grup target — ala !setmenfesschannel) ───
  if (sub === "setchannel" || sub === "setgrup" || sub === "set") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", "⛔ Cuma owner yang bisa atur channel menfess!", "error"));
    }
    if (!m.isGroup) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", [
        `Command ini harus dipakai DI GRUP yang mau dijadiin channel.`,
        ``,
        `💡 Join bot ke grupnya → ketik ${m.prefix}menfess setchannel di sana.`,
      ].join("\n"), "error"));
    }

    await m.react("🕒");
    mf.channel = m.chat;
    saveMf(db, mf);
    await m.react("🐣");
    return m.reply(claraWrap("menfess", [
      `✅ Channel menfess diatur ke grup ini!`,
      ``,
      `📌 Semua menfess baru bakal dikirim ke sini.`,
      `🔓 Reset: ${m.prefix}menfess delchannel`,
    ].join("\n")));
  }

  // ─── DELCHANNEL (owner) — reset channel ───
  if (sub === "delchannel" || sub === "resetchannel") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", "⛔ Cuma owner yang bisa reset channel menfess!", "error"));
    }
    mf.channel = null;
    saveMf(db, mf);
    await m.react("🐣");
    return m.reply(claraWrap("menfess", "✅ Channel menfess direset. Menfess baru cuma tersimpan di database."));
  }

  // ─── MODE (owner) — reply anon atau non-anon ───
  if (sub === "mode") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", "⛔ Cuma owner yang bisa atur mode menfess!", "error"));
    }
    const mode = (args[1] || "").toLowerCase();
    if (mode === "anon" || mode === "anonymous" || mode === "anonim") {
      mf.anonymousMode = true;
      saveMf(db, mf);
      await m.react("🐣");
      return m.reply(claraWrap("menfess", "🔒 Mode reply: ANONIM — identitas yang balas gak kelihatan."));
    }
    if (mode === "nonanon" || mode === "non-anon" || mode === "non" || mode === "nonanonim") {
      mf.anonymousMode = false;
      saveMf(db, mf);
      await m.react("🐣");
      return m.reply(claraWrap("menfess", "👤 Mode reply: NON-ANONIM — nama yang balas kelihatan."));
    }
    await m.react("❗");
    return m.reply(claraWrap("menfess", [
      `Mode sekarang: ${mf.anonymousMode ? "🔒 ANONIM" : "👤 NON-ANONIM"} (khusus reply)`,
      ``,
      `💡 Pilihan: ${m.prefix}menfess mode anon | nonanon`,
    ].join("\n")));
  }

  // ─── LIMIT (owner) — batas harian per user, 1-20 — ala !menfesslimit ───
  if (sub === "limit") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", "⛔ Cuma owner yang bisa atur limit menfess!", "error"));
    }
    const limit = parseInt(args[1] || "", 10);
    if (Number.isNaN(limit) || limit < 1 || limit > 20) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", [
        `Masukkan angka *1-20*!`,
        ``,
        `💡 Contoh: ${m.prefix}menfess limit 5`,
        `Limit sekarang: *${mf.dailyLimit}* menfess/user/hari`,
      ].join("\n"), "error"));
    }
    mf.dailyLimit = limit;
    saveMf(db, mf);
    await m.react("🐣");
    return m.reply(claraWrap("menfess", `✅ Batas harian diubah jadi *${limit}* menfess per user per hari!`));
  }

  // ─── DEL (owner) — hapus menfess ───
  if (sub === "del" || sub === "hapus" || sub === "delete") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", "⛔ Cuma owner yang bisa hapus menfess!", "error"));
    }
    const key = fromSC(args[1] || "").trim();
    const idx = mf.posts.findIndex((p) => p.id === key || (key && p.number === parseInt(key, 10)));
    if (idx === -1) {
      await m.react("❗");
      return m.reply(claraWrap("menfess", `Menfess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }
    const deleted = mf.posts.splice(idx, 1)[0];
    saveMf(db, mf);
    await m.react("🐣");
    return m.reply(claraWrap("menfess", `🗑️ Menfess *#${deleted.number}* berhasil dihapus!`));
  }

  // ─── STATS ───
  if (sub === "stats" || sub === "stat" || sub === "statistik") {
    const total = mf.posts.length;
    const anon = mf.posts.filter((p) => p.anonymous).length;
    const nonAnon = total - anon;
    const totalLikes = mf.posts.reduce((s, p) => s + (p.likes?.length || 0), 0);
    const totalReplies = mf.posts.reduce((s, p) => s + (p.replies?.length || 0), 0);
    const todayCount = mf.posts.filter((p) => sameDay(p.timestamp)).length;

    await m.react("🐣");
    return m.reply(claraWrap("menfess", [
      `📊 STATISTIK MENFESS`,
      ``,
      `📨 Total menfess: *${total}*`,
      `📅 Hari ini: *${todayCount}*`,
      `🔒 Anonim: *${anon}*`,
      `👤 Non-anonim: *${nonAnon}*`,
      `❤️ Total like: *${totalLikes}*`,
      `💬 Total balasan: *${totalReplies}*`,
      `📡 Channel: ${mf.channel ? "✅ diatur" : "❌ belum"}`,
      `🔒 Mode reply: ${mf.anonymousMode ? "Anonim" : "Non-Anonim"}`,
      `📊 Limit harian: *${mf.dailyLimit}*/user`,
    ].join("\n")));
  }

  // ─── default: .menfess @target <pesan> — ANONIM (ala !menfess) ───
  if (!SUBS.has(sub)) {
    const target = args[0] || "";
    const message = args.slice(1).join(" ").trim();
    return sendMenfess(m, sock, db, mf, target, message, true);
  }

  // sub dikenal tapi gak kepakai (gak akan sampai sini — safety)
  await m.react("❗");
  return m.reply(claraWrap("menfess", `💡 Ketik ${m.prefix}menfess help buat lihat semua cara pakai`));
}

export { pluginConfig as config, handler };
