// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aibookclub",
  alias: ["bookclub", "bookclub", "baca"],
  category: "future",
  description: "Baca buku bareng di grup - AI book club",
  usage: ".bookclub <command>",
  example: ".bookclub start Atomic Habits",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

function getClub(db, gid) {
  const all = db.setting("aibookclub") || {};
  return all[gid] || null;
}

function saveClub(db, gid, data) {
  const all = db.setting("aibookclub") || {};
  all[gid] = data;
  db.setting("aibookclub", all);
  db.save();
}

function delClub(db, gid) {
  const all = db.setting("aibookclub") || {};
  delete all[gid];
  db.setting("aibookclub", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== START
  if (sub === "start" || sub === "mulai") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Book Club", "Khusus admin/owner."));
      return { handled: true };
    }
    const title = args.slice(2).join(" ").trim();
    if (!title) {
      await m.reply(claraWrap("Book Club", "Format: " + prefix + "bookclub start <judul buku>\nContoh: " + prefix + "bookclub start Atomic Habits"));
      return { handled: true };
    }
    const deadline = parseInt(args[args.length - 1] || "7", 10);
    const data = {
      title,
      startedBy: m.sender,
      startedAt: Date.now(),
      deadlineDays: isNaN(deadline) ? 7 : deadline,
      members: [m.sender],
      discussions: [],
      summaries: {},
      status: "reading",
    };
    saveClub(db, gid, data);
    await m.reply(claraWrap("Book Club", [
      "Buku: " + title,
      "Durasi: " + data.deadlineDays + " hari",
      "Status: Reading",
      "",
      "Ketik " + prefix + "bookclub join untuk ikut",
      "Ketik " + prefix + "bookclub discuss <bab> untuk diskusi",
      "Ketik " + prefix + "bookclub summary <bab> untuk submit ringkasan",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== JOIN
  if (sub === "join" || sub === "ikut") {
    const club = getClub(db, gid);
    if (!club) {
      await m.reply(claraWrap("Book Club", "Belum ada book club. Ketik " + prefix + "bookclub start <judul>."));
      return { handled: true };
    }
    if (club.members.includes(m.sender)) {
      await m.reply(claraWrap("Book Club", "Sudah join."));
      return { handled: true };
    }
    club.members.push(m.sender);
    saveClub(db, gid, club);
    await m.reply(claraWrap("Book Club", "Join " + club.title + "!\nMember: " + club.members.length));
    return { handled: true };
  }

  // ==================== DISCUSS (AI generate questions)
  if (sub === "discuss" || sub === "diskusi") {
    const club = getClub(db, gid);
    if (!club) {
      await m.reply(claraWrap("Book Club", "Belum ada book club."));
      return { handled: true };
    }
    const bab = args.slice(2).join(" ").trim() || "Bab 1";
    await m.react("🕒");
    try {
      const prompt = "Buku: " + club.title + "\nBuat 3 pertanyaan diskusi menarik untuk " + bab + ". Singkat, provoking, dalam bahasa Indonesia. Hanya 3 pertanyaan dengan nomor.";
      const result = await UnlimitedAI(prompt, "nova-ai");
      const questions = result?.success ? result.response : "Gagal generate pertanyaan. Coba lagi.";
      club.discussions.push({ bab, questions, ts: Date.now(), by: m.sender });
      saveClub(db, gid, club);
      await m.react("✅");
      await m.reply(claraWrap("Book Club Discussion", "Buku: " + club.title + "\n" + bab + "\n\n" + questions));
    } catch {
      await m.react("❌");
      await m.reply(claraWrap("Book Club", "Gagal generate pertanyaan diskusi."));
    }
    return { handled: true };
  }

  // ==================== SUMMARY
  if (sub === "summary" || sub === "ringkas") {
    const club = getClub(db, gid);
    if (!club) {
      await m.reply(claraWrap("Book Club", "Belum ada book club."));
      return { handled: true };
    }
    const text = args.slice(2).join(" ").trim();
    if (!text) {
      await m.reply(claraWrap("Book Club", "Format: " + prefix + "bookclub summary <ringkasan bab kamu>"));
      return { handled: true };
    }
    club.summaries[m.sender] = { text, ts: Date.now() };
    saveClub(db, gid, club);
    await m.reply(claraWrap("Book Club", "Ringkasan tersimpan untuk " + club.title + "!\nTotal submit: " + Object.keys(club.summaries).length + "/" + club.members.length));
    return { handled: true };
  }

  // ==================== INFO
  if (sub === "info" || sub === "cek" || !sub) {
    const club = getClub(db, gid);
    if (!club) {
      await m.reply(claraWrap("Book Club", [
        "Belum ada book club aktif.",
        "",
        "Cara pakai:",
        prefix + "bookclub start <judul> [hari]",
        prefix + "bookclub join",
        prefix + "bookclub discuss <bab>",
        prefix + "bookclub summary <ringkasan>",
        prefix + "bookclub info",
        prefix + "bookclub end",
      ].join("\n")));
      return { handled: true };
    }
    const daysLeft = Math.ceil((club.startedAt + club.deadlineDays * 86400000 - Date.now()) / 86400000);
    await m.reply(claraWrap("Book Club Info", [
      "Buku: " + club.title,
      "Member: " + club.members.length,
      "Diskusi: " + club.discussions.length,
      "Summary submit: " + Object.keys(club.summaries).length + "/" + club.members.length,
      "Sisa waktu: " + (daysLeft > 0 ? daysLeft + " hari" : "selesai"),
      "Status: " + club.status,
    ].join("\n")));
    return { handled: true };
  }

  // ==================== END
  if (sub === "end" || sub === "selesai") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Book Club", "Khusus admin/owner."));
      return { handled: true };
    }
    delClub(db, gid);
    await m.reply(claraWrap("Book Club", "Book club diakhiri."));
    return { handled: true };
  }

  await m.reply(claraWrap("Book Club", "Ketik " + prefix + "bookclub info."));
  return { handled: true };
}

export { pluginConfig as config, handler };
