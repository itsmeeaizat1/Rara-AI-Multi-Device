// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "confesswall",
  alias: ["confesswall", "wallconfess", "tembokcurhat"],
  category: "future",
  description: "Confession wall grup - post anonim dengan thread & react",
  usage: ".confesswall <command>",
  example: ".confesswall post aku suka seseorang di grup ini",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("confesswall") || {};
  if (!all[gid]) {
    all[gid] = { posts: [], counter: 0 };
    db.setting("confesswall", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("confesswall") || {};
  all[gid] = data;
  db.setting("confesswall", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "post" || sub === "tulis" || sub === "curhat") {
    const text = args.slice(2).join(" ").trim();
    if (!text || text.length < 5) {
      await m.reply(claraWrap("Confess Wall", "Format: " + prefix + "confesswall post <confess kamu>\nMin 5 karakter."));
      return { handled: true };
    }
    if (text.length > 500) {
      await m.reply(claraWrap("Confess Wall", "Maksimal 500 karakter."));
      return { handled: true };
    }
    cfg.counter++;
    const post = {
      id: cfg.counter,
      text,
      author: m.sender,
      anonymous: true,
      createdAt: Date.now(),
      reactions: { support: 0, relate: 0, love: 0, hug: 0 },
      reactedBy: {},
      replies: [],
    };
    cfg.posts.push(post);
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Confess Wall #" + post.id, [
      text,
      "",
      "React: " + prefix + "confesswall react " + post.id + " <support/relate/love/hug>",
      "Reply: " + prefix + "confesswall reply " + post.id + " <balasan>",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "reveal" || sub === "buka") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Confess Wall", "Khusus owner."));
      return { handled: true };
    }
    const id = parseInt(args[2] || "0", 10);
    const post = cfg.posts.find(p => p.id === id);
    if (!post) {
      await m.reply(claraWrap("Confess Wall", "Post tidak ditemukan."));
      return { handled: true };
    }
    await m.reply(claraWrap("Confess Wall Reveal", "Post #" + id + " oleh: @" + post.author.split("@")[0]), { mentions: [post.author] });
    return { handled: true };
  }

  if (sub === "react" || sub === "reaksi") {
    const id = parseInt(args[2] || "0", 10);
    const type = (args[3] || "").toLowerCase();
    const post = cfg.posts.find(p => p.id === id);
    if (!post) {
      await m.reply(claraWrap("Confess Wall", "Post tidak ditemukan."));
      return { handled: true };
    }
    if (!["support", "relate", "love", "hug"].includes(type)) {
      await m.reply(claraWrap("Confess Wall", "Type: support, relate, love, hug\nContoh: " + prefix + "confesswall react " + id + " love"));
      return { handled: true };
    }
    if (!post.reactedBy) post.reactedBy = {};
    if (post.reactedBy[m.sender]) {
      const oldType = post.reactedBy[m.sender];
      if (oldType === type) {
        // Remove reaction
        post.reactions[oldType] = Math.max(0, post.reactions[oldType] - 1);
        delete post.reactedBy[m.sender];
        saveConfig(db, gid, cfg);
        await m.reply(claraWrap("Confess Wall", "React " + type + " dihapus dari post #" + id + "."));
      } else {
        post.reactions[oldType] = Math.max(0, post.reactions[oldType] - 1);
        post.reactions[type] = (post.reactions[type] || 0) + 1;
        post.reactedBy[m.sender] = type;
        saveConfig(db, gid, cfg);
        await m.reply(claraWrap("Confess Wall", "React diubah ke " + type + " pada post #" + id + "."));
      }
    } else {
      post.reactions[type] = (post.reactions[type] || 0) + 1;
      post.reactedBy[m.sender] = type;
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Confess Wall", "React " + type + " pada post #" + id + "!\nTotal: support=" + post.reactions.support + " relate=" + post.reactions.relate + " love=" + post.reactions.love + " hug=" + post.reactions.hug));
    }
    return { handled: true };
  }

  if (sub === "reply" || sub === "balas") {
    const id = parseInt(args[2] || "0", 10);
    const text = args.slice(3).join(" ").trim();
    const post = cfg.posts.find(p => p.id === id);
    if (!post) {
      await m.reply(claraWrap("Confess Wall", "Post tidak ditemukan."));
      return { handled: true };
    }
    if (!text) {
      await m.reply(claraWrap("Confess Wall", "Format: " + prefix + "confesswall reply " + id + " <balasan>"));
      return { handled: true };
    }
    post.replies.push({ user: m.sender, text, ts: Date.now(), anonymous: true });
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Confess Wall #" + id, "Reply baru (" + post.replies.length + " total):\n" + text));
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar" || sub === "wall" || !sub) {
    const recent = cfg.posts.slice(-5).reverse();
    if (recent.length === 0) {
      await m.reply(claraWrap("Confess Wall", "Wall kosong.\n" + prefix + "confesswall post <confess> untuk mulai."));
      return { handled: true };
    }
    const list = recent.map(p => {
      const date = new Date(p.createdAt).toLocaleDateString("id-ID");
      const reacts = (p.reactions.support || 0) + (p.reactions.relate || 0) + (p.reactions.love || 0) + (p.reactions.hug || 0);
      return "#" + p.id + " (" + date + ") - " + p.text.slice(0, 80) + (p.text.length > 80 ? "..." : "") + "\n   " + reacts + " react, " + p.replies.length + " reply";
    }).join("\n\n");
    await m.reply(claraWrap("Confess Wall", "Post terakhir:\n\n" + list));
    return { handled: true };
  }

  if (sub === "read" || sub === "baca") {
    const id = parseInt(args[2] || "0", 10);
    const post = cfg.posts.find(p => p.id === id);
    if (!post) {
      await m.reply(claraWrap("Confess Wall", "Post tidak ditemukan."));
      return { handled: true };
    }
    const date = new Date(p.createdAt).toLocaleDateString("id-ID");
    const replies = post.replies.map((r, i) => (i + 1) + ". " + r.text).join("\n") || "(tidak ada)";
    await m.reply(claraWrap("Confess Wall #" + id, [
      "Tanggal: " + date,
      "",
      p.text,
      "",
      "Reacts: support=" + (p.reactions.support || 0) + " relate=" + (p.reactions.relate || 0) + " love=" + (p.reactions.love || 0) + " hug=" + (p.reactions.hug || 0),
      "",
      "Replies (" + post.replies.length + "):",
      replies,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stats" || sub === "statistik") {
    const totalReacts = cfg.posts.reduce((s, p) => s + (p.reactions.support || 0) + (p.reactions.relate || 0) + (p.reactions.love || 0) + (p.reactions.hug || 0), 0);
    const totalReplies = cfg.posts.reduce((s, p) => s + p.replies.length, 0);
    await m.reply(claraWrap("Confess Wall", [
      "Total posts: " + cfg.posts.length,
      "Total reacts: " + totalReacts,
      "Total replies: " + totalReplies,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "del" || sub === "hapus") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Confess Wall", "Khusus owner."));
      return { handled: true };
    }
    const id = parseInt(args[2] || "0", 10);
    const idx = cfg.posts.findIndex(p => p.id === id);
    if (idx === -1) {
      await m.reply(claraWrap("Confess Wall", "Post tidak ditemukan."));
      return { handled: true };
    }
    cfg.posts.splice(idx, 1);
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Confess Wall", "Post #" + id + " dihapus."));
    return { handled: true };
  }

  await m.reply(claraWrap("Confess Wall", [
    "CONFESSION WALL",
    "",
    prefix + "confesswall post <confess> - post anonim",
    prefix + "confesswall list - lihat wall",
    prefix + "confesswall read <id> - baca post + reply",
    prefix + "confesswall react <id> <type> - react",
    prefix + "confesswall reply <id> <teks> - balas",
    prefix + "confesswall stats - statistik",
    prefix + "confesswall reveal <id> (owner) - reveal author",
    prefix + "confesswall del <id> (owner) - hapus post",
    "",
    "React type: support, relate, love, hug",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
