// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rateuser",
  alias: ["rateanggota", "ratingmember", "nilaimember"],
  category: "group",
  description: "Rate member grup — kasih bintang + review jujur (drama maksimal)",
  usage: ".rateuser @user <bintang> <komentar>",
  example: ".rateuser @Budi 5 Boss gede",
  isGroupOnly: true,
};

const STARS = ["☆☆☆☆☆", "★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"];

const FUNNY_COMMENTS = [
  "Pernah ghosting 3 hari.",
  "Typo terbanyak di grup ini.",
  "Reply paling lambat se-Indonesia.",
  "Pernah kirim screenshot ke orang salah.",
  "Selalu online tapi gak pernah reply.",
  "Stiker spammer sejati.",
  "Komen 'wkwk' di tiap pesan.",
  "Admin paling baikh ternyata galak.",
  "Pernah ngirim voice note 5 menit.",
  "Forward message tanpa baca dulu.",
  "Selalu join tapi gak pernah ngomong.",
  "Pernah left grup tanpa alasan.",
  "Ghosting master kelas internasional.",
  "Pernah salah kirim foto ke grup.",
  "Status: Selalu 'terakhir dilihat' tapi gak reply.",
  "Pernah ketiduran pas meeting online.",
  "Koleksi meme terlengkap di grup.",
  "Pernah bilang 'beli dulu' tapi gak jadi.",
  "Juara scroll TikTok sampai pagi.",
  "Pernah unfollow anggota grup.",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;

    if (!db.data.rateUser) db.data.rateUser = {};
    if (!db.data.rateUser[groupId]) {
      db.data.rateUser[groupId] = { ratings: {} };
      await db.save();
    }
    const groupData = db.data.rateUser[groupId];

    // LEADERBOARD
    const sub = (args[0] || "").toLowerCase();
    if (sub === "leaderboard" || sub === "top") {
      const ratings = groupData.ratings;
      const users = Object.entries(ratings).map(([user, data]) => {
        const avg = data.total / data.count;
        return { user, avg, count: data.count, comments: data.comments };
      }).sort((a, b) => b.avg - a.avg);

      if (users.length === 0) {
        return m.reply(claraWrap("Rate User", "Belum ada rating. Ketik .rateuser @user <bintang> <komentar>"));
      }

      let result = "Leaderboard Rating Member:\n\n";
      users.slice(0, 10).forEach((u, i) => {
        const stars = STARS[Math.round(u.avg)] || STARS[0];
        result += (i + 1) + ". @" + u.user.split("@")[0] + "\n";
        result += "   " + stars + " (" + u.avg.toFixed(1) + "/5) — " + u.count + " review\n\n";
      });

      return m.reply(claraWrap("Rate User", result));
    }

    // PROFILE
    if (sub === "profile" || sub === "cek") {
      const target = m.mentionedJid?.[0] || (args[1] ? args[1].replace("@", "") + "@s.whatsapp.net" : sender);
      const data = groupData.ratings[target];

      if (!data) {
        return m.reply(claraWrap("Rate User", "Belum ada rating untuk @" + target.split("@")[0] + ".\nKetik .rateuser @" + target.split("@")[0].replace("@s.whatsapp.net", "") + " <bintang> <komentar>"));
      }

      const avg = data.total / data.count;
      const stars = STARS[Math.round(avg)] || STARS[0];
      let result = "Profil @" + target.split("@")[0] + "\n\n";
      result += "Rating: " + stars + "\n";
      result += "Skor: " + avg.toFixed(1) + "/5 (" + data.count + " review)\n\n";
      result += "Komentar:\n";
      data.comments.slice(-5).forEach((c) => {
        result += "- " + c + "\n";
      });

      return m.reply(claraWrap("Rate User", result));
    }

    // RATE
    const target = m.mentionedJid?.[0];
    if (!target) {
      return m.reply(claraWrap("Rate User", [
        "Rate member grup — kasih bintang + review jujur",
        "",
        "CARA PAKAI:",
        usedPrefix + "rateuser @user <bintang> <komentar>",
        usedPrefix + "rateuser profile @user — Lihat profil rating",
        usedPrefix + "rateuser leaderboard — Top rated member",
        "",
        "CONTOH:",
        usedPrefix + "rateuser @Budi 5 Boss gede",
        usedPrefix + "rateuser @Siti 3 Jarang online",
      ]));
    }

    if (target === sender) {
      return m.reply(claraWrap("Rate User", "Gak bisa rate diri sendiri!"));
    }

    // Parse bintang (1-5)
    const textAfterMention = text.replace(/@\d+/g, "").trim();
    const parts = textAfterMention.split(" ").filter((p) => p);
    const bintang = parseInt(parts[0]);
    const comment = parts.slice(1).join(" ") || FUNNY_COMMENTS[Math.floor(Math.random() * FUNNY_COMMENTS.length)];

    if (!bintang || bintang < 1 || bintang > 5) {
      return m.reply(claraWrap("Rate User", "Kasih bintang 1-5!\nContoh: .rateuser @Budi 5 Boss gede"));
    }

    if (!groupData.ratings[target]) {
      groupData.ratings[target] = { total: 0, count: 0, comments: [] };
    }

    groupData.ratings[target].total += bintang;
    groupData.ratings[target].count += 1;
    groupData.ratings[target].comments.push(comment);
    await db.save();

    const data = groupData.ratings[target];
    const avg = data.total / data.count;
    const stars = STARS[bintang];

    let result = "@" + sender.split("@")[0] + " memberi rating untuk @" + target.split("@")[0] + "\n\n";
    result += "Rating: " + stars + "\n";
    result += "Komentar: " + comment + "\n";
    result += "Rata-rata: " + avg.toFixed(1) + "/5 (" + data.count + " review)";

    return m.reply(claraWrap("Rate User", result, "success"));
  } catch (e) {
    console.error("[Rate User]", e);
    m.reply(claraWrap("Rate User", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
