// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-world-event.js — TIME CAPSULE RPG / WORLD EVENT (26 Sep 2026, ide
// owner no.6 dari sesi "fitur masa depan"): peristiwa game yang cuma
// kejadian SEKALI SEJARAH dan gak bisa diulang — komet langka melintas,
// boss dunia, festival abadi. Yang ikut DIABADIKAN: gelar langka PERMANEN
// di profil sejarah mereka. Yang ketinggalan ya ketinggalan selamanya —
// kelangkaan beneran, bukan event loop mingguan yang bisa ditunggu.
//
// Tiap event instance UNIK (WE-1, WE-2, …) — nama pool gak pernah dipakai
// ulang. Riwayat abadi: .worldevent riwayat. Gelar permanen per user:
// .worldevent gelar. Spawn otomatis acak 3-7 hari sekali (knob env
// WORLDEVENT_MIN_DAYS / WORLDEVENT_MAX_DAYS) atau dipicu owner:
// .worldevent spawn <jenis>. Umuman ke semua chat yang subscribe
// (.worldevent on).
//
// State: db.data.worldEvent { seq, warseq? no — seq, events:{id→event},
// active, subscribers:[chat], nextSpawnAt, titles:{sender:[{title,eventId,at}]} }.
// Engine murni (now eksplisit, dites e2e); plugin nyambungin RPG + sock.

import { getDatabase } from "./rara-database.js";
import { kometFrames, bossFrames, festivalFrames, playEventAnim } from "./libanimationrpg/libworldeventrpg.js";

export const KINDS = {
  komet:     { label: "Komet Langka", emoji: "\u2604\uFE0F", windowMs: 30 * 60 * 1000, cmd: ".komet" },
  bossdunia: { label: "Boss Dunia",   emoji: "\u{1F47E}", windowMs: 60 * 60 * 1000, cmd: ".bossdunia" },
  festival:  { label: "Festival",     emoji: "\u{1F38F}", windowMs: 60 * 60 * 1000, cmd: ".festival" },
};

// reward (dipakai plugin via rpg-service)
export const KOMET_GOLD = 2000;
export const KOMET_FIRST10_GOLD = 1000;
export const FEST_GOLD = 500;
export const FEST_EXP = 30;
export const BOSS_TOP_GOLD = [3000, 1500, 500];
export const BOSS_ATTACK_ENERGY = 2;
export const BOSS_ATTACK_CD_MS = 20 * 1000;

// pool nama — sekali dipakai, gak pernah dipakai ulang (time capsule!)
const NAMES = {
  komet: ["Kirana", "Samudra", "Zahra", "Pelangi", "Arjuna"],
  bossdunia: ["Nidhogg Penguasa Palung", "Raja Beku Aldrich", "Siluman Matahari", "Dewa Badai Garuda", "Naga Void"],
  festival: ["Lentera Abadi", "Panen Raya", "Kembang Api Pertama", "Tari Bintang", "Pasar Malam Sejuta Uang"],
};

// ─── STATE ───
export function ensureWorldEventState(db) {
  if (!db.data.worldEvent || typeof db.data.worldEvent !== "object") db.data.worldEvent = {};
  const st = db.data.worldEvent;
  if (!st.events || typeof st.events !== "object") st.events = {};
  if (!st.titles || typeof st.titles !== "object") st.titles = {};
  if (!Array.isArray(st.subscribers)) st.subscribers = [];
  if (!Number.isFinite(st.seq)) st.seq = 0;
  if (typeof st.active !== "string") st.active = "";
  if (!Number.isFinite(st.nextSpawnAt)) st.nextSpawnAt = 0;
  return st;
}

// ─── JADWAL SPAWN OTOMATIS (3-7 hari default, knob env) ───
export function scheduleNextSpawn(st, now = Date.now(), minDays = 3, maxDays = 7) {
  const lo = Math.max(0.02, Number(minDays));
  const hi = Math.max(lo, Number(maxDays));
  const days = lo + Math.random() * (hi - lo);
  st.nextSpawnAt = Math.floor(now + days * 24 * 3600 * 1000);
  return st.nextSpawnAt;
}

export function getActiveEvent(st, now = Date.now()) {
  const id = st.active;
  if (!id || !st.events[id]) return null;
  const ev = st.events[id];
  return ev.status === "live" && now < ev.endAt ? ev : null;
}

// dipanggil scheduler tiap menit — spawn kalau waktunya tiba
export function maybeAutoSpawn(st, now = Date.now()) {
  if (getActiveEvent(st, now)) return { spawned: false };
  if (!st.nextSpawnAt || now < st.nextSpawnAt) return { spawned: false };
  // jenis paling jarang kejadian biar adil
  const counts = {};
  for (const ev of Object.values(st.events)) counts[ev.kind] = (counts[ev.kind] || 0) + 1;
  let kind = "komet", low = Infinity;
  for (const k of Object.keys(KINDS)) { const c = counts[k] || 0; if (c < low) { low = c; kind = k; } }
  const res = spawnEvent(st, { kind, now });
  return res.ok ? { spawned: true, event: res.event } : { spawned: false };
}

