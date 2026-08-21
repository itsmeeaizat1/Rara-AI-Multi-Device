// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  addExp,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "tournament",
  alias: ["turnamen", "tournamentrpg", "arenatournament"],
  category: "game",
  description: "Turnamen PvP mingguan - bracket sistem dengan hadiah juara",
  usage: ".tournament <join/status/bracket/claim>",
  example: ".tournament join",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ENTRY_FEE = 1000;
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 16;
const PRIZE_POOL = {
  1: 50000,
  2: 25000,
  3: 10000,
};

const TOURNAMENT_KEY = "rpg_tournament";

function getTournament() {
  const db = getDatabase();
  let tour = db.getGlobal?.(TOURNAMENT_KEY);
  if (!tour) {
    tour = {
      participants: [],
      bracket: [],
      round: 0,
      status: "open",
      createdAt: null,
      weekId: null,
    };
  }
  return tour;
}

function saveTournament(tour) {
  const db = getDatabase();
  if (db.setGlobal) {
    db.setGlobal(TOURNAMENT_KEY, tour);
  }
  if (db.save) db.save();
}

function getWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
  return `${year}-W${week}`;
}

function simulateBattle(player1, player2) {
  const p1Power = player1.atk + player1.def + player1.maxHp + (player1.level * 5);
  const p2Power = player2.atk + player2.def + player2.maxHp + (player2.level * 5);
  const total = p1Power + p2Power;
  const roll = Math.random() * total;
  if (roll < p1Power) {
    return { winner: player1, loser: player2 };
  }
  return { winner: player2, loser: player1 };
}

