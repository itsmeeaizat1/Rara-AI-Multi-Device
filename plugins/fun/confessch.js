// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess Channel — porting script confess bot standalone (owner, 9 Sep 2026):
// confess anonim (!confess) / non-anonim (!say) ke CHANNEL TERPUSAT,
// reply per confess, like dedup, list, detail, mode anon reply, stats, hapus (owner).
// Command: .confessch <confess|say|reply|like|list|read|del|setchannel|mode|stats|help>
// Data tersimpan di db.setting("confessch") — persisten via nova-database.

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { fromSC } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "confessch",
  alias: ["confessch", "confesschannel"],
  category: "fun",
  description: "Confess channel terpusat: confess anonim/non-anonim + reply, like, stats",
  usage: ".confessch confess <pesan>\n.confessch say <pesan>\n.confessch reply <id> <balasan>\n.confessch like <id>\n.confessch list\n.confessch read <id/nomor>\n.confessch setchannel (di grup)\n.confessch mode <anon/nonanon>\n.confessch del <id/nomor> (owner)\n.confessch stats",
  example: ".confessch confess aku suka seseorang\n.confessch say aku Budi\n.confessch setchannel",
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

// ── helpers data (pola confesswall: satu key settings global) ──
function getCh(db) {
  try {
    let ch = db.setting("confessch");
    if (!ch || typeof ch !== "object") ch = {};
    if (!Array.isArray(ch.posts)) ch.posts = [];
    if (typeof ch.counter !== "number") ch.counter = 0;
    if (typeof ch.anonymousMode !== "boolean") ch.anonymousMode = true; // default: reply anonim
    if (!ch.channel) ch.channel = null; // jid grup/channel tujuan confess
    return ch;
  } catch (e) {
    console.error("[confessch] getCh error:", e.message);
    return { posts: [], counter: 0, anonymousMode: true, channel: null };
  }
}