// ─── SPAWN (sekali sejarah per instance!) ───
export function spawnEvent(st, { kind, now = Date.now(), windowMs, hp }) {
  if (!KINDS[kind]) return { ok: false, msg: " Jenis gak dikenal: " + kind + " (yang ada: komet · bossdunia · festival)" };
  if (getActiveEvent(st, now)) return { ok: false, msg: " Masih ada event aktif: " + st.events[st.active].name + " (" + KINDS[st.events[st.active].kind].label + ")" };
  st.seq += 1;
  const count = Object.values(st.events).filter((e) => e.kind === kind).length;
  const pool = NAMES[kind];
  const base = pool[count] || KINDS[kind].label + " ke-" + (count + 1);
  const kindDef = KINDS[kind];
  const ev = {
    id: "WE-" + st.seq, kind,
    name: kind === "komet" ? "Komet " + base : kind === "bossdunia" ? base : "Festival " + base,
    emoji: kindDef.emoji,
    startAt: now,
    endAt: now + (Number(windowMs) || kindDef.windowMs),
    joined: [], attackers: {},
    status: "live", result: null,
  };
  if (kind === "bossdunia") {
    ev.hpMax = Number(hp) || 25000 + count * 5000;
    ev.hp = ev.hpMax;
  }
  st.events[ev.id] = ev;
  st.active = ev.id;
  scheduleNextSpawn(st, now); // jadwal berikutnya bergeser
  return { ok: true, msg: ev.id, event: ev };
}

// ─── GELAR PERMANEN (time capsule-nya) ───
export function grantTitle(st, sender, { title, eventId, now = Date.now() }) {
  if (!st.titles[sender]) st.titles[sender] = [];
  if (st.titles[sender].some((t) => t.eventId === eventId)) return false;
  st.titles[sender].push({ title, eventId, at: now });
  return true;
}
export function hasTitle(st, sender, eventId) {
  return (st.titles[sender] || []).some((t) => t.eventId === eventId);
}
export function listTitles(st, sender) {
  return (st.titles[sender] || []).slice().sort((a, b) => a.at - b.at);
}

// ─── PARTISIPASI ───
export function participateKomet(st, ev, { sender, now = Date.now() }) {
  if (!ev || ev.kind !== "komet" || ev.status !== "live") return { ok: false, msg: " Gak ada komet yang lagi melintas." };
  if (now >= ev.endAt) return { ok: false, msg: " Komet udah lewat \u2014 hilang di cakrawala. Antre komet BERIKUTNYA (kapan muncul, cuma langit yang tahu)." };
  if (ev.joined.includes(sender)) return { ok: false, msg: " Kamu udah nangkep komet ini. Sekali seumur hidup cukup \u2014 tinggalkan buat yang lain." };
  ev.joined.push(sender);
  const first10 = ev.joined.length <= 10;
  grantTitle(st, sender, { title: "\u2604\uFE0F Penjaring " + ev.name, eventId: ev.id, now });
  return { ok: true, msg: first10 ? " Kamu penjaring # " + ev.joined.length + " (10 pertama diabadikan spesial!)" : " Komet " + ev.name + " kebangkan tanganmu!", first10, rank: ev.joined.length };
}

export function attackBoss(st, ev, { sender, dmg, now = Date.now(), cdMs = BOSS_ATTACK_CD_MS }) {
  if (!ev || ev.kind !== "bossdunia" || ev.status !== "live") return { ok: false, msg: " Gak ada boss dunia yang bisa diserang." };
  if (now >= ev.endAt) return { ok: false, msg: " Boss udah lepas jendela waktunya." };
  const rec = ev.attackers[sender] || { dmg: 0, hits: 0, lastAt: 0 };
  if (rec.lastAt > 0 && now - rec.lastAt < cdMs) return { ok: false, msg: " Tarikan napas dulu \u2014 " + Math.ceil((rec.lastAt + cdMs - now) / 1000) + " detik lagi." };
  const d = Math.max(1, Math.floor(Number(dmg) || 0));
  rec.dmg += d; rec.hits += 1; rec.lastAt = now;
  ev.attackers[sender] = rec;
  ev.hp = Math.max(0, ev.hp - d);
  const killed = ev.hp <= 0;
  if (killed) finishEvent(st, ev, now);
  else if (!ev.joined.includes(sender)) ev.joined.push(sender); // nyerang = ikut sejarah
  if (!hasTitle(st, sender, ev.id)) grantTitle(st, sender, { title: "\u{1F47E} Pembasmi " + ev.name, eventId: ev.id, now });
  return { ok: true, msg: d, dmg: d, killed, hp: ev.hp };
}

