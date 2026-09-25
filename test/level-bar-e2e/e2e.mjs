// E2E — LEVEL/PROGRESS BAR ▰▱ (14 Sep 2026, request owner "bar ▰▱ kepake
// buat progress level, level ataupun semacam progress")
// (1) .levelinfo RPG → bar EXP/HP/Mana/Energy/JobEXP
// (2) .kerja hasil → bar progress Job EXP
// (3) .prestige/.reincarnate reject → bar progress level ke syarat
// (4) .achievement list → bar progress per achievement (belum diklaim)
// (5) animGeneric = no-op (loading morphing dibuang, react emoji cukup)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-levelbar-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");
const db = getDatabase();

// seam kartu canvas — biar .levelinfo gak nyamber jaringan saat gambar kartu
const { _setLevelCardLoadImageForTest } = await import(R + "/src/lib/nova-level.js");
_setLevelCardLoadImageForTest(async () => ({ width: 4, height: 4 }));

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "6289988776655@s.whatsapp.net";
const config = { command: { prefix: "." } };

function mkMock() {
  const sends = [];
  const m = {
    sender: SENDER, chat: "c@g.us", pushName: "Budi", isOwner: true, isGroup: false,
    args: [], text: "", command: "", prefix: ".", mentionedJid: [], quoted: null,
    react: async () => {},
    reply: async (txt, options = {}) => { sends.push({ txt, ext: options?.contextInfo?.externalAdReply }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    user: { id: "6280000000000@s.whatsapp.net" },
    sendMessage: async (jid, payload) => { sends.push({ txt: payload?.text || payload?.caption, edit: payload?.edit?.id }); return { key: { id: "e" + sends.length } }; },
  };
  return { m, sock, sends };
}
const texts = (mk) => mk.sends.map((s) => String(s.txt || "")).join("\n──\n");

// ── seed RPG user
function seedRpg(over = {}) {
  db.setUser(SENDER, { name: "Budi" });
  const u = db.getUser(SENDER);
  u.rpg = {
    level: 2, exp: 30, expNext: 100, gold: 1000, gems: 5,
    hp: 70, maxHp: 100, mana: 10, maxMana: 50, energy: 45, maxEnergy: 100,
    job: "penebang", jobLevel: 2, jobExp: 12, jobExpNext: 50,
    ...over,
  };
  db.setUser(SENDER, { rpg: u.rpg });
}

// ═══════════════════════════════════════════════════════════════
w("\n— .levelinfo: bar ▰▱ semua stat + EXP + Job EXP —");
{
  seedRpg();
  const mk = mkMock();
  const { handler } = await import(R + "/plugins/rpg/levelinfo.js");
  await handler(mk.m, { sock: mk.sock, config });
  const out = texts(mk);
  check("kartu level terkirim", out.includes("Level: 2"));
  check("EXP bar 30%", /✨ EXP  ▰▰▰▱▱▱▱▱▱▱  30\/100/.test(out), (out.match(/✨ EXP[^\n]*/) || ["-"])[0]);
  check("HP bar 70%", /❤️ HP  ▰▰▰▰▰▰▰▱▱▱  70\/100/.test(out), (out.match(/❤️ HP[^\n]*/) || ["-"])[0]);
  check("Mana bar 20%", /🔮 Mana  ▰▰▱▱▱▱▱▱▱▱  10\/50/.test(out), (out.match(/🔮 Mana[^\n]*/) || ["-"])[0]);
  check("Energy bar 45%", /⚡ Energy  ▰▰▰▰▰▱▱▱▱▱  45\/100/.test(out), (out.match(/⚡ Energy[^\n]*/) || ["-"])[0]);
  check("Job EXP bar 12/50", /📖 Job EXP  ▰▰▱▱▱▱▱▱▱▱  12\/50/.test(out), (out.match(/📖 Job EXP[^\n]*/) || ["-"])[0]);
  check("Job + Lv digabung", out.includes("Job: penebang (Lv.2)"));
  check("GAK ada morphing loading (animGeneric no-op)", mk.sends.filter((s) => s.edit).length === 0, mk.sends.length + " pesan, " + mk.sends.filter((s) => s.edit).length + " edit");
  check("hasil langsung (1 pesan)", mk.sends.length === 1, mk.sends.length + " pesan");
  check("canvas level info ditanam di PREVIEW (bukan media)", mk.sends.length === 1 && !!mk.sends[0].ext?.thumbnail, "thumbnail preview kosong");
}

// ═══════════════════════════════════════════════════════════════
w("\n— .kerja: bar progress Job EXP di kartu hasil —");
{
  seedRpg({ energy: 100 });
  const mk = mkMock();
  const { handler } = await import(R + "/plugins/rpg/working.js");
  mk.m.args = ["penebang"];
  await handler(mk.m, { sock: mk.sock, config });
  const out = texts(mk);
  check("kerja jalan (hasil gajian)", /Job EXP : \+\d+/.test(out), (out.match(/Job EXP[^\n]*/) || ["-"])[0]);
  const bar = out.match(/▰+▱* \d+\/\d+/);
  check("bar Job EXP progress ada", !!bar, (out.match(/Job EXP :[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("bar konsisten standar ▰▱", bar && /^▰*▱*$/.test(bar[0].split(" ")[0]));
  // NOTE: animasi profesi (5 frame, request owner 13 Sep "tiap game punya
  // animasi sendiri") = anim konten, BUKAN loading — tetap dipertahanin.
}

// ═══════════════════════════════════════════════════════════════
w("\n— .prestige/.reincarnate: reject kasih bar progress ke syarat —");
{
  seedRpg({ level: 12 });
  const mk = mkMock();
  mk.m.command = "prestige";
  const { handler } = await import(R + "/plugins/rpg/prestige.js");
  await handler(mk.m, { sock: mk.sock, config, command: "prestige" });
  const out = texts(mk);
  check("prestige reject (syarat level 50)", out.includes("Minimal level 50"));
  check("prestige bar progress 12/50", /▰▱+ 12\/50/.test(out) || /▰▱* 12\/50/.test(out), (out.match(/Progress[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("prestige reject kartu ditanam di PREVIEW", mk.sends.length === 1 && !!mk.sends[0].ext?.thumbnail, "thumbnail preview kosong");

  seedRpg({ level: 8 });
  const mk2 = mkMock();
  mk2.m.command = "reincarnate";
  await handler(mk2.m, { sock: mk2.sock, config, command: "reincarnate" });
  const out2 = texts(mk2);
  check("reincarnate reject (syarat level 30)", out2.includes("Minimal level 30"));
  check("reincarnate bar progress 8/30", /▰▱+ 8\/30/.test(out2), (out2.match(/Progress[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("reincarnate reject kartu ditanam di PREVIEW", mk2.sends.length === 1 && !!mk2.sends[0].ext?.thumbnail, "thumbnail preview kosong");
}

// ═══════════════════════════════════════════════════════════════
w("\n— .achievement: bar progress per achievement —");
{
  db.setUser(SENDER, { name: "Budi" });
  const u = db.getUser(SENDER);
  u.gold = 3400; u.balance = 0;
  u.rpg = { level: 5, exp: 0, expNext: 100, gold: 3400, hp: 100, maxHp: 100 };
  db.setUser(SENDER, { rpg: u.rpg });
  // data aktivitas: daily 3/7, mining 34/100, arena 1 win
  await db.setPlayerData?.(SENDER, "daily", { totalClaims: 3, streak: 3, lastClaim: Date.now() });
  await db.setPlayerData?.(SENDER, "mining", { count: 34 });
  await db.setPlayerData?.(SENDER, "arena", { wins: 1 });
  db.save();

  const mk = mkMock();
  const { handler } = await import(R + "/plugins/rpg/achievement.js");
  await handler(mk.m, { sock: mk.sock, config });
  const out = texts(mk);
  check("achievement list tampil", out.includes("Achievement") || out.includes("🏆"), out.slice(0, 50));
  check("first_blood unlocked (1/1 → 🎁 tanpa bar)", /First Blood 🎁/.test(out), (out.match(/First Blood[^\n]*/) || ["-"])[0]);
  check("dedicated bar 3/7", /▰▱+ 3\/7/.test(out), (out.match(/Dedicated[^\n]*\n[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("miner bar 34/100", /▰▱+ 34\/100/.test(out), (out.match(/Deep Miner[^\n]*\n[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("rich_man bar 3.400/100.000 (gold sekarang)", /3400\/100000/.test(out) || /3.400\/100.000/.test(out), (out.match(/Rich Man[^\n]*\n[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("achievement list kartu ditanam di PREVIEW", mk.sends.length === 1 && !!mk.sends[0].ext?.thumbnail, "thumbnail preview kosong");
  check("gak ada morphing loading", mk.sends.filter((s) => s.edit).length === 0);
}

// ═══════════════════════════════════════════════════════════════
w("\n— claim reject juga dapet bar —");
{
  const mk = mkMock();
  mk.m.args = ["claim", "miner"];
  const { handler } = await import(R + "/plugins/rpg/achievement.js");
  await handler(mk.m, { sock: mk.sock, config });
  const out = texts(mk);
  check("claim reject muncul", out.includes("Belum memenuhi syarat"));
  check("claim reject ada bar progress 34/100", /▰▱+ 34\/100/.test(out), (out.match(/Progress[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("claim reject kartu ditanam di PREVIEW", mk.sends.length === 1 && !!mk.sends[0].ext?.thumbnail, "thumbnail preview kosong");
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
