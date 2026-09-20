// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess V2 (channel terpusat, dulu "v3") — porting script confess bot standalone
// (owner, 9 Sep 2026): confess anonim / non-anonim ke CHANNEL TERPUSAT,
// reply per confess, like dedup, list, detail, mode anon reply, stats, hapus (owner).
// REVISI 20 Sep 2026 (owner: "bisa ga fitur confes yg dlu dikembalikan... jd
// yg confes skrg ini jd v2") — confess DM lama (pesan langsung ke orang + status
// ke grup, buat nembak org yang suka diam-diam) DIKEMBALIKAN jadi .confess;
// confess channel terpusat ini pindah command ke .confess2 (v2). Data db
// key "confessv3" TETAP (persisten, gak perlu migrasi).
// Command: .confess2 <pesan> | .confess2 say <pesan> | reply/like/list/read/del/setchannel/mode/stats/help
// Data tersimpan di db.setting("confessv3") — persisten via nova-database.

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { fromSC } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "confess2",
  alias: ["confess2", "confessv2", "confessv3", "confessch", "confesschannel"],
  category: "confess menfess",
  description: "Confess v2 channel terpusat: confess anonim/non-anonim + reply, like, stats",
  usage: ".confess2 <pesan>\n.confess2 say <pesan>\n.confess2 reply <id> <balasan>\n.confess2 like <id>\n.confess2 list\n.confess2 read <id/nomor>\n.confess2 setchannel (di grup)\n.confess2 mode <anon/nonanon>\n.confess2 del <id/nomor> (owner)\n.confess2 stats",
  example: ".confess2 aku suka seseorang\n.confess2 say aku Budi\n.confess2 setchannel",
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
const SUBS = new Set(["confess", "kirim", "say", "ngomong", "reply", "balas", "like", "suka", "list", "daftar",
  "read", "baca", "detail", "del", "hapus", "delete", "setchannel", "setgrup", "set", "delchannel",
  "resetchannel", "mode", "stats", "stat", "statistik", "help", "bantuan", "menu"]);

// ── helpers data (pola confesswall: satu key settings global) ──
function getCh(db) {
  try {
    let ch = db.setting("confessv3");
    if (!ch || typeof ch !== "object") ch = {};
    if (!Array.isArray(ch.posts)) ch.posts = [];
    if (typeof ch.counter !== "number") ch.counter = 0;
    if (typeof ch.anonymousMode !== "boolean") ch.anonymousMode = true; // default: reply anonim
    if (!ch.channel) ch.channel = null; // jid grup/channel tujuan confess
    return ch;
  } catch (e) {
    console.error("[confess] getCh error:", e.message);
    return { posts: [], counter: 0, anonymousMode: true, channel: null };
  }
}