export function joinFestival(st, ev, { sender, now = Date.now() }) {
  if (!ev || ev.kind !== "festival" || ev.status !== "live") return { ok: false, msg: " Gak ada festival yang lagi rame." };
  if (now >= ev.endAt) return { ok: false, msg: " Festival udah tutup \u2014 tenda dilipat, kenangan tinggal foto." };
  if (ev.joined.includes(sender)) return { ok: false, msg: " Kamu udah tercatat jadi pengunjung festival ini." };
  ev.joined.push(sender);
  grantTitle(st, sender, { title: "\u{1F38F} Pengunjung " + ev.name, eventId: ev.id, now });
  return { ok: true, msg: " Kunjunganmu diabadikan \u2014 nomor " + ev.joined.length, rank: ev.joined.length };
}

// ─── FINISH & SWEEP ───
export function finishEvent(st, ev, now = Date.now()) {
  if (!ev || ev.status === "done") return ev.result || null;
  ev.status = "done";
  ev.endedAt = now;
  let outcome = "selesai";
  if (ev.kind === "bossdunia") {
    outcome = ev.hp <= 0 ? "tumbang" : "kabur";
    if (ev.hp > 0) {
      // boss kabur — yang nyerang tetep dapet gelar saksi (grant di attack);
      // gak nyerang tapi nyimakin di joined: gak dapet apa-apa
      outcome = "kabur";
    }
  }
  const top = Object.entries(ev.attackers).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 3).map(([s, r]) => ({ sender: s, dmg: r.dmg }));
  ev.result = { outcome, top, peserta: ev.joined.length };
  if (st.active === ev.id) st.active = "";
  return ev.result;
}

export function sweepEvents(st, now = Date.now()) {
  const ended = [];
  for (const ev of Object.values(st.events)) {
    if (ev.status === "live" && now >= ev.endAt) {
      finishEvent(st, ev, now);
      ended.push(ev);
    }
  }
  return ended;
}

// ─── SUBSCRIBE UMUMAN ───
export function subscribeChat(st, chat) {
  if (!chat || st.subscribers.includes(chat)) return { ok: false, msg: " Chat ini udah langganan event dunia." };
  st.subscribers.push(chat);
  return { ok: true, msg: st.subscribers.length };
}
export function unsubscribeChat(st, chat) {
  if (!st.subscribers.includes(chat)) return { ok: false, msg: " Chat ini memang belum langganan." };
  st.subscribers = st.subscribers.filter((c) => c !== chat);
  return { ok: true, msg: "" };
}

// ─── KARTU (plain text; 🕒 buat countdown/live — standar kartu live) ───
function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function fmtDate(t) {
  return new Date(t).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
}

export function announceCard(ev, now = Date.now()) {
  const k = KINDS[ev.kind];
  const lines = [
    k.emoji + " EVENT DUNIA \u2014 " + ev.name.toUpperCase(),
    "",
    "SEKALI SEJARAH. Gak akan pernah diulang \u2014 yang ketinggalan, ketinggalan selamanya.",
    "\uD83D\uDD52 window " + fmtLeft(ev.endAt - now) + " \u00B7 cara ikut: " + k.cmd,
  ];
  if (ev.kind === "komet") lines.push("Tangkap komet: " + k.cmd + " \u2192 gelar permanen Penjaring " + ev.name + " + " + KOMET_GOLD + " gold (10 pertama bonus " + KOMET_FIRST10_GOLD + ")");
  else if (ev.kind === "bossdunia") lines.push("HP boss: " + ev.hpMax + " \u2014 serang: " + k.cmd + " (\u26A12 energi, damage dari stat RPG). Tumbang bareng = gelar permanen Pembasmi " + ev.name + ", top 3 damage bonus besar");
  else lines.push("Datang: " + k.cmd + " \u2192 gelar permanen Pengunjung " + ev.name + " + " + FEST_GOLD + " gold");
  return lines.join("\n");
}

export function buildStatusCard(st, now = Date.now()) {
  const live = getActiveEvent(st, now);
  if (live) return announceCard(live, now);
  const done = Object.values(st.events).filter((e) => e.status === "done").length;
  const nextIn = st.nextSpawnAt > now ? "\u2248" + Math.max(1, Math.round((st.nextSpawnAt - now) / 3600000)) + " jam lagi (perkiraan)" : "bisa kapan saja";
  return [
    "\u{1F30D} EVENT DUNIA \u2014 TIME CAPSULE",
    "",
    "Belum ada event aktif.",
    "Event berikutnya: " + nextIn,
    "Event yang udah diabadikan sejarah: " + done,
    "",
    "Langganan umuman di chat ini: .worldevent on",
    "Riwayat sepanjang masa: .worldevent riwayat",
  ].join("\n");
}

