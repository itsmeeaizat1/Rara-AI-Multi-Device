// RARA — E2E: WORLD EVENT / TIME CAPSULE (26 Sep 2026). Engine murni + plugin.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-worldevent-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");

const eng = await import(R + "/src/lib/rara-world-event.js");
const {
  ensureWorldEventState, KINDS, scheduleNextSpawn, getActiveEvent,
  maybeAutoSpawn, spawnEvent, grantTitle, hasTitle, listTitles,
  participateKomet, attackBoss, joinFestival, finishEvent, sweepEvents,
  subscribeChat, unsubscribeChat, announceCard, buildStatusCard,
  buildResultCard, buildHistoryCard, buildTitlesCard,
  KOMET_GOLD, KOMET_FIRST10_GOLD, FEST_GOLD, BOSS_ATTACK_CD_MS,
  broadcastSpawn, broadcastResult, initWorldEventScheduler, stopWorldEventScheduler,
} = eng;
const anim = await import(R + "/src/lib/libanimationrpg/libworldeventrpg.js");
const { handler } = await import(R + "/plugins/rpg/worldevent.js");
const np = await import(R + "/src/lib/rara-plugins.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 240))); ok ? pass++ : fail++; };

const db = getDatabase();
db.data.worldEvent = { seq: 0, events: {}, titles: {}, subscribers: [], active: "", nextSpawnAt: 0 };
const st = ensureWorldEventState(db);
const NOW = Date.now();
const MIN = 60e3, HOUR = 3600e3, DAY = 24 * HOUR;
const U1 = "6281111@s.whatsapp.net", U2 = "6282222@s.whatsapp.net", U3 = "6283333@s.whatsapp.net";
const G1 = "1203grp1@g.us", G2 = "1203grp2@g.us";
for (const [u, lvl, atk] of [[U1, 10, 20], [U2, 6, 10], [U3, 4, 6]]) {
  db.setUser(u, { rpg: { level: lvl, atk, def: 5, gold: 1000, cash: 100000, energy: 100, maxEnergy: 100, jobExp: 0, jobExpNext: 100 } });
}

w("\n===== 1. jadwal otomatis =====");
{
  const t = scheduleNextSpawn(st, NOW, 3, 7);
  check("nextSpawnAt 3-7 hari ke depan", t >= NOW + 3 * DAY && t <= NOW + 7 * DAY, t - NOW);
  check("belum waktunya → gak spawn", maybeAutoSpawn(st, NOW).spawned === false, "");
  scheduleNextSpawn(st, NOW + 1, 0.001, 0.001); // 1 menit ke depan biar pasti tiba
  const auto = maybeAutoSpawn(st, NOW + HOUR);
  check("waktunya tiba → auto spawn (jenis paling jarang)", auto.spawned === true && auto.event.kind === "komet", auto.event?.kind);
  check("event = active + sekali sejarah WE-1", getActiveEvent(st, NOW + HOUR)?.id === "WE-1", "");
  check("spawn kedua saat masih aktif → ditolak", spawnEvent(st, { kind: "festival", now: NOW + HOUR }).ok === false, "");
}

w("\n===== 2. komet (sekali sejarah) =====");
{
  const ev = st.events["WE-1"];
  check("nama komet dari pool: 'Komet Kirana'", ev.name === "Komet Kirana", ev.name);
  let r = participateKomet(st, ev, { sender: U1, now: NOW + HOUR + 5000 });
  check("U1 tangkap komet ok (first10)", r.ok === true && r.first10 === true, JSON.stringify(r));
  r = participateKomet(st, ev, { sender: U1, now: NOW + HOUR + 6000 });
  check("tangkap dobel → ditolak", r.ok === false, r.msg);
  check("gelar abadi diberikan", hasTitle(st, U1, "WE-1") && listTitles(st, U1)[0].title.includes("Penjaring Komet Kirana"), JSON.stringify(listTitles(st, U1)));
  r = participateKomet(st, ev, { sender: U2, now: ev.endAt + 1 });
  check("komet lewat (window habis) → ditolak selamanya", r.ok === false, r.msg);
  // selesai → sweep
  const ended = sweepEvents(st, ev.endAt + 1000);
  check("sweep komet selesai", ended.length === 1 && ended[0].status === "done", "");
  check("active dikosongin", st.active === "", st.active);
}

w("\n===== 3. boss dunia (HP global) =====");
{
  let r = spawnEvent(st, { kind: "bossdunia", now: NOW + 2 * HOUR, hp: 350 });
  check("boss WE-2 spawn", r.ok === true && r.event.name === "Nidhogg Penguasa Palung", r.event?.name);
  const ev = r.event;
  check("participate komet di boss → ditolak", participateKomet(st, ev, { sender: U1, now: NOW + 2 * HOUR }).ok === false, "");
  r = attackBoss(st, ev, { sender: U1, dmg: 200, now: NOW + 2 * HOUR + 1000 });
  check("U1 serang 200 → HP 150", r.ok === true && ev.hp === 150, ev.hp);
  r = attackBoss(st, ev, { sender: U1, dmg: 100, now: NOW + 2 * HOUR + 2000 });
  check("cooldown 20 dtk aktif", r.ok === false, r.msg);
  r = attackBoss(st, ev, { sender: U1, dmg: 150, now: NOW + 2 * HOUR + 1000 + BOSS_ATTACK_CD_MS });
  check("lewat cooldown → hit & TUMBANG (killed)", r.ok === true && r.killed === true && ev.hp === 0, ev.hp);
  check("boss tumbang → status done langsung", ev.status === "done" && ev.result.outcome === "tumbang", "");
  check("top damage tercatat: U1 350", ev.result.top[0].sender === U1 && ev.result.top[0].dmg === 350, JSON.stringify(ev.result.top));
  check("gelar pembasmi diberikan", listTitles(st, U1).some((t) => t.title.includes("Pembasmi")), JSON.stringify(listTitles(st, U1)));
  // boss kedua (nama pool berikutnya — gak pernah dipakai ulang)
  r = spawnEvent(st, { kind: "bossdunia", now: NOW + 3 * HOUR, hp: 100000 });
  check("boss kedua nama BERBEDA (pool jalan)", r.ok === true && r.event.name === "Raja Beku Aldrich", r.event?.name);
  const ev2 = r.event;
  attackBoss(st, ev2, { sender: U2, dmg: 50, now: NOW + 3 * HOUR + 1000 });
  const ended = sweepEvents(st, ev2.endAt + 1000);
  check("boss kabur kalau HP gak habis di window", ended.length === 1 && ended[0].result.outcome === "kabur", ended[0]?.result?.outcome);
}

w("\n===== 4. festival =====");
{
  const r = spawnEvent(st, { kind: "festival", now: NOW + 4 * HOUR });
  check("festival WE-4 spawn", r.ok === true && r.event.name === "Festival Lentera Abadi", r.event?.name);
  const ev = r.event;
  let j = joinFestival(st, ev, { sender: U3, now: NOW + 4 * HOUR + 1000 });
  check("U3 ikut festival", j.ok === true && j.rank === 1, JSON.stringify(j));
  j = joinFestival(st, ev, { sender: U3, now: NOW + 4 * HOUR + 2000 });
  check("ikut dobel → ditolak", j.ok === false, j.msg);
  check("gelar pengunjung", listTitles(st, U3).some((t) => t.title.includes("Pengunjung Festival Lentera Abadi")), "");
}

w("\n===== 5. kartu & sejarah =====");
{
  const live = spawnEvent(st, { kind: "komet", now: NOW + 5 * HOUR });
  const ac = announceCard(live.event);
  check("kartu umuman: SEKALI SEJARAH + 🕒 + .komet", ac.includes("SEKALI SEJARAH") && ac.includes("🕒") && ac.includes(".komet"), ac);
  const stat = buildStatusCard(st, NOW + 5 * HOUR + 1000);
  check("status kartu nunjukin event aktif", stat.includes("Komet Samudra"), stat.slice(0, 80));
  sweepEvents(st, NOW + 6 * HOUR);
  const hist = buildHistoryCard(st);
  check("riwayat: 4 event abadi (Komet Kirana, Nidhogg, Raja Beku, Lentera)", hist.includes("Komet Kirana") && hist.includes("Nidhogg") && hist.includes("Raja Beku") && hist.includes("Lentera Abadi"), hist.slice(0, 200));
  check("riwayat nunjukin boss kabur", hist.includes("kabur"), "");
  const tc = buildTitlesCard(st, U1);
  check("kartu gelar U1: penjaring + pembasmi", tc.includes("Penjaring") && tc.includes("Pembasmi"), tc.slice(0, 120));
  const rc = buildResultCard(st.events["WE-2"]);
  check("kartu hasil boss: TUMBANG + top damage + bonus", rc.includes("TUMBANG") && rc.includes("@" + U1.split("@")[0]) && rc.includes("+3000"), rc.slice(0, 160));
}

w("\n===== 6. subscribe & scheduler broadcast =====");
{
  check("subscribe G1 & G2", subscribeChat(st, G1).ok === true && subscribeChat(st, G2).ok === true, "");
  check("subscribe dobel → ditolak", subscribeChat(st, G1).ok === false, "");
  check("unsubscribe G2", unsubscribeChat(st, G2).ok === true && st.subscribers.length === 1, "");
  const sent = [];
  const fakeSock = { sendMessage: async (jid, p) => { sent.push({ jid, text: p.text, key: { id: "x" + sent.length } }); } };
  const r = spawnEvent(st, { kind: "festival", now: NOW + 7 * HOUR });
  await broadcastSpawn(fakeSock, st, r.event);
  check("broadcastSpawn: animasi + kartu ke chat langganan", sent.length === 2 && sent[0].jid === G1 && sent[1].text.includes("FESTIVAL"), JSON.stringify(sent.map(s => s.text.slice(0, 25))));
  sent.length = 0;
  await broadcastResult(fakeSock, st, r.event);
  check("broadcastResult ke langganan", sent.length === 1 && sent[0].text.includes("ditutup"), sent[0]?.text.slice(0, 40));
  initWorldEventScheduler(fakeSock, { tickMs: 50 });
  check("scheduler init idempotent (2x aman)", (initWorldEventScheduler(fakeSock), true));
  stopWorldEventScheduler();
}

w("\n===== 7. animasi khas per jenis =====");
{
  const kf = anim.kometFrames({ name: "Kirana" });
  check("komet: 6 frame melintas 🌌 + 💥 tertangkar", kf.length === 6 && kf[0].includes("KOMET KIRANA") && kf[5].includes("TERTANGKAR"), kf.length);
  const bf = anim.bossFrames({ name: "Nidhogg", hp: 500, hpMax: 500 });
  check("boss: kabut menebal → 🌟 BANGKIT + .bossdunia", bf.length === 4 && bf[3].includes("BANGKIT") && bf[3].includes(".bossdunia"), bf.length);
  const ff = anim.festivalFrames({ name: "Lentera Abadi" });
  check("festival: lentera naik 5 frame", ff.length === 5 && ff[0].includes("FESTIVAL"), ff.length);
}

w("\n===== 8. plugin handler =====");
{
  await np.loadPlugins(path.resolve("plugins"));
  const found = np.getPlugin("worldevent");
  check("plugin kebaca registry (kategori rpg)", !!found && found?.config?.name === "worldevent", found?.config?.name);
  const replies = [], sent = [];
  const mkM = (args, opts = {}) => ({
    sender: U1, chat: G1, isGroup: true, isOwner: !!opts.owner,
    pushName: "Owner",
    text: (".worldevent " + args.join(" ")).trim(),
    react: async () => {},
    reply: async (t) => { replies.push(String(t)); },
  });
  const fakeSock = { sendMessage: async (jid, p) => { sent.push({ jid, text: p.text, key: { id: "y" + sent.length } }); } };
  db.data.worldEvent = { seq: 0, events: {}, titles: {}, subscribers: [], active: "", nextSpawnAt: NOW + DAY };
  const st2 = ensureWorldEventState(db);

  await handler(mkM([]), { sock: fakeSock });
  check("tanpa sub → status + guide langganan", replies[0].includes("EVENT DUNIA") && replies[0].includes("worldevent on"), replies[0].slice(0, 60));
  replies.length = 0;
  await handler(mkM(["on"]), { sock: fakeSock });
  check(".worldevent on → chat langganan", st2.subscribers.includes(G1), replies[0]);
  replies.length = 0;
  await handler(mkM(["gelar"]), { sock: fakeSock });
  check("gelar kosong → ajakan ikut", replies[0].includes("belum punya gelar"), replies[0]);
  replies.length = 0;
  await handler(mkM(["spawn", "komet"]), { sock: fakeSock });
  check("spawn non-owner → ditolak", replies[0].includes("owner"), replies[0]);
  replies.length = 0;
  await handler(mkM(["spawn", "komet"], { owner: true }), { sock: fakeSock });
  const live = getActiveEvent(st2);
  check("spawn owner → event live + broadcast ke langganan", !!live && sent.some((s) => s.text.includes("SEKALI SEJARAH")), sent.map(s => s.text.slice(0, 30)).join("|"));
  check("animasi broadcast terkirim sebelum kartu", sent[0]?.text.includes("``````".slice(0, 3)) || sent[0]?.text.includes("KOMET"), sent[0]?.text.slice(0, 30));
  replies.length = 0;
  // .komet pintasan → tangkap komet + reward
  const goldBefore = db.getUser(U1).rpg.gold;
  const mkKomet = { sender: U1, chat: G1, isGroup: true, text: ".komet", react: async () => {}, reply: async (t) => { replies.push(String(t)); } };
  await handler(mkKomet, { sock: fakeSock });
  check(".komet → komet tertangkap + gold naik", db.getUser(U1).rpg.gold >= goldBefore + KOMET_GOLD && replies[0].includes("TANGKAP"), db.getUser(U1).rpg.gold);
  check("first10 bonus diberikan (+1000)", db.getUser(U1).rpg.gold === goldBefore + KOMET_GOLD + KOMET_FIRST10_GOLD, db.getUser(U1).rpg.gold);
  replies.length = 0;
  const mkKomet2 = { sender: U1, chat: G1, isGroup: true, text: ".komet", react: async () => {}, reply: async (t) => { replies.push(String(t)); } };
  await handler(mkKomet2, { sock: fakeSock });
  check(".komet dobel → ditolak (sekali seumur hidup)", replies[0].includes("udah nangkep"), replies[0]);
  replies.length = 0;
  // akhiri event komet → sweep di command berikutnya → riwayat terisi
  const liveEv = getActiveEvent(st2);
  liveEv.endAt = Date.now() - 1;
  sent.length = 0;
  await handler(mkM(["riwayat"]), { sock: fakeSock });
  check("riwayat via handler (habis sweep, komet masuk sejarah)", replies[0].includes("Komet Kirana") && replies[0].includes("peserta"), replies[0].slice(0, 90));
  check("sweep umum hasil ke langganan", sent.some((x) => x.text.includes("hilang di cakrawala")), sent.map(x => x.text.slice(0, 25)).join("|"));
}

w("\n===== TOTAL =====");
w(pass + " PASS, " + fail + " FAIL");
process.exit(fail ? 1 : 0);
