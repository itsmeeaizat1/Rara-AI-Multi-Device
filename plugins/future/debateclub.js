// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "debateclub",
  alias: ["debateclub", "debate", "debat"],
  category: "future",
  description: "Debate club - random topic, tim pro vs kontra, voting",
  usage: ".debateclub <command>",
  example: ".debateclub start",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const TOPICS = [
  "AI akan menggantikan semua pekerjaan manusia",
  "Media sosial lebih banyak dampak buruk daripada baik",
  "Sekolah online lebih efektif daripada sekolah offline",
  "Uang bisa membeli kebahagiaan",
  "Lebih baik jadi pengusaha daripada karyawan",
  "Halal bihalal lebih penting daripada kembalinya modal",
  "Kecantikan lebih penting daripada kecerdasan",
  "Bekerja dari rumah lebih produktif",
  "Pria dan wanita setara dalam segala hal",
  "Lebih baik punya sedikit teman tapi berkualitas",
  "TikTok lebih berbahaya daripada game online",
  "Kecerdasan emosional lebih penting daripada IQ",
  "Lebih baik single daripada hubungan toxic",
  "Edukasi gratis bisa menyelesaikan kemiskinan",
  "Lebih baik buta teknologi tapi kaya, atau paham teknologi tapi miskin",
  "Diet lebih efektif daripada olahraga untuk turun berat badan",
  "Sopir ojol lebih terhormat daripada pejabat korupsi",
  "Hutang ke bank lebih buruk daripada hutang ke rentenir",
  "Jagoan demo lebih baik daripada diam seribu bahasa",
  "Lebih baik dicintai tak dikenal, atau dikenal tak dicintai",
];

