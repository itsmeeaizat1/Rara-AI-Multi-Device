// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-guildwar.js — GUILD WAR ANTAR GRUP (26 Sep 2026, ide owner no.5 dari
// sesi "fitur masa depan": RPG Rara naik level dari per-orang jadi SOSIAL —
// tiap grup WhatsApp = satu guild, bisa perang lintas grup).
//
// Konsep: 1 grup = 1 guild (nama unik global + lambang emoji). Kekuatan
// guild = agregat stat RPG anggota yang udah ada (level/atk/def) — gak ada
// ekonomi baru, nyambung ke RPG utama. Perang: taruhan 300 gold dari
// treasury masing-masing → window 10 menit, anggota nyerang via .guild attack
// (energi 2 + cooldown 20 dtk, damage dari stat RPG). Skor tertinggi menang:
// pot masuk treasury pemenang + poin guild; MVP dapet bonus personal.
// Papan peringkat GLOBAL lintas semua grup: .guild top.
//
// State: db.data.guildwar { guilds:{groupJid→guild}, wars:{id→war}, seq }.
// Engine murni (semua fungsi dites e2e); plugin cuma nyambungin RPG + sock.

import { getDatabase } from "./rara-database.js";

export const WAR_STAKE = 300;       // taruhan per guild (gold → pot)
export const WAR_WINDOW_MS = 10 * 60 * 1000; // durasi perang
export const ATTACK_COOLDOWN_MS = 20 * 1000;  // jeda serangan per pemain
export const ATTACK_ENERGY = 2;
export const MVP_GOLD = 150;
export const MIN_JOIN_LEVEL = 3;

// ─── STATE ───
export function ensureGuildWarState(db) {
  if (!db.data.guildwar || typeof db.data.guildwar !== "object") db.data.guildwar = {};
  const st = db.data.guildwar;
  if (!st.guilds || typeof st.guilds !== "object") st.guilds = {};
  if (!st.wars || typeof st.wars !== "object") st.wars = {};
  if (!Number.isFinite(st.seq)) st.seq = 0;
  if (!Number.isFinite(st.warseq)) st.warseq = 0;
  return st;
}

// ─── VALIDASI NAMA ───
export function validName(name) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  if (n.length < 3 || n.length > 20) return null;
  if (!/^[A-Za-z0-9 ]+$/.test(n)) return null; // huruf/angka/spasi doang biar gak jadi iklan
  return n;
}

// ─── CRUD GUILD ───
export function createGuild(st, { group, name, emoji, sender, now = Date.now() }) {
  if (!group || !sender) return { ok: false, msg: " Konteks grup gak valid." };
  if (st.guilds[group]) return { ok: false, msg: " Grup ini udah punya guild: " + st.guilds[group].name + ".\nBubar dulu kalo mau ganti (.guild bubar owner-only)." };
  const n = validName(name);
  if (!n) return { ok: false, msg: " Nama guild 3-20 karakter, huruf/angka/spasi doang. Contoh: .guild create Naga Hitam | \u{1F409}" };
  const lower = n.toLowerCase();
  for (const g of Object.values(st.guilds)) {
    if (g.name.toLowerCase() === lower) return { ok: false, msg: " Nama \"" + n + "\" udah diambil guild " + g.name + " (grup lain). Pilih nama lain." };
  }
  st.seq += 1;
  const guild = {
    id: "G" + st.seq, name: n, emoji: (String(emoji || "") || "").slice(0, 4) || "\u{1F6E1}\uFE0F",
    group, owner: sender, members: [sender],
    treasury: 0, wins: 0, losses: 0, points: 0, createdAt: now,
  };
  st.guilds[group] = guild;
  return { ok: true, msg: " Guild " + n + " " + guild.emoji + " resmi berdiri! Ketua: @" + sender.split("@")[0] + "\nAjak warga: .guild join", guild };
}

export function getGuild(st, group) { return st.guilds[group] || null; }

export function findGuildByName(st, name) {
  const q = String(name || "").trim().toLowerCase();
  return Object.values(st.guilds).find((g) => g.name.toLowerCase() === q) || null;
}