function saveCh(db, ch) {
  try {
    db.setting("confessch", ch);
    db.save();
  } catch (e) {
    console.error("[confessch] saveCh error:", e.message);
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
    `💬 Balas: .confessch reply ${post.id} <pesan>`,
    `❤️ Suka: .confessch like ${post.id}`,
    `📖 Detail: .confessch read ${post.number}`,
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
    return m.reply(claraWrap("confess channel", [
      `Confess ke channel terpusat — 2 versi: anonim & non-anonim.`,
      ``,
      `💌 KIRIM CONFESS`,
      `🔒 Anonim : ${m.prefix}confessch confess <pesan>`,
      `👤 Non-anonim : ${m.prefix}confessch say <pesan>`,
      ``,
      `💬 REPLY — ${m.prefix}confessch reply <id> <pesan>`,
      `${ch.anonymousMode ? "🔒 Anonim (sesuai mode)" : "👤 Nama terlihat (sesuai mode)"} — atur via mode owner`,
      ``,
      `❤️ LIKE — ${m.prefix}confessch like <id>`,
      `📖 DETAIL — ${m.prefix}confessch read <id/nomor>`,
      `📋 DAFTAR — ${m.prefix}confessch list`,
      ``,
      `🔧 OWNER`,
      `${m.prefix}confessch setchannel (di grup target)`,
      `${m.prefix}confessch mode <anon/nonanon> — atur reply`,
      `${m.prefix}confessch del <id/nomor>`,
      ``,
      `📊 ${m.prefix}confessch stats — statistik confess`,
      `❓ Channel: ${ch.channel ? "✅ sudah diatur" : "❌ belum diatur"}`,
    ].join("\n")));
  }

  // ─── CONFESS (anonim) ───
  if (sub === "confess" || sub === "kirim") {
    const message = args.slice(1).join(" ").trim();
    if (!message || message.length < MIN_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", [
        `Pesan kependekan! Minimal ${MIN_LEN} karakter.`,
        ``,
        `💡 Contoh: ${m.prefix}confessch confess aku suka sama dia`,
      ].join("\n"), "error"));
    }
    if (message.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
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
        console.error("[confessch] kirim ke channel gagal:", e.message);
      }
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", [
        `✅ Confess anonim *#${post.number}* berhasil dikirim ke channel!`,
        ``,
        `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      ].join("\n")));
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", [
      `✅ Confess anonim *#${post.number}* tersimpan!`,
      ``,
      `📌 Belum ada channel confess diatur.`,
      `Owner bisa set: ${m.prefix}confessch setchannel (di grup target)`,
    ].join("\n")));
  }

  // ─── SAY (non-anonim) ───
  if (sub === "say" || sub === "ngomong") {
    const message = args.slice(1).join(" ").trim();
    if (!message || message.length < MIN_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", [
        `Pesan kependekan! Minimal ${MIN_LEN} karakter.`,
        ``,
        `💡 Contoh: ${m.prefix}confessch say aku Budi, hai semua`,
      ].join("\n"), "error"));
    }
    if (message.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Pesan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
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
        console.error("[confessch] kirim ke channel gagal:", e.message);
      }
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", [
        `✅ Confess non-anonim dari *${post.senderName}* (*#${post.number}*) terkirim!`,
        ``,
        `🆔 ID: *${post.id}* (simpan buat di-reply)`,
      ].join("\n")));
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", [
      `✅ Confess non-anonim *#${post.number}* tersimpan!`,
      ``,
      `📌 Belum ada channel confess diatur.`,
      `Owner bisa set: ${m.prefix}confessch setchannel (di grup target)`,
    ].join("\n")));
  }

  // ─── REPLY ───
  if (sub === "reply" || sub === "balas") {
    const key = args[1] || "";
    const replyMsg = args.slice(2).join(" ").trim();
    const post = findPost(ch, key);

    if (!key || !replyMsg) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", [
        `Format: ${m.prefix}confessch reply <id/nomor> <pesan>`,
        ``,
        `💡 Contoh: ${m.prefix}confessch reply ${ch.posts.at(-1)?.id || "abc12"} aku setuju!`,
      ].join("\n"), "error"));
    }
    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Confess dengan id/nomor *${key}* gak ditemukan!`, "error"));
    }
    if (replyMsg.length > MAX_LEN) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Balasan kepanjangan! Maksimal ${MAX_LEN} karakter.`, "error"));
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
        console.error("[confessch] kirim reply ke channel gagal:", e.message);
      }
    }
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", [
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
      return m.reply(claraWrap("confess channel", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }

    post.likes = post.likes || [];
    if (post.likes.includes(m.sender)) {
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", `❤️ Kamu sudah menyukai confess *#${post.number}*!`));
    }
    post.likes.push(m.sender);
    saveCh(db, ch);
    await m.react("❤️");
    return m.reply(claraWrap("confess channel", [
      `❤️ Kamu menyukai confess *#${post.number}*!`,
      `Total suka: *${post.likes.length}*`,
    ].join("\n")));
  }

  // ─── LIST ───
  if (sub === "list" || sub === "daftar") {
    if (ch.posts.length === 0) {
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", [
        `📭 Belum ada confess.`,
        ``,
        `💡 Mulai: ${m.prefix}confessch confess <pesan>`,
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
    return m.reply(claraWrap("confess channel", msg));
  }

  // ─── READ / DETAIL ───
  if (sub === "read" || sub === "baca" || sub === "detail") {
    const key = args[1] || "";
    const post = findPost(ch, key);

    if (!post) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
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
    return m.reply(claraWrap("confess channel", msg));
  }

  // ─── SETCHANNEL (owner, di grup target — ala !setconfesschannel) ───
  if (sub === "setchannel" || sub === "setgrup" || sub === "set") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", "⛔ Cuma owner yang bisa atur channel confess!", "error"));
    }
    if (!m.isGroup) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", [
        `Command ini harus dipakai DI GRUP yang mau dijadiin channel.`,
        ``,
        `💡 Join bot ke grupnya → ketik ${m.prefix}confessch setchannel di sana.`,
      ].join("\n"), "error"));
    }

    await m.react("🕒");
    ch.channel = m.chat;
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", [
      `✅ Channel confess diatur ke grup ini!`,
      ``,
      `📌 Semua confess baru bakal dikirim ke sini.`,
      `🔓 Reset: ${m.prefix}confessch delchannel`,
    ].join("\n")));
  }

  // ─── DELCHANNEL (owner) — reset channel ───
  if (sub === "delchannel" || sub === "resetchannel") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", "⛔ Cuma owner yang bisa reset channel confess!", "error"));
    }
    ch.channel = null;
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", "✅ Channel confess direset. Confess baru cuma tersimpan di database."));
  }

  // ─── MODE (owner) — reply anon atau non-anon ───
  if (sub === "mode") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", "⛔ Cuma owner yang bisa atur mode confess!", "error"));
    }
    const mode = (args[1] || "").toLowerCase();
    if (mode === "anon" || mode === "anonymous" || mode === "anonim") {
      ch.anonymousMode = true;
      saveCh(db, ch);
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", "🔒 Mode reply: ANONIM — identitas yang balas gak kelihatan."));
    }
    if (mode === "nonanon" || mode === "non-anon" || mode === "non" || mode === "nonanonim") {
      ch.anonymousMode = false;
      saveCh(db, ch);
      await m.react("🐣");
      return m.reply(claraWrap("confess channel", "👤 Mode reply: NON-ANONIM — nama yang balas kelihatan."));
    }
    await m.react("❗");
    return m.reply(claraWrap("confess channel", [
      `Mode sekarang: ${ch.anonymousMode ? "🔒 ANONIM" : "👤 NON-ANONIM"} (khusus reply)`,
      ``,
      `💡 Pilihan: ${m.prefix}confessch mode anon | nonanon`,
    ].join("\n")));
  }

  // ─── DEL (owner) — hapus confess ───
  if (sub === "del" || sub === "hapus" || sub === "delete") {
    if (!m.isOwner) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", "⛔ Cuma owner yang bisa hapus confess!", "error"));
    }
    const key = fromSC(args[1] || "").trim();
    const idx = ch.posts.findIndex((p) => p.id === key || (key && p.number === parseInt(key, 10)));
    if (idx === -1) {
      await m.react("❗");
      return m.reply(claraWrap("confess channel", `Confess dengan id/nomor *${key || "?"}* gak ditemukan!`, "error"));
    }
    const deleted = ch.posts.splice(idx, 1)[0];
    saveCh(db, ch);
    await m.react("🐣");
    return m.reply(claraWrap("confess channel", `🗑️ Confess *#${deleted.number}* berhasil dihapus!`));
  }

  // ─── STATS ───
  if (sub === "stats" || sub === "stat" || sub === "statistik") {
    const total = ch.posts.length;
    const anon = ch.posts.filter((p) => p.anonymous).length;
    const nonAnon = total - anon;
    const totalLikes = ch.posts.reduce((s, p) => s + (p.likes?.length || 0), 0);
    const totalReplies = ch.posts.reduce((s, p) => s + (p.replies?.length || 0), 0);

    await m.react("🐣");
    return m.reply(claraWrap("confess channel", [
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

  // ─── sub gak dikenal ───
  await m.react("❗");
  return m.reply(claraWrap("confess channel", [
    `Subcommand *${sub}* gak dikenal.`,
    ``,
    `💡 Ketik ${m.prefix}confessch help buat lihat semua cara pakai`,
  ].join("\n")));
}

export { pluginConfig as config, handler };