async function handler(m, { sock, config: botConfig, args }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const player = ensurePlayer(m, m.pushName || "Player");
    if (!player) {
      return m.reply(claraWrap("Tournament", "Belum terdaftar di RPG. Ketik .daftarrpg dulu."));
    }

    const subCmd = (args[0] || "status").toLowerCase();
    const tour = getTournament();
    const currentWeek = getWeekId();

    if (tour.weekId !== currentWeek) {
      tour.participants = [];
      tour.bracket = [];
      tour.round = 0;
      tour.status = "open";
      tour.createdAt = new Date().toISOString();
      tour.weekId = currentWeek;
      saveTournament(tour);
    }

    if (subCmd === "join") {
      if (tour.status !== "open") {
        return m.reply(claraWrap("Tournament", "Pendaftaran sudah tutup! Tunggu turnamen minggu depan."));
      }

      const already = tour.participants.find((p) => p.id === m.sender);
      if (already) {
        return m.reply(claraWrap("Tournament", "Kamu sudah terdaftar di turnamen ini!"));
      }

      if (tour.participants.length >= MAX_PLAYERS) {
        return m.reply(claraWrap("Tournament", `Turnamen penuh! Max ${MAX_PLAYERS} peserta.`));
      }

      if (player.gold < ENTRY_FEE) {
        return m.reply(claraWrap("Tournament", `Gold kurang! Entry fee ${ENTRY_FEE.toLocaleString()} gold, kamu punya ${player.gold.toLocaleString()} gold.`));
      }

      player.gold -= ENTRY_FEE;
      savePlayer(m, { gold: player.gold });

      tour.participants.push({
        id: m.sender,
        name: player.name || m.pushName || m.sender.split("@")[0],
        level: player.level,
        atk: player.atk,
        def: player.def,
        maxHp: player.maxHp,
      });

      saveTournament(tour);

      let lines = `  ┊  ➶ *${player.name || m.pushName}* bergabung!\n`;
      lines += `  ┊  ➶ Peserta: ${tour.participants.length}/${MAX_PLAYERS}\n`;
      lines += `  ┊  ➶ Entry fee: ${ENTRY_FEE.toLocaleString()} gold\n\n`;
      if (tour.participants.length >= MIN_PLAYERS) {
        lines += `  ┊  ➶ Turnamen bisa dimulai! Owner ketik ${prefix}tournament start\n`;
      } else {
        lines += `  ┊  ➶ Butuh ${MIN_PLAYERS - tour.participants.length} peserta lagi\n`;
      }
      lines += tipText("Hadiah: 50K gold (Juara 1), 25K (Juara 2), 10K (Juara 3)");
      return m.reply(claraWrap("Tournament Joined", lines));
    }

    if (subCmd === "start") {
      const isOwner = botConfig.owner?.some?.((o) => o === m.sender) || m.sender === botConfig.owner;
      if (!isOwner) {
        return m.reply(claraWrap("Tournament", "Hanya owner yang bisa memulai turnamen!"));
      }
      if (tour.status !== "open") {
        return m.reply(claraWrap("Tournament", "Turnamen sudah dimulai atau selesai!"));
      }
      if (tour.participants.length < MIN_PLAYERS) {
        return m.reply(claraWrap("Tournament", `Minimal ${MIN_PLAYERS} peserta untuk mulai. Sekarang ${tour.participants.length}.`));
      }

      const shuffled = [...tour.participants].sort(() => Math.random() - 0.5);
      tour.bracket = shuffled.map((p, i) => ({
        ...p,
        round: 1,
        alive: true,
        place: 0,
      }));
      tour.round = 1;
      tour.status = "ongoing";
      saveTournament(tour);

      let lines = `  ┊  ➶ Turnamen Mingguan Dimulai!\n`;
      lines += `  ┊  ➶ Minggu: ${currentWeek}\n`;
      lines += `  ┊  ➶ Peserta: ${tour.bracket.length}\n`;
      lines += `  ┊  ➶ Round: 1 (Penyisihan)\n\n`;
      lines += "  ┊  ➶ Bracket:\n";
      for (let i = 0; i < tour.bracket.length; i++) {
        lines += `┊  ${i + 1}. ${tour.bracket[i].name} (Lv.${tour.bracket[i].level})\n`;
      }
      lines += tipText(`Ketik ${prefix}tournament fight buat adu`);
      return m.reply(claraWrap("Tournament Started", lines));
    }

    if (subCmd === "fight") {
      if (tour.status !== "ongoing") {
        return m.reply(claraWrap("Tournament", "Turnamen belum dimulai! Ketik .tournament join dulu."));
      }
      const me = tour.bracket.find((p) => p.id === m.sender && p.alive);
      if (!me) {
        return m.reply(claraWrap("Tournament", "Kamu tidak ikut turnamen atau sudah kalah!"));
      }

      const opponent = tour.bracket.find((p) => p.id !== m.sender && p.alive);
      if (!opponent) {
        tour.status = "finished";
        me.place = 1;
        saveTournament(tour);
        addGold(m, PRIZE_POOL[1]);
        addExp(m, 500);
        return m.reply(claraWrap("Tournament Champion", [
          `  ┊  ➶ *SELAMAT! ${me.name}* JUARA 1!`,
          `  ┊  ➶ Hadiah: ${PRIZE_POOL[1].toLocaleString()} gold + 500 EXP`,
          "  ┊  ➶ Turnamen selesai!",
        ].join("\n")));
      }

      const result = simulateBattle(me, opponent);
      result.loser.alive = false;
      result.loser.place = 0;
      saveTournament(tour);

      const aliveCount = tour.bracket.filter((p) => p.alive).length;

      let lines = `  ┊  ➶ Battle Round ${tour.round}\n`;
      lines += `  ┊  ➶ ${me.name} vs ${opponent.name}\n\n`;
      lines += `  ┊  ➶ Pemenang: *${result.winner.name}*\n`;
      lines += `  ┊  ➶ Kalah: ${result.loser.name}\n`;
      lines += `  ┊  ➶ Sisa peserta: ${aliveCount}\n`;

      if (aliveCount <= 1) {
        const champion = tour.bracket.find((p) => p.alive);
        tour.status = "finished";
        champion.place = 1;
        saveTournament(tour);
        addGold(m, PRIZE_POOL[1]);
        addExp(m, 500);
        lines += `\n  ┊  ➶ *SELAMAT! ${champion.name}* JUARA 1!\n`;
        lines += `  ┊  ➶ Hadiah: ${PRIZE_POOL[1].toLocaleString()} gold + 500 EXP\n`;
      } else if (aliveCount <= 3 && !tour.bracket.find((p) => p.alive && p.id !== m.sender && p.place === 0)) {
        const alive = tour.bracket.filter((p) => p.alive);
        if (alive.length === 3) {
          alive.forEach((p) => { if (p.id !== result.winner.id) { p.place = 3; } });
          saveTournament(tour);
          lines += `\n  ┊  ➶ Semifinal selanjutnya! Sisa ${aliveCount} peserta\n`;
        }
      }
      lines += tipText(`Ketik ${prefix}tournament fight lagi buat round selanjutnya`);
      return m.reply(claraWrap("Tournament Battle", lines));
    }

    if (subCmd === "bracket") {
      if (tour.bracket.length === 0) {
        return m.reply(claraWrap("Tournament", "Bracket belum dibuat. Ketik .tournament join dulu."));
      }
      let lines = `  ┊  ➶ Turnamen Minggu: ${currentWeek}\n`;
      lines += `  ┊  ➶ Status: ${tour.status}\n`;
      lines += `  ┊  ➶ Round: ${tour.round}\n\n`;
      lines += "  ┊  ➶ Peserta:\n";
      for (const p of tour.bracket) {
        const status = p.alive ? "MASIH HIDUP" : "KELUAR";
        lines += `┊  ${p.name} (Lv.${p.level}) - ${status}\n`;
      }
      lines += tipText(`Ketik ${prefix}tournament fight buat bertarung`);
      return m.reply(claraWrap("Tournament Bracket", lines));
    }

    // status (default)
    let lines = `  ┊  ➶ Turnamen RPG Mingguan\n`;
    lines += `  ┊  ➶ Minggu: ${currentWeek}\n`;
    lines += `  ┊  ➶ Status: ${tour.status}\n`;
    lines += `  ┊  ➶ Peserta: ${tour.participants.length}/${MAX_PLAYERS}\n\n`;
    if (tour.status === "open") {
      lines += `  ┊  ➶ Entry fee: ${ENTRY_FEE.toLocaleString()} gold\n`;
      lines += `  ┊  ➶ Hadiah:\n`;
      lines += `┊  Juara 1: ${PRIZE_POOL[1].toLocaleString()} gold\n`;
      lines += `┊  Juara 2: ${PRIZE_POOL[2].toLocaleString()} gold\n`;
      lines += `┊  Juara 3: ${PRIZE_POOL[3].toLocaleString()} gold\n\n`;
      lines += tipText(`Ketik ${prefix}tournament join buat ikut`);
    } else if (tour.status === "ongoing") {
      lines += `  ┊  ➶ Round: ${tour.round}\n`;
      lines += `  ┊  ➶ Sisa: ${tour.bracket.filter((p) => p.alive).length} peserta\n`;
      lines += tipText(`Ketik ${prefix}tournament fight buat bertarung`);
    } else {
      lines += `  ┊  ➶ Turnamen sudah selesai minggu ini\n`;
      lines += tipText("Tunggu turnamen minggu depan");
    }
    return m.reply(claraWrap("Tournament", lines));
  } catch (error) {
    return m.reply(claraWrap("Tournament", `Error: ${error.message}`));
  }
}

export { pluginConfig as config, handler };