export function joinGuild(st, { group, sender, now = Date.now() }) {
  const g = st.guilds[group];
  if (!g) return { ok: false, msg: " Grup ini belum punya guild. Bikin dulu: .guild create <nama>" };
  if (g.members.includes(sender)) return { ok: false, msg: " Kamu udah jadi anggota " + g.name + "." };
  if (g.members.length >= 40) return { ok: false, msg: " Guild " + g.name + " udah penuh (maks 40 anggota)." };
  g.members.push(sender);
  return { ok: true, msg: " Selamat datang di guild " + g.name + " " + g.emoji + "! Total anggota: " + g.members.length, guild: g };
}

export function leaveGuild(st, { group, sender }) {
  const g = st.guilds[group];
  if (!g) return { ok: false, msg: " Grup ini belum punya guild." };
  if (!g.members.includes(sender)) return { ok: false, msg: " Kamu bukan anggota " + g.name + "." };
  if (g.members.length <= 1) return { ok: false, msg: " Kamu satu-satunya anggota — bubarin guild aja: .guild bubar (ketua)." };
  g.members = g.members.filter((s) => s !== sender);
  return { ok: true, msg: " Kamu keluar dari " + g.name + ". Tetep semangat di grup!" };
}

export function disbandGuild(st, { group, sender }) {
  const g = st.guilds[group];
  if (!g) return { ok: false, msg: " Grup ini belum punya guild." };
  if (g.owner !== sender) return { ok: false, msg: " Cuma ketua guild yang bisa bubarin." };
  const live = findLiveWarByGid(st, g.id);
  if (live) return { ok: false, msg: " Guild lagi perang (" + live.id + ") — selesaikan dulu." };
  delete st.guilds[group];
  return { ok: true, msg: " Guild " + g.name + " dibubarkan. Treasury " + g.treasury + " gold hangus." };
}

export function donateTreasury(st, { group, amount }) {
  const g = st.guilds[group];
  if (!g) return { ok: false, msg: " Grup ini belum punya guild." };
  const n = Math.floor(Number(amount) || 0);
  if (n < 1) return { ok: false, msg: " Jumlah donasi minimal 1 gold." };
  g.treasury += n;
  return { ok: true, msg: n, guild: g };
}

// ─── KEKUATAN (dari stat RPG anggota) ───
export function memberPower(rpg) {
  const r = rpg || {};
  return (Number(r.level) || 1) * 2 + (Number(r.atk) || 0) + (Number(r.def) || 0);
}

export function getGuildPower(st, db, guild) {
  let p = 0;
  for (const s of guild.members || []) {
    p += memberPower(db.getUser(s)?.rpg);
  }
  return p;
}

// ─── PERANG ───
function findLiveWarByGid(st, gid) {
  return Object.values(st.wars).find((w) => w.status === "live" && (w.atk.gid === gid || w.def.gid === gid)) || null;
}

export function startWar(st, { guildA, guildB, stake = WAR_STAKE, now = Date.now(), warMs = WAR_WINDOW_MS }) {
  if (!guildA || !guildB) return { ok: false, msg: " Guild gak ketemu." };
  if (guildA.id === guildB.id) return { ok: false, msg: " Gak bisa perang sama sendiri." };
  if (guildA.group === guildB.group) return { ok: false, msg: " Guild lawan di grup yang sama?" };
  for (const g of [guildA, guildB]) {
    const live = findLiveWarByGid(st, g.id);
    if (live) return { ok: false, msg: " Guild " + g.name + " lagi perang (" + live.id + "). Tunggu selesai." };
  }
  for (const g of [guildA, guildB]) {
    if (Number(g.treasury) < stake) return { ok: false, msg: " Treasury " + g.name + " kurang dari " + stake + " gold (sekarang " + g.treasury + "). Donasi dulu: .guild donate <jumlah>" };
  }
  guildA.treasury -= stake;
  guildB.treasury -= stake;
  st.warseq += 1; // counter terpisah dari guild biar ID perang rapi (GW-1, GW-2…)
  const war = {
    id: "GW-" + st.warseq, stake, pot: stake * 2,
    startAt: now, endAt: now + warMs,
    atk: { gid: guildA.id, name: guildA.name, emoji: guildA.emoji, group: guildA.group },
    def: { gid: guildB.id, name: guildB.name, emoji: guildB.emoji, group: guildB.group },
    atkScore: 0, defScore: 0,
    attackers: {},
    status: "live", result: null,
  };
  st.wars[war.id] = war;
  return { ok: true, msg: war.id, war };
}

