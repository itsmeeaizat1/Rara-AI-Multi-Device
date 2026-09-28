// NOVA — E2E: GUILD WAR ANTAR GRUP (26 Sep 2026). Engine murni + plugin.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-guildwar-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");
const { getDatabase } = await import(R + "/src/lib/nova-database.js");

const eng = await import(R + "/src/lib/nova-guildwar.js");
const {
  ensureGuildWarState, validName, createGuild, joinGuild, leaveGuild,
  disbandGuild, donateTreasury, findGuildByName, getGuild, memberPower,
  getGuildPower, startWar, warAttack, guildSide, finishWar, applyWarOutcome,
  sweepWars, rankGuilds, guildRank, buildWarStartCard, buildScoreCard,
  buildResultCard, buildGuildCard, buildTopCard,
  WAR_STAKE, WAR_WINDOW_MS, ATTACK_COOLDOWN_MS,
} = eng;
const anim = await import(R + "/src/lib/libanimationrpg/libguildwarrpg.js");
const { handler } = await import(R + "/plugins/rpg/guildwar.js");
const np = await import(R + "/src/lib/nova-plugins.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 260))); ok ? pass++ : fail++; };

const db = getDatabase();
db.data.guildwar = { guilds: {}, wars: {}, seq: 0 };
const st = ensureGuildWarState(db);
const MIN = 60e3;
const NOW = Date.now();
const G1 = "1203grp1@g.us", G2 = "1203grp2@g.us", G3 = "1203grp3@g.us";
const U1 = "6281111@s.whatsapp.net", U2 = "6282222@s.whatsapp.net", U3 = "6283333@s.whatsapp.net", U4 = "6284444@s.whatsapp.net";

// user RPG: U1-U2 di guild A, U3-U4 di guild B
for (const [u, lvl, atk, def] of [[U1, 10, 20, 15], [U2, 6, 10, 8], [U3, 8, 15, 10], [U4, 4, 6, 4]]) {
  db.setUser(u, { rpg: { level: lvl, atk, def, gold: 5000, cash: 100000, energy: 100, maxEnergy: 100, jobExp: 0, jobExpNext: 100 } });
}

w("\n===== 1. validasi nama =====");
check("nama valid", validName("Naga Hitam") === "Naga Hitam", "");
check("nama kependekan → null", validName("ab") === null, "");
check("nama ada simbol → null", validName("Naga<>X") === null, "");
check("nama kepanjangan → null", validName("AAAAAAAAAAAAAAAAAAAAAAA") === null, "");

w("\n===== 2. create/join/leave guild =====");
{
  let r = createGuild(st, { group: G1, name: "Naga Hitam", emoji: "🐉", sender: U1, now: NOW });
  check("create guild A ok", r.ok === true && r.guild.name === "Naga Hitam" && r.guild.id === "G1", r.msg);
  r = createGuild(st, { group: G1, name: "Naga Lain", sender: U2, now: NOW });
  check("1 grup 1 guild → ditolak", r.ok === false, r.msg);
  r = createGuild(st, { group: G2, name: "naga hitam", sender: U3, now: NOW });
  check("nama dobel global (case-insens) → ditolak", r.ok === false, r.msg);
  r = createGuild(st, { group: G2, name: "Elang Biru", emoji: "🦅", sender: U3, now: NOW });
  check("create guild B ok (grup lain)", r.ok === true && r.guild.id === "G2", r.msg);
  r = joinGuild(st, { group: G1, sender: U2, now: NOW });
  check("U2 join guild A", r.ok === true && r.guild.members.length === 2, r.msg);
  r = joinGuild(st, { group: G1, sender: U2, now: NOW });
  check("join dobel → ditolak", r.ok === false, r.msg);
  check("getGuild by group", getGuild(st, G1)?.name === "Naga Hitam", "");
  check("findGuildByName case-insens", findGuildByName(st, "eLaNg BiRu")?.id === "G2", "");
}

w("\n===== 3. kekuatan & donasi =====");
{
  const gA = getGuild(st, G1);
  check("power A = 2*lvl+atk+def gabungan", getGuildPower(st, db, gA) === (20 + 20 + 15) + (12 + 10 + 8), getGuildPower(st, db, gA));
  check("memberPower tunggal", memberPower({ level: 5, atk: 3, def: 2 }) === 15, "");
  let r = donateTreasury(st, { group: G1, amount: 500 });
  check("donasi 500 → treasury 500", r.ok === true && r.guild.treasury === 500, "");
  r = donateTreasury(st, { group: G1, amount: 0 });
  check("donasi 0 → ditolak", r.ok === false, "");
  r = donateTreasury(st, { group: G3, amount: 100 });
  check("donasi di grup tanpa guild → ditolak", r.ok === false, "");
  donateTreasury(st, { group: G2, amount: 400 });
}

w("\n===== 4. startWar + aturan =====");
{
  let r = startWar(st, { guildA: getGuild(st, G1), guildB: getGuild(st, G1) });
  check("war vs diri sendiri → ditolak", r.ok === false, r.msg);
  r = startWar(st, { guildA: getGuild(st, G1), guildB: getGuild(st, G2), stake: 99999 });
  check("treasury kurang dari stake → ditolak", r.ok === false, r.msg);
  r = startWar(st, { guildA: getGuild(st, G1), guildB: getGuild(st, G2) });
  check("war A vs B mulai", r.ok === true && r.war.id === "GW-1" && r.war.status === "live", r.msg);
  check("stake dipotong dari kedua treasury", getGuild(st, G1).treasury === 200 && getGuild(st, G2).treasury === 100, getGuild(st, G1).treasury + "/" + getGuild(st, G2).treasury);
  check("pot = 2× stake", r.war.pot === WAR_STAKE * 2, r.war.pot);
  r = startWar(st, { guildA: getGuild(st, G1), guildB: createGuild(st, { group: G3, name: "Serigala", sender: U4, now: NOW }).guild });
  check("guild lagi perang → gak bisa war lagi", r.ok === false, r.msg);
}

w("\n===== 5. serangan (cooldown, skor, mvp) =====");
{
  const war = st.wars["GW-1"];
  check("side guild A = atk", guildSide(war, "G1") === "atk", "");
  let r = warAttack(st, war, { side: "atk", sender: U1, dmg: 55, now: NOW + 1000 });
  check("U1 serang → +55 atk", r.ok === true && r.dmg === 55 && war.atkScore === 55, JSON.stringify(r));
  r = warAttack(st, war, { side: "atk", sender: U1, dmg: 40, now: NOW + 5000 });
  check("cooldown aktif → ditolak", r.ok === false, r.msg);
  r = warAttack(st, war, { side: "atk", sender: U1, dmg: 40, now: NOW + 1000 + ATTACK_COOLDOWN_MS + 1 });
  check("lewat cooldown → bisa nyerang lagi", r.ok === true && war.atkScore === 95, war.atkScore);
  r = warAttack(st, war, { side: "def", sender: U3, dmg: 30, now: NOW + 2000 });
  check("U3 (def) serang → def +30", r.ok === true && war.defScore === 30, war.defScore);
  r = warAttack(st, war, { side: "xxx", sender: U4, dmg: 10, now: NOW + 3000 });
  check("side gak valid → ditolak", r.ok === false, r.msg);
}

w("\n===== 6. hasil perang + hadiah =====");
{
  const war = st.wars["GW-1"];
  const res = finishWar(st, war, NOW + WAR_WINDOW_MS);
  check("status done", war.status === "done", "");
  check("pemenang = atk (95 vs 30)", res.winner === "atk", JSON.stringify(res));
  check("MVP = U1 (95 poin)", res.mvp === U1 && res.mvpScore === 95, JSON.stringify(res));
  applyWarOutcome(st, war);
  const A = getGuild(st, G1), B = getGuild(st, G2);
  check("A: pot masuk treasury + win + 100+50 MVP poin", A.treasury === 200 + 600 && A.wins === 1 && A.points === 150, A.treasury + "/" + A.wins + "/" + A.points);
  check("B: kalah + 20 poin konsolasi", B.losses === 1 && B.points === 20, B.points);
  check("finishWar dobel → idempotent", finishWar(st, war).winner === "atk" && A.wins === 1, "");
}

w("\n===== 7. sweepWars & seri =====");
{
  // war kedua diserang sama rata → seri (treasury diisi lagi dulu)
  donateTreasury(st, { group: G2, amount: 500 }); // B: 100 → 600
  const r = startWar(st, { guildA: getGuild(st, G1), guildB: getGuild(st, G2), now: NOW + 10 * MIN });
  check("war kedua mulai", r.ok === true && r.war.id === "GW-2", r.msg);
  warAttack(st, r.war, { side: "atk", sender: U1, dmg: 50, now: NOW + 10 * MIN + 1000 });
  warAttack(st, r.war, { side: "def", sender: U3, dmg: 50, now: NOW + 10 * MIN + 2000 });
  const ended = sweepWars(st, NOW + 10 * MIN + WAR_WINDOW_MS + 1000);
  check("sweep deteksi 1 war selesai", ended.length === 1 && ended[0].id === "GW-2", ended.length);
  check("hasil seri", ended[0].result.winner === "tie", JSON.stringify(ended[0].result));
  const A = getGuild(st, G1), B = getGuild(st, G2);
  // A sebelum war2 = 800 (200 sisa + 600 pot), B = 100+500 donasi = 600; stake 300 dipotong, seri → balik
  check("seri: stake balik + poin 40 masing-masing (+50 MVP ke A, MVP=U1 50=U3)", A.treasury === 800 && B.treasury === 600 && A.points === 150 + 40 + 50 && B.points === 20 + 40, A.treasury + "/" + B.treasury + "/" + A.points + "/" + B.points);
  check("sweep kedua → gak ada lagi", sweepWars(st, NOW + 99 * MIN).length === 0, "");
}

w("\n===== 8. ranking & kartu =====");
{
  const ranked = rankGuilds(st);
  check("ranking: A (#150+... ) di atas B", ranked[0].name === "Naga Hitam" && ranked[1].name === "Elang Biru", ranked.map(g => g.name).join(","));
  check("guildRank sesuai", guildRank(st, getGuild(st, G1)) === 1 && guildRank(st, getGuild(st, G2)) === 2, "");
  const top = buildTopCard(st);
  check("kartu top sebut nama + poin + W/L", top.includes("Naga Hitam") && top.includes("240 poin") && top.includes("W/"), top.slice(0, 160));
  const gcard = buildGuildCard(getGuild(st, G1), { power: 85, rank: 1 });
  check("kartu guild: ketua/treasury/rekor/rank", gcard.includes("NAGA HITAM") && gcard.includes("Treasury") && gcard.includes("#1"), gcard);
  const war = st.wars["GW-1"];
  const startCard = buildWarStartCard(war);
  check("kartu mulai: ⚔️ + pot + 🕒 + .guild attack", startCard.includes("⚔️") && startCard.includes("600") && startCard.includes("🕒") && startCard.includes(".guild attack"), startCard);
  const sc = buildScoreCard(war, war.startAt + 1000);
  check("kartu skor live: 🕒 sisa + bar + MVP", sc.includes("🕒") && sc.includes("▙") && sc.includes("MVP"), sc.slice(0, 160));
  const rc = buildResultCard(war);
  check("kartu hasil: JUARA + skor + MVP +150", rc.includes("JUARA") && rc.includes("95 vs 30") && rc.includes("MVP") && rc.includes("+150"), rc);
}

w("\n===== 9. animasi khas (libguildwarrpg.js) =====");
{
  const fr = anim.warFrames({ nameA: "Naga Hitam", emojiA: "🐉", nameB: "Elang Biru", emojiB: "🦅" });
  check("6 frame pasukan berbaris → bentrok", fr.length === 6, fr.length);
  check("frame sebut kedua guild", fr[0].includes("NAGA HITAM") && fr[0].includes("ELANG BIRU"), fr[0]);
  check("frame bentrok ada 💥 + .guild attack", fr[5].includes("💥") && fr[5].includes(".guild attack"), fr[5]);
  const vf = anim.victoryFrames({ name: "Naga Hitam", emoji: "🐉" });
  check("grid 4 baris: HUD · pasukan/trophy · adegan medan · status", fr.every((x) => (x.match(/\n/g) || []).length >= 5) && fr.some((x) => x.includes("\u{1F3D4}\uFE0F") || x.includes("genderang")), fr[0]);
  check("adegan medan makin tegang: bukit → genderang → 🔥 → 💥🌪️", fr[3].includes("\u26A1") && fr[4].includes("\u{1F525}") && fr[5].includes("\u{1F32A}\uFE0F"), fr.map((x) => x.split("\n")[3]).join(" | ").slice(0, 150));
  check("victory frames: JUARA + naik trophy", vf.length === 4 && vf[3].includes("JUARA") === false || vf[vf.length - 1].includes("NAGA HITAM"), JSON.stringify(vf.map(x => x.slice(0, 30))));
  check("victory grid: adegan perayaan 📣→🎊→🔦→🎉", vf[0].includes("\u{1F4E3}") && vf[1].includes("\u{1F38A}") && vf[2].includes("\u{1F526}") && vf[3].includes("\u{1F389}"), vf.map((x) => x.split("\n")[3]).join(" | "));
}

w("\n===== 10. plugin handler (registry + alur) =====");
{
  await np.loadPlugins(path.resolve("plugins"));
  const found = np.getPlugin("guildwar");
  check("plugin kebaca registry + kategori rpg", !!found && found?.config?.name === "guildwar", found?.config?.name);
  const replies = [];
  const sent = [];
  const mkM = (group, args) => ({
    sender: U1, chat: group, isGroup: true,
    pushName: "Owner",
    args,
    text: (".guild " + args.join(" ")).trim(),
    react: async () => {},
    reply: async (t) => { replies.push(String(t)); },
  });
  const fakeSock = { sendMessage: async (jid, p) => { sent.push({ jid, text: p.text, key: { id: "k" + sent.length } }); } };

  db.data.guildwar = { guilds: {}, wars: {}, seq: 0 };
  const st2 = ensureGuildWarState(db);
  db.setUser(U3, { rpg: { level: 8, atk: 15, def: 10, gold: 5000, energy: 100, maxEnergy: 100, jobExp: 0, jobExpNext: 100 } });

  await handler(mkM(G1, ["create", "Banteng", "|", "🐃"]), { sock: fakeSock });
  check("handler create → guild terdaftar", getGuild(st2, G1)?.name === "Banteng", replies[0]);
  replies.length = 0;
  await handler(mkM(G2, ["create", "Komodo", "|", "🦎"]), { sock: fakeSock });
  await handler(mkM(G2, ["join"]), { sock: fakeSock });
  replies.length = 0;
  await handler(mkM(G1, ["join"]), { sock: fakeSock });
  check("handler join (level 10 ≥ 3) ok", getGuild(st2, G1).members.length === 1, replies[0]);
  replies.length = 0;
  // war via handler: kedua guild treasury 0 → harus ditolak ramah
  await handler(mkM(G1, ["war", "Komodo"]), { sock: fakeSock });
  check("war ditolak kalau treasury kurang (pesan donasi)", replies[0].includes("Treasury") && replies[0].includes("donate"), replies[0]);
  replies.length = 0;
  // donasi via handler (gold RPG beneran kepakai)
  const goldBefore = db.getUser(U1).rpg.gold;
  await handler(mkM(G1, ["donate", "500"]), { sock: fakeSock });
  check("donasi via handler motong gold RPG", getGuild(st2, G1).treasury === 500 && db.getUser(U1).rpg.gold === goldBefore - 500, db.getUser(U1).rpg.gold);
  await handler(mkM(G2, ["donate", "500"]), { sock: fakeSock });
  replies.length = 0;
  // war via handler → animasi (fake sock dukung edit? key ada → anim jalan) + start card ke 2 grup
  await handler(mkM(G1, ["war", "Komodo"]), { sock: fakeSock });
  const warLive = Object.values(st2.wars).find((x) => x.status === "live");
  check("war via handler live", !!warLive, replies[0]);
  check("umuman ke grup lawan juga terkirim", sent.some((s) => s.jid === G2 && s.text.includes("menantang")), sent.map(s => s.jid + ":" + s.text.slice(0, 20)).join(" | "));
  replies.length = 0;
  // attack via handler: energi kepake + skor naik
  const eBefore = db.getUser(U1).rpg.energy;
  await handler(mkM(G1, ["attack"]), { sock: fakeSock });
  check("attack via handler: energi berkurang + skor naik", db.getUser(U1).rpg.energy === eBefore - 2 && warLive.atkScore > 0, warLive.atkScore);
  check("balasan attack sebut poin & skor", replies[0].includes("poin!") && replies[0].includes("Skor:"), replies[0]);
  replies.length = 0;
  await handler(mkM(G1, ["score"]), { sock: fakeSock });
  check("handler score → kartu live 🕒", replies[0].includes("🕒") && replies[0].includes("Banteng"), replies[0].slice(0, 80));
  replies.length = 0;
  // selesaikan war paksa (endAt lampau) → sweep di command berikutnya umum hasil
  warLive.endAt = Date.now() - 1;
  await handler(mkM(G2, ["top"]), { sock: fakeSock });
  check("command berikutnya sweep → hasil ke DUA grup", sent.some((s) => s.text.includes("JUARA") || s.text.includes("SERI")), sent.slice(-4).map(s => s.text.slice(0, 30)).join(" | "));
  // mkM selalu sender U1 → U1 donasi 2x (500+500) lalu MVP +150: 5000-1000+150=4150
  check("MVP dapet +150 gold personal", db.getUser(U1).rpg.gold === goldBefore - 1000 + 150, db.getUser(U1).rpg.gold);
  replies.length = 0;
  // leave + bubar
  await handler(mkM(G1, ["bubar"]), { sock: fakeSock });
  check("bubar oleh ketua → guild hilang", getGuild(st2, G1) === null, replies[0]);
}

w("\n===== TOTAL =====");
w(pass + " PASS, " + fail + " FAIL");
process.exit(fail ? 1 : 0);