export function buildResultCard(ev) {
  const r = ev.result || {};
  const lines = ["\uD83C\uDFC1 EVENT SELESAI \u2014 " + ev.name, ""];
  if (ev.kind === "komet") {
    lines.push("\u2604\uFE0F Komet " + ev.name + " hilang di cakrawala, ditangkap " + (r.peserta || 0) + " penjaring.");
    lines.push("Gelar Penjaring " + ev.name + " dikunci permanen \u2014 gak akan pernah dibagikan lagi.");
  } else if (ev.kind === "bossdunia") {
    if (r.outcome === "tumbang") {
      lines.push("\u{1F47E} " + ev.name + " TUMBANG oleh " + (r.peserta || 0) + " penyerang!");
      if (r.top?.length) lines.push("Top damage: " + r.top.map((t, i) => "@" + t.sender.split("@")[0] + " (" + t.dmg + ", +" + BOSS_TOP_GOLD[i] + " gold)").join(" \u00B7 "));
    } else {
      lines.push("\u{1F47E} " + ev.name + " KABUR \u2014 nyaris, tapi meleset. " + (r.peserta || 0) + " penyerang tetep mengukir sejarah (gelar saksi tetep milik mereka).");
    }
    lines.push("Gelar Pembasmi " + ev.name + " gak akan pernah dibagikan lagi.");
  } else {
    lines.push("\u{1F38F} Festival " + ev.name + " ditutup \u2014 " + (r.peserta || 0) + " pengunjung tercatat sejarah.");
  }
  lines.push("", "Riwayat abadi: .worldevent riwayat");
  return lines.join("\n");
}

export function buildHistoryCard(st, limit = 15) {
  const evs = Object.values(st.events).filter((e) => e.status === "done").sort((a, b) => a.startAt - b.startAt).slice(-limit);
  if (!evs.length) return "\u{1F4DC} Belum ada event dunia yang kejadian. Sejarah masih kosong \u2014 dan kapan dimulainya, gak ada yang tahu.";
  const rows = evs.map((e) => KINDS[e.kind].emoji + " " + e.name + " \u2014 " + fmtDate(e.startAt) + " \u00B7 " + (e.result?.peserta || 0) + " peserta" + (e.kind === "bossdunia" ? " \u00B7 boss " + (e.result?.outcome === "tumbang" ? "tumbang" : "kabur") : ""));
  return ["\u{1F4DC} SEJARAH EVENT DUNIA \u2014 SEKALI KEJADI, ABADI SELAMANYA", "", ...rows].join("\n");
}

export function buildTitlesCard(st, sender) {
  const ts = listTitles(st, sender);
  if (!ts.length) return "\uD83C\uDF9F\uFE0F Kamu belum punya gelar event dunia. Ikut event berikutnya biar namamu diabadikan \u2014 .worldevent";
  const rows = ts.map((t) => "\u2022 " + t.title + " (" + fmtDate(t.at) + ")");
  return ["\uD83C\uDF9F\uFE0F GELAR ABADI KAMU \u2014 " + ts.length + " kapsul waktu", "", ...rows].join("\n");
}


// ─── BROADCAST + SCHEDULER (sock menyatu di sini, engine tetap murni) ───
export async function broadcastSpawn(sock, st, ev) {
  const card = announceCard(ev);
  const frames = ev.kind === "komet" ? kometFrames({ name: ev.name.replace(/^Komet /, "") })
    : ev.kind === "bossdunia" ? bossFrames({ name: ev.name, hp: ev.hp, hpMax: ev.hpMax })
    : festivalFrames({ name: ev.name.replace(/^Festival /, "") });
  for (const chat of st.subscribers) {
    try { await playEventAnim(sock, chat, frames); } catch {}
    try { if (sock?.sendMessage) await sock.sendMessage(chat, { text: card }); } catch {}
  }
}

export async function broadcastResult(sock, st, ev) {
  const card = buildResultCard(ev);
  for (const chat of st.subscribers) {
    try { if (sock?.sendMessage) await sock.sendMessage(chat, { text: card }); } catch {}
  }
}

let weTimer = null;
export function initWorldEventScheduler(sock, { tickMs = 60 * 1000 } = {}) {
  if (weTimer) return;
  weTimer = setInterval(async () => {
    try {
      const st = ensureWorldEventState(getDatabase());
      for (const ev of sweepEvents(st)) await broadcastResult(sock, st, ev);
      const auto = maybeAutoSpawn(st);
      if (auto.spawned) await broadcastSpawn(sock, st, auto.event);
    } catch {}
  }, tickMs);
  weTimer.unref?.();
}
export function stopWorldEventScheduler() { if (weTimer) { clearInterval(weTimer); weTimer = null; } }