function saveCh(db, ch) {
  try {
    db.setting("confessv3", ch);
    db.save();
  } catch (e) {
    console.error("[confess] saveCh error:", e.message);
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

// cari post berdasarkan id (string pendek) ATAU nomor urut (#N)
function findPost(ch, key) {
  // key di-normalisasi dari smallcaps — user sering copy ID dari pesan bot
  const k = fromSC(String(key || "")).trim();
  if (!k) return null;
  const byId = ch.posts.find((p) => p.id === k);
  if (byId) return byId;
  const num = parseInt(k, 10);
  if (!Number.isNaN(num)) return ch.posts.find((p) => p.number === num) || null;
  return null;
}

// ── format pesan ke channel ──
function buildChannelPost(post) {
  const head = post.anonymous
    ? `📨 CONFESS ANONIM #${post.number}`
    : `📨 CONFESS DARI ${post.senderName}`;
  return [
    head,
    "",
    `"${post.message}"`,
    "",
    `📅 ${formatTime(post.timestamp)}`,
    `💬 Balas: .confess reply ${post.id} <pesan>`,
    `❤️ Suka: .confess like ${post.id}`,
    `📖 Detail: .confess read ${post.number}`,
  ].join("\n");
}

function buildChannelReply(post, reply) {
  return [
    `💬 REPLY UNTUK CONFESS #${post.number}`,
    "",
    `📨 Dari: ${reply.anonymous ? "Anonim" : reply.senderName}`,
    `💬 "${reply.message}"`,
    "",
    `📅 ${formatTime(reply.timestamp)}`,
  ].join("\n");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.fullArgs || m.text || "").trim().split(/\s+/).filter(Boolean);
  const sub = (args[0] || "").toLowerCase();
  const ch = getCh(db);

  // ─── HELP / no-arg ───
  if (!sub || sub === "help" || sub === "bantuan" || sub === "menu") {
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `Confess ke channel terpusat — 2 versi: anonim & non-anonim.`,
      ``,
      `💌 KIRIM CONFESS`,
      `🔒 Anonim : ${m.prefix}confess2 <pesan>`,
      `👤 Non-anonim : ${m.prefix}confess2 say <pesan>`,
      ``,
      `💬 REPLY — ${m.prefix}confess2 reply <id> <pesan>`,
      `${ch.anonymousMode ? "🔒 Anonim (sesuai mode)" : "👤 Nama terlihat (sesuai mode)"} — atur via mode owner`,
      ``,
      `❤️ LIKE — ${m.prefix}confess2 like <id>`,
      `📖 DETAIL — ${m.prefix}confess2 read <id/nomor>`,
      `📋 DAFTAR — ${m.prefix}confess2 list`,
      ``,
      `🔧 OWNER`,
      `${m.prefix}confess2 setchannel (di grup target)`,
      `${m.prefix}confess2 mode <anon/nonanon> — atur reply`,
      `${m.prefix}confess2 del <id/nomor>`,
      ``,
      `📊 ${m.prefix}confess2 stats — statistik confess`,
      `❓ Channel: ${ch.channel ? "✅ sudah diatur" : "❌ belum diatur"}`,
    ].join("\n")));
  }

  // ─── CONFESS (anonim) — sub .confess confess <pesan> (kompatibilitas) ───
  if (sub === "confess" || sub === "kirim") {
    const message = args.slice(1).join(" ").trim();
    if (!message || message.length < MIN_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", [
        `Pesan kependekan! Minimal ${MIN_LEN} karakter.`,
        ``,
        `💡 Contoh: ${m.prefix}confess2 aku suka sama dia`,
      ].join("\n"), "error"));
    }
    if (message.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
    }

    await m.react("🕒");
    ch.counter = (ch.counter || 0) + 1;
    const post = {
      id: generateId(),
      number: ch.counter,
      message,
      sender: m.sender,
      senderName: m.pushName || "User",
      timestamp: Date.now(),
      anonymous: true,
      likes: [],
      replies: [],
    };
    ch.posts.push(post);
    saveCh(db, ch);

    if (ch.channel) {
      try {
        await sock.sendMessage(ch.channel, { text: buildChannelPost(post) });
      } catch (e) {
        console.error("[confess] kirim ke channel gagal:", e.message);
      }
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", [
        `✅ Confess anonim *#${post.number}* berhasil dikirim ke channel!`,
        ``,
        `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      ].join("\n")));
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `✅ Confess anonim *#${post.number}* tersimpan!`,
      ``,
      `📌 Belum ada channel confess diatur.`,
      `Owner bisa set: ${m.prefix}confess2 setchannel (di grup target)`,
    ].join("\n")));
  }

  // ─── SAY (non-anonim) ───
  if (sub === "say" || sub === "ngomong") {
    const message = args.slice(1).join(" ").trim();
    if (!message || message.length < MIN_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", [
        `Pesan kependekan! Minimal ${MIN_LEN} karakter.`,
        ``,
        `💡 Contoh: ${m.prefix}confess2 say aku Budi, hai semua`,
      ].join("\n"), "error"));
    }
    if (message.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
    }

    await m.react("🕒");
    ch.counter = (ch.counter || 0) + 1;
    const post = {
      id: generateId(),
      number: ch.counter,
      message,
      sender: m.sender,
      senderName: m.pushName || "User",
      timestamp: Date.now(),
      anonymous: false,
      likes: [],
      replies: [],
    };
    ch.posts.push(post);
    saveCh(db, ch);

    if (ch.channel) {
      try {
        await sock.sendMessage(ch.channel, { text: buildChannelPost(post) });
      } catch (e) {
        console.error("[confess] kirim ke channel gagal:", e.message);
      }
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", [
        `✅ Confess non-anonim dari *${post.senderName}* (*#${post.number}*) terkirim!`,
        ``,
        `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      ].join("\n")));
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `✅ Confess non-anonim *#${post.number}* tersimpan!`,
      ``,
      `📌 Belum ada channel confess diatur.`,
      `Owner bisa set: ${m.prefix}confess2 setchannel (di grup target)`,
    ].join("\n")));
  }

  // ─── REPLY ───
  if (sub === "reply" || sub === "balas") {
    const key = args[1] || "";
    const replyMsg = args.slice(2).join(" ").trim();
    const post = findPost(ch, key);

    if (!key || !replyMsg) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", [
        `Format: ${m.prefix}confess2 reply <id/nomor> <pesan>`,
        ``,
        `💡 Contoh: ${m.prefix}confess2 reply ${ch.posts.at(-1)?.id || "abc12"} aku setuju!`,
      ].join("\n"), "error"));
    }
    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Confess dengan id/nomor *${key}* gak ditemukan!`, "error"));
    }
    if (replyMsg.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Balasan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
    }

    await m.react("🕒");
    const reply = {
      id: generateId(),
      message: replyMsg,
      sender: m.sender,
      senderName: m.pushName || "User",
      anonymous: ch.anonymousMode, // reply ikut mode global (ala script)
      timestamp: Date.now(),
    };
    post.replies = post.replies || [];
    post.replies.push(reply);
    saveCh(db, ch);

    if (ch.channel) {
      try {
        await sock.sendMessage(ch.channel, { text: buildChannelReply(post, reply) });
      } catch (e) {
        console.error("[confess] kirim reply ke channel gagal:", e.message);
      }
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `✅ Balasan untuk confess *#${post.number}* terkirim!`,
      `🔒 Identitas kamu: ${ch.anonymousMode ? "anonim" : "kelihatan (" + reply.senderName + ")"}`,
    ].join("\n")));
  }

  // ─── LIKE ───
  if (sub === "like" || sub === "suka") {
    const key = args[1] || "";
    const post = findPost(ch, key);

    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }

    post.likes = post.likes || [];
    if (post.likes.includes(m.sender)) {
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", `❤️ Kamu sudah menyukai confess *#${post.number}*!`));
    }
    post.likes.push(m.sender);
    saveCh(db, ch);
    await m.react("❤️");
    return m.reply(claraWrap("confess v2", [
      `❤️ Kamu menyukai confess *#${post.number}*!`,
      `Total suka: *${post.likes.length}*`,
    ].join("\n")));
  }

  // ─── LIST ───
  if (sub === "list" || sub === "daftar") {
    if (ch.posts.length === 0) {
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", [
        `📭 Belum ada confess.`,
        ``,
        `💡 Mulai: ${m.prefix}confess2 confess <pesan>`,
      ].join("\n")));
    }

    const latest = ch.posts.slice(-10).reverse();
    let msg = `📋 POST TERAKHIR (${latest.length} dari ${ch.posts.length} total)\n\n`;
    latest.forEach((p) => {
      const type = p.anonymous ? "🔒 Anonim" : `👤 ${p.senderName}`;
      const preview = p.message.length > 40 ? p.message.slice(0, 40) + "..." : p.message;
      msg += `*#${p.number}* ${type}\n`;
      msg += `📝 ${preview}\n`;
      msg += `❤️ ${p.likes?.length || 0} | 💬 ${(p.replies || []).length} | 🆔 ${p.id}\n\n`;
    });
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", msg));
  }

  // ─── READ / DETAIL ───
  if (sub === "read" || sub === "baca" || sub === "detail") {
    const key = args[1] || "";
    const post = findPost(ch, key);

    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }

    let msg = `📨 CONFESS #${post.number}\n\n`;
    msg += `📝 "${post.message}"\n\n`;
    msg += `📅 ${formatTime(post.timestamp)}\n`;
    msg += `🔒 ${post.anonymous ? "Anonim" : post.senderName}\n`;
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
    return m.reply(claraWrap("confess v2", msg));
  }

  // ─── SETCHANNEL (owner, di grup target — ala !setconfesschannel) ───
  if (sub === "setchannel" || sub === "setgrup" || sub === "set") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", "⛔ Cuma owner yang bisa atur channel confess!", "error"));
    }
    if (!m.isGroup) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", [
        `Command ini harus dipakai DI GRUP yang mau dijadiin channel.`,
        ``,
        `💡 Join bot ke grupnya → ketik ${m.prefix}confess2 setchannel di sana.`,
      ].join("\n"), "error"));
    }

    await m.react("🕒");
    ch.channel = m.chat;
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `✅ Channel confess diatur ke grup ini!`,
      ``,
      `📌 Semua confess baru bakal dikirim ke sini.`,
      `🔓 Reset: ${m.prefix}confess2 delchannel`,
    ].join("\n")));
  }

  // ─── DELCHANNEL (owner) — reset channel ───
  if (sub === "delchannel" || sub === "resetchannel") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", "⛔ Cuma owner yang bisa reset channel confess!", "error"));
    }
    ch.channel = null;
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", "✅ Channel confess direset. Confess baru cuma tersimpan di database."));
  }

  // ─── MODE (owner) — reply anon atau non-anon ───
  if (sub === "mode") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", "⛔ Cuma owner yang bisa atur mode confess!", "error"));
    }
    const mode = (args[1] || "").toLowerCase();
    if (mode === "anon" || mode === "anonymous" || mode === "anonim") {
      ch.anonymousMode = true;
      saveCh(db, ch);
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", "🔒 Mode reply: ANONIM — identitas yang balas gak kelihatan."));
    }
    if (mode === "nonanon" || mode === "non-anon" || mode === "non" || mode === "nonanonim") {
      ch.anonymousMode = false;
      saveCh(db, ch);
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", "👤 Mode reply: NON-ANONIM — nama yang balas kelihatan."));
    }
    await m.react("❗");
    return m.reply(claraWrap("confess v2", [
      `Mode sekarang: ${ch.anonymousMode ? "🔒 ANONIM" : "👤 NON-ANONIM"} (khusus reply)`,
      ``,
      `💡 Pilihan: ${m.prefix}confess2 mode anon | nonanon`,
    ].join("\n")));
  }

  // ─── DEL (owner) — hapus confess ───
  if (sub === "del" || sub === "hapus" || sub === "delete") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", "⛔ Cuma owner yang bisa hapus confess!", "error"));
    }
    const key = fromSC(args[1] || "").trim();
    const idx = ch.posts.findIndex((p) => p.id === key || (key && p.number === parseInt(key, 10)));
    if (idx === -1) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }
    const deleted = ch.posts.splice(idx, 1)[0];
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", `🗑️ Confess *#${deleted.number}* berhasil dihapus!`));
  }

  // ─── STATS ───
  if (sub === "stats" || sub === "stat" || sub === "statistik") {
    const total = ch.posts.length;
    const anon = ch.posts.filter((p) => p.anonymous).length;
    const nonAnon = total - anon;
    const totalLikes = ch.posts.reduce((s, p) => s + (p.likes?.length || 0), 0);
    const totalReplies = ch.posts.reduce((s, p) => s + (p.replies?.length || 0), 0);

    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `📊 STATISTIK CONFESS`,
      ``,
      `📨 Total confess: *${total}*`,
      `🔒 Anonim: *${anon}*`,
      `👤 Non-anonim: *${nonAnon}*`,
      `❤️ Total like: *${totalLikes}*`,
      `💬 Total balasan: *${totalReplies}*`,
      `📡 Channel: ${ch.channel ? "✅ diatur" : "❌ belum"}`,
      `🔒 Mode reply: ${ch.anonymousMode ? "Anonim" : "Non-Anonim"}`,
    ].join("\n")));
  }

  // ─── default: .confess <pesan> — ANONIM langsung (ala !confess <pesan>) ───
  if (!SUBS.has(sub)) {
    const message = (m.fullArgs || m.text || "").trim();
    if (!message || message.length < MIN_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", [
        `Pesan kependekan! Minimal ${MIN_LEN} karakter.`,
        ``,
        `💡 Contoh: ${m.prefix}confess2 aku suka sama dia`,
      ].join("\n"), "error"));
    }
    if (message.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess v2", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
    }

    await m.react("🕒");
    ch.counter = (ch.counter || 0) + 1;
    const post = {
      id: generateId(),
      number: ch.counter,
      message,
      sender: m.sender,
      senderName: m.pushName || "User",
      timestamp: Date.now(),
      anonymous: true,
      likes: [],
      replies: [],
    };
    ch.posts.push(post);
    saveCh(db, ch);

    if (ch.channel) {
      try {
        await sock.sendMessage(ch.channel, { text: buildChannelPost(post) });
      } catch (e) {
        console.error("[confess] kirim ke channel gagal:", e.message);
      }
      await m.react("🐣");
      return m.reply(claraWrap("confess v2", [
        `✅ Confess anonim *#${post.number}* berhasil dikirim ke channel!`,
        ``,
        `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      ].join("\n")));
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess v2", [
      `✅ Confess anonim *#${post.number}* tersimpan!`,
      ``,
      `📌 Belum ada channel confess diatur.`,
      `Owner bisa set: ${m.prefix}confess2 setchannel (di grup target)`,
    ].join("\n")));
  }

  // ─── sub SUBS tapi gak kepakai (safety) ───
  await m.react("❗");
  return m.reply(claraWrap("confess v2", `💡 Ketik ${m.prefix}confess2 help buat lihat semua cara pakai`));
}

export { pluginConfig as config, handler };