function getConfig(db, gid) {
  const all = db.setting("debateclub") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("debateclub") || {};
  all[gid] = data;
  db.setting("debateclub", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("debateclub") || {};
  delete all[gid];
  db.setting("debateclub", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.status === "active") {
      await m.reply(claraWrap("Debate Club", "Debat masih aktif. Ketik " + prefix + "debateclub stop."));
      return { handled: true };
    }
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const data = {
      status: "active",
      topic,
      phase: "join",
      pro: [],
      contra: [],
      voters: {},
      arguments: [],
      startedAt: Date.now(),
      voteCount: 0,
    };
    saveConfig(db, gid, data);
    await m.reply(claraWrap("Debate Club", [
      "DEBAT DIMULAI!",
      "",
      "Topik: " + topic,
      "",
      "Pilih tim:",
      prefix + "debateclub pro - tim PRO (setuju)",
      prefix + "debateclub contra - tim KONTRA (tidak setuju)",
      "",
      "Setelah semua join, admin ketik:",
      prefix + "debateclub open - buka sesi argumen",
      "",
      "Min 1 orang per tim!",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "pro" || sub === "setuju") {
    if (!game || game.status !== "active" || game.phase !== "join") {
      await m.reply(claraWrap("Debate Club", "Tidak ada sesi join. Ketik " + prefix + "debateclub start."));
      return { handled: true };
    }
    if (game.contra.includes(m.sender)) {
      await m.reply(claraWrap("Debate Club", "Kamu sudah di tim Kontra! Keluar dulu."));
      return { handled: true };
    }
    if (!game.pro.includes(m.sender)) game.pro.push(m.sender);
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", "Bergabung tim PRO! Member: " + game.pro.length + "\n" + game.pro.map(j => "@" + j.split("@")[0]).join(", ")), { mentions: game.pro });
    return { handled: true };
  }

  if (sub === "contra" || sub === "kontra" || sub === "tidaksetuju") {
    if (!game || game.status !== "active" || game.phase !== "join") {
      await m.reply(claraWrap("Debate Club", "Tidak ada sesi join. Ketik " + prefix + "debateclub start."));
      return { handled: true };
    }
    if (game.pro.includes(m.sender)) {
      await m.reply(claraWrap("Debate Club", "Kamu sudah di tim Pro! Keluar dulu."));
      return { handled: true };
    }
    if (!game.contra.includes(m.sender)) game.contra.push(m.sender);
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", "Bergabung tim KONTRA! Member: " + game.contra.length + "\n" + game.contra.map(j => "@" + j.split("@")[0]).join(", ")), { mentions: game.contra });
    return { handled: true };
  }

  if (sub === "open" || sub === "buka") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Debate Club", "Belum ada debat."));
      return { handled: true };
    }
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Debate Club", "Khusus admin/owner."));
      return { handled: true };
    }
    if (game.pro.length === 0 || game.contra.length === 0) {
      await m.reply(claraWrap("Debate Club", "Tim belum lengkap! Min 1 per tim.\nPro: " + game.pro.length + " | Kontra: " + game.contra.length));
      return { handled: true };
    }
    game.phase = "argue";
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", [
      "SESI ARGUMEN DIBUKA!",
      "",
      "Topik: " + game.topic,
      "",
      "Tim PRO: " + game.pro.map(j => "@" + j.split("@")[0]).join(", "),
      "Tim KONTRA: " + game.contra.map(j => "@" + j.split("@")[0]).join(", "),
      "",
      "Argumen: " + prefix + "debateclub argue <argumen kamu>",
      "Selesai & voting: " + prefix + "debateclub vote",
    ].join("\n")), { mentions: [...game.pro, ...game.contra] });
    return { handled: true };
  }

  if (sub === "argue" || sub === "argumen") {
    if (!game || game.status !== "active" || game.phase !== "argue") {
      await m.reply(claraWrap("Debate Club", "Sesi argumen belum dibuka."));
      return { handled: true };
    }
    const text = args.slice(2).join(" ").trim();
    if (!text) {
      await m.reply(claraWrap("Debate Club", "Ketik argumen: " + prefix + "debateclub argue <argumen>"));
      return { handled: true };
    }
    const team = game.pro.includes(m.sender) ? "PRO" : game.contra.includes(m.sender) ? "KONTRA" : null;
    if (!team) {
      await m.reply(claraWrap("Debate Club", "Kamu tidak tergabung tim mana pun."));
      return { handled: true };
    }
    game.arguments.push({ user: m.sender, team, text, ts: Date.now() });
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", "[" + team + "] @" + m.sender.split("@")[0] + ":\n" + text + "\n\nTotal argumen: " + game.arguments.length), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "vote" || sub === "voting") {
    if (!game || game.status !== "active" || game.phase !== "argue") {
      await m.reply(claraWrap("Debate Club", "Belum bisa voting."));
      return { handled: true };
    }
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Debate Club", "Khusus admin/owner buka voting."));
      return { handled: true };
    }
    if (game.arguments.length === 0) {
      await m.reply(claraWrap("Debate Club", "Belum ada argumen! Tunggu tim berdebat dulu."));
      return { handled: true };
    }
    game.phase = "vote";
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", [
      "VOTING DIBUKA!",
      "",
      "Topik: " + game.topic,
      "",
      "Tim PRO: " + game.pro.length + " member, " + game.arguments.filter(a => a.team === "PRO").length + " argumen",
      "Tim KONTRA: " + game.contra.length + " member, " + game.arguments.filter(a => a.team === "KONTRA").length + " argumen",
      "",
      "Vote: " + prefix + "debateclub pilih pro",
      "Vote: " + prefix + "debateclub pilih kontra",
      "",
      "Tidak bisa vote kalau kamu anggota tim!",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "pilih" || sub === "votepro" || sub === "votekontra") {
    if (!game || game.status !== "active" || game.phase !== "vote") {
      await m.reply(claraWrap("Debate Club", "Voting belum dibuka."));
      return { handled: true };
    }
    if (game.pro.includes(m.sender) || game.contra.includes(m.sender)) {
      await m.reply(claraWrap("Debate Club", "Anggota tim tidak bisa vote!"));
      return { handled: true };
    }
    if (game.voters[m.sender]) {
      await m.reply(claraWrap("Debate Club", "Kamu sudah vote!"));
      return { handled: true };
    }
    const choice = (args[2] || sub).toLowerCase();
    const vote = (choice === "pro" || sub === "votepro") ? "pro" : (choice === "kontra" || sub === "votekontra") ? "contra" : null;
    if (!vote) {
      await m.reply(claraWrap("Debate Club", "Pilih: " + prefix + "debateclub pilih pro/kontra"));
      return { handled: true };
    }
    game.voters[m.sender] = vote;
    game.voteCount++;
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Debate Club", "Vote " + (vote === "pro" ? "PRO" : "KONTRA") + " tercatat!\nTotal votes: " + game.voteCount));
    return { handled: true };
  }

  if (sub === "result" || sub === "hasil") {
    if (!game || game.status !== "active" || game.phase !== "vote") {
      await m.reply(claraWrap("Debate Club", "Voting belum dimulai."));
      return { handled: true };
    }
    const proVotes = Object.values(game.voters).filter(v => v === "pro").length;
    const contraVotes = Object.values(game.voters).filter(v => v === "contra").length;
    const winner = proVotes > contraVotes ? "PRO" : contraVotes > proVotes ? "KONTRA" : "SERI";
    game.status = "completed";
    saveConfig(db, gid, game);
    const proMembers = game.pro.map(j => "@" + j.split("@")[0]).join(", ");
    const contraMembers = game.contra.map(j => "@" + j.split("@")[0]).join(", ");
    await m.reply(claraWrap("Debate Club - HASIL", [
      "Topik: " + game.topic,
      "",
      "Tim PRO (" + proVotes + " votes):",
      proMembers,
      "",
      "Tim KONTRA (" + contraVotes + " votes):",
      contraMembers,
      "",
      "Total argumen: " + game.arguments.length,
      "",
      winner === "SERI" ? "HASIL: SERI!" : "PEMENANG: TIM " + winner + "!",
    ].join("\n")), { mentions: [...game.pro, ...game.contra] });
    delConfig(db, gid);
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Debate Club", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(claraWrap("Debate Club", "Debat dibatalkan."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(claraWrap("Debate Club", "Belum ada debat.\n" + prefix + "debateclub start untuk mulai."));
      return { handled: true };
    }
    await m.reply(claraWrap("Debate Club", [
      "Topik: " + game.topic,
      "Phase: " + game.phase,
      "Pro: " + game.pro.length + " | Kontra: " + game.contra.length,
      "Argumen: " + game.arguments.length,
      "Votes: " + game.voteCount,
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Debate Club", [
    "DEBATE CLUB",
    "",
    prefix + "debateclub start - mulai debat (random topic)",
    prefix + "debateclub pro - join tim pro",
    prefix + "debateclub contra - join tim kontra",
    prefix + "debateclub open (admin) - buka sesi argumen",
    prefix + "debateclub argue <teks> - kirim argumen",
    prefix + "debateclub vote (admin) - buka voting",
    prefix + "debateclub pilih pro/kontra - vote",
    prefix + "debateclub result - lihat hasil",
    prefix + "debateclub stop (admin) - batalkan",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