export function guildSide(war, gid) {
  if (war.atk.gid === gid) return "atk";
  if (war.def.gid === gid) return "def";
  return null;
}

export function warAttack(st, war, { side, sender, dmg, now = Date.now(), cdMs = ATTACK_COOLDOWN_MS }) {
  if (!war || war.status !== "live") return { ok: false, msg: " Gak ada perang aktif." };
  if (now >= war.endAt) return { ok: false, msg: " Waktu perang udah habis." };
  if (side !== "atk" && side !== "def") return { ok: false, msg: " Guild kamu gak ikut perang ini." };
  const rec = war.attackers[sender] || { score: 0, hits: 0, lastAt: 0 };
  // falsy trap: lastAt 0 = belum pernah nyerang → BUKAN cooldown
  if (rec.lastAt > 0 && now - rec.lastAt < cdMs) return { ok: false, msg: " Tarikan napas dulu — serangan berikutnya " + Math.ceil((rec.lastAt + cdMs - now) / 1000) + " detik lagi." };
  const d = Math.max(1, Math.floor(Number(dmg) || 0));
  rec.score += d; rec.hits += 1; rec.lastAt = now;
  war.attackers[sender] = rec;
  if (side === "atk") war.atkScore += d; else war.defScore += d;
  return { ok: true, msg: d, dmg: d, rec };
}

export function finishWar(st, war, now = Date.now()) {
  if (!war || war.status === "done") return war?.result || null;
  war.status = "done";
  war.endedAt = now;
  const winner = war.atkScore > war.defScore ? "atk" : war.defScore > war.atkScore ? "def" : "tie";
  let mvp = null, mvpScore = 0;
  for (const [s, r] of Object.entries(war.attackers)) {
    if (r.score > mvpScore) { mvp = s; mvpScore = r.score; }
  }
  war.result = { winner, mvp, mvpScore };
  return war.result;
}

// hadiah guild: poin + treasury (personal MVP/exp di plugin via rpg-service)
export function applyWarOutcome(st, war) {
  const { winner, mvp } = war.result || {};
  const A = Object.values(st.guilds).find((g) => g.id === war.atk.gid);
  const B = Object.values(st.guilds).find((g) => g.id === war.def.gid);
  if (A && B) {
    if (winner === "atk") { A.wins += 1; B.losses += 1; A.treasury += war.pot; A.points += 100; B.points += 20; }
    else if (winner === "def") { B.wins += 1; A.losses += 1; B.treasury += war.pot; B.points += 100; A.points += 20; }
    else { A.treasury += war.stake; B.treasury += war.stake; A.points += 40; B.points += 40; }
    if (mvp) {
      const mvGuild = [A, B].find((g) => g.members.includes(mvp));
      if (mvGuild) mvGuild.points += 50;
    }
  }
  return war.result;
}

// deteksi perang yang baru selesai (dipanggil di tiap command guild)
export function sweepWars(st, now = Date.now()) {
  const ended = [];
  for (const war of Object.values(st.wars)) {
    if (war.status === "live" && now >= war.endAt) {
      finishWar(st, war, now);
      applyWarOutcome(st, war);
      ended.push(war);
    }
  }
  return ended;
}

// ─── RANKING GLOBAL (lintas semua grup) ───
export function rankGuilds(st) {
  return Object.values(st.guilds).sort((a, b) => (b.points - a.points) || (b.wins - a.wins) || (b.treasury - a.treasury));
}

export function guildRank(st, guild) {
  return rankGuilds(st).findIndex((g) => g.id === guild.id) + 1;
}

// ─── KARTU (plain text, 🕒 buat countdown/live — standar kartu live) ───
function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function bar(score, total) {
  const MAX = 12;
  const n = total > 0 ? Math.max(1, Math.round((score / total) * MAX)) : 1;
  return "\u2599".repeat(n) + "\u2594".repeat(MAX - n);
}

