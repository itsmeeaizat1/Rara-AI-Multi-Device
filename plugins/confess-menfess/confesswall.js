// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess Wall — confession wall grup, post anonim dengan thread & react
// Disimpan di db.setting("confesswall") per-grup

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "confesswall",
  alias: ["confesswall"],
  category: "confess menfess",
  description: "Confession wall grup - post anonim dengan thread & react",
  usage: ".confesswall post <teks>\n.confesswall list\n.confesswall read <id>\n.confesswall react <id> <type>\n.confesswall reply <id> <teks>\n.confesswall stats",
  example: ".confesswall post aku suka seseorang di grup ini",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const REACT_TYPES = {
  support: { emoji: "🤝", label: "Support" },
  relate:  { emoji: "😤", label: "Relate" },
  love:    { emoji: "❤️", label: "Love" },
  hug:     { emoji: "🤗", label: "Hug" },
};

function getWall(db, gid) {
  try {
    const all = db.setting("confesswall") || {};
    if (!all[gid]) {
      all[gid] = { posts: [], counter: 0 };
      db.setting("confesswall", all);
    }
    return all[gid];
  } catch (e) {
    console.error("[confesswall] getWall error:", e.message);
    return { posts: [], counter: 0 };
  }
}

function saveWall(db, gid, data) {
  try {
    const all = db.setting("confesswall") || {};
    all[gid] = data;
    db.setting("confesswall", all);
    db.save();
  } catch (e) {
    console.error("[confesswall] saveWall error:", e.message);
  }
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "unknown";
  }
}

function buildHeader() {
  return ``
}

