// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "blinddate",
  alias: ["blinddate", "kacabut", "blinddategrup"],
  category: "future",
  description: "Blind date matching - match anonim, reveal setelah chat",
  usage: ".blinddate <command>",
  example: ".blinddate join",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("blinddate") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("blinddate") || {};
  all[gid] = data;
  db.setting("blinddate", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("blinddate") || {};
  delete all[gid];
  db.setting("blinddate", all);
  db.save();
}

const ICEBREAKERS = [
  "Coba sebutin 3 hal yang bikin kamu senyum hari ini",
  "Kalo bisa jadi karakter film, kamu mau jadi siapa?",
  "Apa hal paling random yang kamu suka?",
  "Kopi atau teh? Kenapa?",
  "Kalo dikasih libur 1 minggu, kamu mau ngapain?",
  "Mimpi paling gila yang pernah kamu mimpiin?",
  "Lagu yang lagi stuck di kepala kamu sekarang?",
  "Kalo punya superpower, mau apa?",
];

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "join" || sub === "daftar") {
    if (!game || game.status !== "open") {
      // Create new session
      const data = {
        status: "open",
        participants: [],
        matches: [],
        revealed: [],
        startedAt: Date.now(),
        phase: "join",
      };
      saveConfig(db, gid, data);
      if (data.participants.includes(m.sender)) {
        await m.reply(claraWrap("Blind Date", "Kamu sudah join!"));
        return { handled: true };
      }
      data.participants.push(m.sender);
      saveConfig(db, gid, data);
      await m.reply(claraWrap("Blind Date", [
        "Kamu masuk waiting list!",
        "Peserta: " + data.participants.length,
        "",
        "Min 4 orang untuk mulai match.",
        prefix + "blinddate start (admin) - mulai matching",
        prefix + "blinddate leave - keluar",
      ].join("\n")));
      return { handled: true };
    }
    if (game.participants.includes(m.sender)) {
      await m.reply(claraWrap("Blind Date", "Kamu sudah join!"));
      return { handled: true };
    }
    if (game.phase !== "join") {
      await m.reply(claraWrap("Blind Date", "Sesi sudah dimulai. Tunggu sesi berikutnya."));
      return { handled: true };
    }
    game.participants.push(m.sender);
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Blind Date", "Kamu masuk waiting list!\nPeserta: " + game.participants.length + "\n\n" + prefix + "blinddate start (admin) untuk mulai"));
    return { handled: true };
  }

  if (sub === "leave" || sub === "keluar") {
    if (!game || game.phase !== "join") {
      await m.reply(claraWrap("Blind Date", "Belum ada sesi join."));
      return { handled: true };
    }
    game.participants = game.participants.filter(j => j !== m.sender);
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Blind Date", "Keluar dari waiting list. Sisa: " + game.participants.length));
    return { handled: true };
  }

  if (sub === "start" || sub === "mulai") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Blind Date", "Khusus admin/owner."));
      return { handled: true };
    }
    if (!game || game.participants.length < 4) {
      await m.reply(claraWrap("Blind Date", "Min 4 peserta untuk mulai. Sekarang: " + (game?.participants.length || 0)));
      return { handled: true };
    }
    // Shuffle and pair
    const shuffled = [...game.participants].sort(() => Math.random() - 0.5);
    const matches = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({ a: shuffled[i], b: shuffled[i + 1], icebreaker: ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)] });
    }
    if (shuffled.length % 2 === 1) {
      // Odd one out - pair with a random person
      const solo = shuffled[shuffled.length - 1];
      const partner = shuffled[Math.floor(Math.random() * (shuffled.length - 1))];
      matches.push({ a: solo, b: partner, icebreaker: ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)] });
    }
    game.matches = matches;
    game.phase = "matched";
    saveConfig(db, gid, game);

    // DM each participant their match
    for (const match of matches) {
      const msgA = claraWrap("Blind Date Match", [
        "Kamu sudah di-match!",
        "Icebreaker: " + match.icebreaker,
        "",
        "Chat pasangan kamu secara anonim lewat grup,",
        "jangan sebut nama kamu dulu!",
        "",
        "Reveal: " + prefix + "blinddate reveal",
        "Hint: pasangan kamu juga dapat icebreaker yang sama.",
      ].join("\n"));
      try { await sock.sendMessage(match.a, { text: msgA }); } catch (e) { console.error('[blinddate.js]:', e.message); }
      if (match.a !== match.b) {
        try { await sock.sendMessage(match.b, { text: msgA }); } catch (e) { console.error('[blinddate.js]:', e.message); }
      }
    }

    await m.reply(claraWrap("Blind Date", [
      "MATCHING SELESAI!",
      "Peserta: " + game.participants.length,
      "Pasangan: " + matches.length,
      "",
      "Cek DM kamu buat icebreaker!",
      "Chat anonim di grup, jangan sebut nama dulu.",
      "",
      "Reveal: " + prefix + "blinddate reveal",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "reveal" || sub === "bukaidentitas") {
    if (!game || game.phase !== "matched") {
      await m.reply(claraWrap("Blind Date", "Belum ada match. Ketik " + prefix + "blinddate join dulu."));
      return { handled: true };
    }
    if (game.revealed.includes(m.sender)) {
      await m.reply(claraWrap("Blind Date", "Kamu sudah reveal!"));
      return { handled: true };
    }
    const match = game.matches.find(mm => mm.a === m.sender || mm.b === m.sender);
    if (!match) {
      await m.reply(claraWrap("Blind Date", "Kamu tidak ada di match mana pun."));
      return { handled: true };
    }
    const partner = match.a === m.sender ? match.b : match.a;
    game.revealed.push(m.sender);
    saveConfig(db, gid, game);

    const allRevealed = game.matches.every(mm => game.revealed.includes(mm.a) && game.revealed.includes(mm.b));
    if (allRevealed) {
      game.phase = "completed";
      game.status = "completed";
      saveConfig(db, gid, game);
    }

    await m.reply(claraWrap("Blind Date Reveal", [
      "Identitas pasangan kamu:",
      "@" + partner.split("@")[0],
      "",
      "Sekarang kamu bisa chat langsung!",
    ].join("\n")), { mentions: [partner] });
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(claraWrap("Blind Date", "Belum ada sesi.\n" + prefix + "blinddate join untuk mulai."));
      return { handled: true };
    }
    const isJoined = game.participants.includes(m.sender);
    const hasMatch = game.matches.find(mm => mm.a === m.sender || mm.b === m.sender);
    const hasRevealed = game.revealed.includes(m.sender);
    await m.reply(claraWrap("Blind Date", [
      "Status: " + game.phase,
      "Peserta: " + game.participants.length,
      "Pasangan: " + game.matches.length,
      "Revealed: " + game.revealed.length + "/" + (game.matches.length * 2),
      "",
      isJoined ? "Kamu: JOINED" : "Kamu: belum join",
      hasMatch ? "Match: ADA" : "Match: belum",
      hasRevealed ? "Reveal: SUDAH" : "Reveal: belum",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Blind Date", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(claraWrap("Blind Date", "Sesi dibatalkan."));
    return { handled: true };
  }

  await m.reply(claraWrap("Blind Date", [
    "BLIND DATE MATCHING",
    "",
    prefix + "blinddate join - daftar peserta",
    prefix + "blinddate leave - keluar waiting list",
    prefix + "blinddate start (admin) - mulai matching",
    prefix + "blinddate reveal - reveal pasangan",
    prefix + "blinddate status - cek sesi",
    prefix + "blinddate stop (admin) - batalkan",
    "",
    "Match anonim, chat dulu, reveal kalau udah nyaman!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