export function buildWarStartCard(war) {
  return [
    "\u2694\uFE0F GUILD WAR DIMULAI \u2014 " + war.id,
    "",
    war.atk.emoji + " " + war.atk.name + "  vs  " + war.def.name + " " + war.def.emoji,
    "Taruhan: " + war.stake + " gold per guild \u2192 pot " + war.pot + " gold buat treasury pemenang",
    "",
    "\uD83D\uDD52 " + fmtLeft(war.endAt - war.startAt) + " waktu perang! Anggota dua guild, serang:",
    ".guild attack  (\u26A1" + ATTACK_ENERGY + " energi, jeda 20 dtk, damage dari stat RPG kamu)",
    ".guild score  (live skor)",
  ].join("\n");
}

export function buildScoreCard(war, now = Date.now()) {
  const total = Math.max(1, war.atkScore + war.defScore);
  const mvpEntry = Object.entries(war.attackers).sort((a, b) => b[1].score - a[1].score)[0];
  const mvpLine = mvpEntry ? "MVP sementara: @" + mvpEntry[0].split("@")[0] + " (" + mvpEntry[1].score + " poin)" : "Belum ada serangan \u2014 jadi yang pertama!";
  return [
    "\u2694\uFE0F SKOR " + war.id + "  (\uD83D\uDD52 sisa " + fmtLeft(war.endAt - now) + ")",
    "",
    war.atk.emoji + " " + war.atk.name + ": " + war.atkScore + "  " + bar(war.atkScore, total),
    war.def.emoji + " " + war.def.name + ": " + war.defScore + "  " + bar(war.defScore, total),
    "",
    mvpLine,
  ].join("\n");
}

export function buildResultCard(war) {
  const r = war.result || {};
  const nameOf = (side) => war[side].emoji + " " + war[side].name;
  let head;
  if (r.winner === "tie") head = "\uD83E\uDD1D SERI! Pot dibalikin ke treasury masing-masing";
  else head = "\uD83C\uDFC1 JUARA: " + nameOf(r.winner) + " \u{1F389}";
  const lines = [
    "\uD83C\uDFC1 GUILD WAR SELESAI \u2014 " + war.id,
    "",
    head,
    "Skor akhir: " + war.atk.name + " " + war.atkScore + " vs " + war.defScore + " " + war.def.name,
    r.winner === "tie" ? "Pot " + war.pot + " gold dibagi balik (masing-masing +" + war.stake + ")" : "Pot " + war.pot + " gold \u2192 treasury " + war[r.winner].name,
  ];
  if (r.mvp) lines.push("MVP: @" + r.mvp.split("@")[0] + " (" + r.mvpScore + " poin \u2014 +150 gold personal, +50 poin guild)");
  else lines.push("Gak ada serangan sama sekali \u2014 kubu kedua gak onlen.");
  return lines.join("\n");
}

export function buildGuildCard(guild, { power = 0, rank = 0, now = Date.now() } = {}) {
  return [
    guild.emoji + " GUILD " + guild.name.toUpperCase(),
    "",
    "ID: " + guild.id + " \u00B7 Ketua: @" + (guild.owner || "").split("@")[0],
    "Anggota: " + guild.members.length + " \u00B7 Kekuatan total: " + power,
    "Treasury: " + guild.treasury + " gold",
    "Rekor: " + guild.wins + " menang / " + guild.losses + " kalah \u00B7 Poin: " + guild.points,
    rank ? "Peringkat global: #" + rank : "",
  ].filter(Boolean).join("\n");
}

export function buildTopCard(st, limit = 10) {
  const ranked = rankGuilds(st).slice(0, limit);
  if (!ranked.length) return "Belum ada guild di seluruh bot. Bikin yang pertama: .guild create <nama>";
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const rows = ranked.map((g, i) => (medals[i] || "#" + (i + 1)) + " " + g.emoji + " " + g.name + " \u2014 " + g.points + " poin \u00B7 " + g.wins + "W/" + g.losses + "L \u00B7 " + g.members.length + " anggota");
  return ["\u{1F3C6} PAPAN PERINGKAT GUILD \u2014 SEMUA GRUP", "", ...rows].join("\n");
}