function buildFooter() {
  return ``;
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const gid = m.chat;
    const args = (m.fullArgs || m.text || "").trim().split(/\s+/);
    const sub = (args[0] || "").toLowerCase();
    const wall = getWall(db, gid);

    // ─── POST ───
    if (sub === "post" || sub === "tulis" || sub === "curhat") {
      const text = args.slice(1).join(" ").trim();
      if (!text || text.length < 5) {
        await m.reply(claraWrap("confesswall", [
          `Pesan kependekan nih! Minimal 5 karakter.`,
          ``,
          `💡 Contoh: ${m.prefix}confesswall post <confess kamu>`,
        ]));
        return;
      }
      if (text.length > 500) {
        await m.reply(claraWrap("confesswall", "Pesan kepanjangan nih! Maksimal 500 karakter.", "error"));
        return;
      }

      wall.counter = (wall.counter || 0) + 1;
      const post = {
        id: wall.counter,
        text,
        author: m.sender,
        anonymous: true,
        createdAt: Date.now(),
        reactions: { support: 0, relate: 0, love: 0, hug: 0 },
        reactedBy: {},
        replies: [],
      };
      wall.posts.push(post);
      saveWall(db, gid, wall);

      const preview = text.length > 80 ? text.slice(0, 80) + "..." : text;
      await m.reply(novaGameBox({
        title: "confess terposting", icon: "💌",
        flavor: "💌 *CONFESS TERPOSTING!*",
        body: [
          `│ • 🆔 Post ID : #${post.id}`,
          "│ • 🔒 Status : Anonim",
          `│ • 💭 Isi : ${preview}`,
          `│ • ❤️ React : ${m.prefix}confesswall react ${post.id} <type>`,
          `│ • ✉️ Reply : ${m.prefix}confesswall reply ${post.id} <balasan>`,
          `│ • 📖 Read : ${m.prefix}confesswall read ${post.id}`,
        ].join("\n"),
        cta: gameCTA("confesswall"),
      }));
      await m.react("💌");
      return;
    }

    // ─── LIST ───
    if (sub === "list" || sub === "daftar" || sub === "wall" || !sub) {
      const recent = (wall.posts || []).slice(-5).reverse();
      if (recent.length === 0) {
        await m.reply(claraWrap("confesswall", [
          `Wall masih kosong nih!`,
          ``,
          `💡 Mulai dengan ${m.prefix}confesswall post <confess>`,
        ]));
        return;
      }

      let msg = buildHeader();
      msg += `  📋 *Post Terakhir* (${recent.length} dari ${wall.posts.length} total)\n\n`;
      recent.forEach((p) => {
        const totalReacts = (p.reactions?.support || 0) + (p.reactions?.relate || 0) + (p.reactions?.love || 0) + (p.reactions?.hug || 0);
        const preview = p.text.length > 80 ? p.text.slice(0, 80) + "..." : p.text;
        msg += `*#${p.id}* (${formatTime(p.createdAt)})\n`;
        msg += `"${preview}"\n`;
        msg += `${totalReacts} react, ${(p.replies || []).length} reply\n\n`;
      });
      msg += `Baca full: \`${m.prefix}confesswall read <id>\`\n`;
      msg += buildFooter();
      await m.reply(msg);
      return;
    }

    // ─── READ ───
    if (sub === "read" || sub === "baca") {
      const id = parseInt(args[1] || "0", 10);
      const post = (wall.posts || []).find((p) => p.id === id);
      if (!post) {
        let msg = buildHeader();
        msg += `Post #${id} gak nemu nih!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      let msg = buildHeader();
      msg += `  *post #${post.id}*\n`;
      msg += `📅 ${formatTime(post.createdAt)}\n`;
      msg += `🔒 Anonim\n\n`;
      msg += `  📝 *Isi Confess:*\n  \`\`\`${post.text}\`\`\`\n\n`;

      // Reactions
      msg += `  *reactions:*\n`;
      Object.entries(REACT_TYPES).forEach(([key, val]) => {
        const count = post.reactions?.[key] || 0;
        msg += `${val.emoji} ${val.label}: *${count}*\n`;
      });

      // Replies
      const replies = post.replies || [];
      msg += `\n  *replies* (${replies.length}):\n`;
      if (replies.length === 0) {
        msg += `(belum ada balasan)\n`;
        msg += `\`${m.prefix}confesswall reply ${post.id} <teks>\`\n`;
      } else {
        replies.forEach((r, i) => {
          msg += `${i + 1}. \`\`\`${r.text}\`\`\`\n`;
        });
      }
      msg += buildFooter();
      await m.reply(msg);
      return;
    }

    // ─── REACT ───
    if (sub === "react" || sub === "reaksi") {
      const id = parseInt(args[1] || "0", 10);
      const type = (args[2] || "").toLowerCase().trim();
      const post = (wall.posts || []).find((p) => p.id === id);

      if (!post) {
        let msg = buildHeader();
        msg += `Post #${id} gak nemu nih!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      if (!REACT_TYPES[type]) {
        let msg = buildHeader();
        msg += `❌ Type tidak valid!\n`;
        msg += `  *react type:*\n`;
        Object.entries(REACT_TYPES).forEach(([k, v]) => {
          msg += `${v.emoji} \`${k}\`\n`;
        });
        msg += `
\`${m.prefix}confesswall react ${id} <type>\`\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      if (!post.reactedBy) post.reactedBy = {};
      if (!post.reactions) post.reactions = { support: 0, relate: 0, love: 0, hug: 0 };

      const oldType = post.reactedBy[m.sender];
      if (oldType) {
        if (oldType === type) {
          // Toggle off
          post.reactions[oldType] = Math.max(0, (post.reactions[oldType] || 0) - 1);
          delete post.reactedBy[m.sender];
          saveWall(db, gid, wall);
          let msg = buildHeader();
          msg += `✅ React ${REACT_TYPES[type].emoji} dihapus dari #${id}\n`;
          msg += buildFooter();
          await m.reply(msg);
        } else {
          // Change react
          post.reactions[oldType] = Math.max(0, (post.reactions[oldType] || 0) - 1);
          post.reactions[type] = (post.reactions[type] || 0) + 1;
          post.reactedBy[m.sender] = type;
          saveWall(db, gid, wall);
          let msg = buildHeader();
          msg += `✅ React diubah ke ${REACT_TYPES[type].emoji} ${REACT_TYPES[type].label} di #${id}\n`;
          msg += buildFooter();
          await m.reply(msg);
        }
      } else {
        // New react
        post.reactions[type] = (post.reactions[type] || 0) + 1;
        post.reactedBy[m.sender] = type;
        saveWall(db, gid, wall);
        let msg = buildHeader();
        msg += `✅ ${REACT_TYPES[type].emoji} ${REACT_TYPES[type].label} terkirim ke #${id}!\n\n`;
        msg += `  *total reacts:*\n`;
        Object.entries(REACT_TYPES).forEach(([k, v]) => {
          const c = post.reactions[k] || 0;
          if (c > 0) msg += `${v.emoji} ${v.label}: *${c}*\n`;
        });
        msg += buildFooter();
        await m.reply(msg);
      }
      return;
    }

    // ─── REPLY ───
    if (sub === "reply" || sub === "balas") {
      const id = parseInt(args[1] || "0", 10);
      const text = args.slice(2).join(" ").trim();
      const post = (wall.posts || []).find((p) => p.id === id);

      if (!post) {
        let msg = buildHeader();
        msg += `Post #${id} gak nemu nih!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      if (!text || text.length < 3) {
        let msg = buildHeader();
        msg += `❌ Balasan kosong! Minimal 3 karakter.\n`;
        msg += `\`${m.prefix}confesswall reply ${id} <teks>\`\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      if (text.length > 500) {
        let msg = buildHeader();
        msg += `❌ Maksimal 500 karakter!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }

      if (!post.replies) post.replies = [];
      post.replies.push({
        user: m.sender,
        text,
        ts: Date.now(),
        anonymous: true,
      });
      saveWall(db, gid, wall);

      let msg = buildHeader();
      msg += `✅ Reply terkirim ke #${id}!\n`;
      msg += `💬 Total reply: *${post.replies.length}*\n\n`;
      msg += `  📝 *Isi balasan:*\n  \`\`\`${text}\`\`\`\n`;
      msg += buildFooter();
      await m.reply(msg);
      return;
    }

    // ─── STATS ───
    if (sub === "stats" || sub === "statistik") {
      const posts = wall.posts || [];
      const totalReacts = posts.reduce((sum, p) => {
        return sum + (p.reactions?.support || 0) + (p.reactions?.relate || 0) + (p.reactions?.love || 0) + (p.reactions?.hug || 0);
      }, 0);
      const totalReplies = posts.reduce((sum, p) => sum + (p.replies?.length || 0), 0);

      let msg = buildHeader();
      msg += `  📊 *Statistik Confess Wall*\n\n`;
      msg += `📝 Total posts: *${posts.length}*\n`;
      msg += `💬 Total replies: *${totalReplies}*\n`;
      msg += `💕 Total reacts: *${totalReacts}*\n\n`;

      // React breakdown
      const breakdown = { support: 0, relate: 0, love: 0, hug: 0 };
      posts.forEach((p) => {
        if (p.reactions) {
          Object.keys(breakdown).forEach((k) => {
            breakdown[k] += p.reactions[k] || 0;
          });
        }
      });
      msg += `  *react breakdown:*\n`;
      Object.entries(REACT_TYPES).forEach(([k, v]) => {
        msg += `${v.emoji} ${v.label}: *${breakdown[k]}*\n`;
      });
      msg += buildFooter();
      await m.reply(msg);
      return;
    }

    // ─── REVEAL (owner only) ───
    if (sub === "reveal" || sub === "buka") {
      if (!m.isOwner) {
        let msg = buildHeader();
        msg += `❌ Khusus owner!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }
      const id = parseInt(args[1] || "0", 10);
      const post = (wall.posts || []).find((p) => p.id === id);
      if (!post) {
        let msg = buildHeader();
        msg += `Post #${id} gak nemu nih!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }
      let msg = buildHeader();
      msg += `  *reveal post #${id}*\n\n`;
      msg += `👤 Author: @${post.author.split("@")[0]}\n`;
      msg += `📅 ${formatTime(post.createdAt)}\n`;
      msg += `📝 \`\`\`${post.text}\`\`\`\n`;
      msg += buildFooter();
      await m.reply(msg, { mentions: [post.author] });
      return;
    }

    // ─── DELETE (owner only) ───
    if (sub === "del" || sub === "hapus") {
      if (!m.isOwner) {
        let msg = buildHeader();
        msg += `❌ Khusus owner!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }
      const id = parseInt(args[1] || "0", 10);
      const idx = (wall.posts || []).findIndex((p) => p.id === id);
      if (idx === -1) {
        let msg = buildHeader();
        msg += `Post #${id} gak nemu nih!\n`;
        msg += buildFooter();
        await m.reply(msg);
        return;
      }
      wall.posts.splice(idx, 1);
      saveWall(db, gid, wall);
      let msg = buildHeader();
      msg += `✅ Post #${id} dihapus!\n`;
      msg += buildFooter();
      await m.reply(msg);
      return;
    }

    // ─── HELP ───
    let msg = buildHeader();
    msg += `  📌 Format:\n\n`;
    msg += `\`${m.prefix}confesswall post <teks>\`
Post anonim ke wall (min 5, max 500 karakter)\n\n`;
    msg += `\`${m.prefix}confesswall list\`
Lihat 5 post terakhir\n\n`;
    msg += `\`${m.prefix}confesswall read <id>\`
Baca post + semua reply\n\n`;
    msg += `\`${m.prefix}confesswall react <id> <type>\`
React post (support, relate, love, hug)\n\n`;
    msg += `\`${m.prefix}confesswall reply <id> <teks>\`
Balas post anonim\n\n`;
    msg += `\`${m.prefix}confesswall stats\`
Statistik wall grup\n\n`;
    msg += `\`${m.prefix}confesswall reveal <id>\` *(owner)*
Buka identitas penulis\n\n`;
    msg += `\`${m.prefix}confesswall del <id>\` *(owner)*
Hapus post\n\n`;
    msg += `  *react type:*\n`;
    Object.entries(REACT_TYPES).forEach(([k, v]) => {
      msg += `${v.emoji} \`${k}\`\n`;
    });
    msg += buildFooter();
    await m.reply(msg);
  } catch (e) {
    console.error("[confesswall] Handler error:", e.message);
  }
}

export { pluginConfig as config, handler };
