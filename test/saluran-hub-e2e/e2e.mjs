// RARA — E2E: SALURAN HUB (25 Sep 2026). Fitur no.1 "bot masa depan": paket
// komplit integrasi Saluran WA — autopost AI harian, inbound auto-react +
// auto-reply keyword, analitik follower (snapshot/growth/milestone/kartu 🕒).
// Mock sock = metadata saluran bentuk MENTAH fork rara (pelajaran bug viewer_role).
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-saluranhub-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");

const engine = await import(R + "/src/lib/rara-saluran-hub.js");
const plugin = await import(R + "/plugins/owner/channelhub.js");
const config = (await import(R + "/config.js")).default;
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

// ── waktu uji: 25 Sep 2026 09:00 WIB (jam > default autopost 08:00) ──
const T = Date.UTC(2026, 8, 25, 2, 0, 0);           // 09:00 WIB
const T_4MNT = T + 4 * 60_000;
const MIN = 60_000;

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => {
  w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 260)));
  ok ? pass++ : fail++;
};

// ── mock sock: metadata mentah fork + record kirim ──
const MAIN_JID = "120363404849776664@newsletter";
const OTHER_JID = "12036999887766554@newsletter";
let curFollowers = 950;
let metaReadable = true;
const sends = [];
const reacts = [];
const sock = {
  user: { id: "6281700000000:1" },
  newsletterMetadata: async (type, key) => {
    if (!metaReadable) throw new Error("metadata down");
    if (key === MAIN_JID || (type === "invite" && key === "TESTCODE")) {
      return {
        id: MAIN_JID,
        state: { type: "Active" },
        thread_metadata: {
          name: { text: "Rara Official" },
          description: { text: "Saluran resmi Rara AI" },
          subscribers_count: curFollowers,
          verification: { verified: false },
          invite: "TESTCODE",
        },
        viewer_metadata: { role: "ADMIN", mute: "OFF" },
      };
    }
    return {
      id: OTHER_JID,
      state: { type: "Active" },
      thread_metadata: { name: { text: "Saluran Lain" }, subscribers_count: 12 },
      viewer_metadata: { role: "SUBSCRIBER" },
    };
  },
  sendMessage: async (jid, payload) => {
    sends.push({ jid, payload });
    if (payload?.react) reacts.push({ jid, ...payload.react });
    return { key: { id: "MSG-" + sends.length, remoteJid: jid } };
  },
};

// deterministik: config runtime salat utama + reset cache resolver
config.saluran = { id: MAIN_JID, link: "", name: "Rara Official" };
const saluranLib = await import(R + "/src/lib/rara-saluran.js");
saluranLib._resetSaluranCacheForTest();

const db = getDatabase();
const SENDER = "6281234567890@s.whatsapp.net";

// ── helper ──
const state = () => engine.ensureHubState(db);
async function mkM(args, extra = {}) {
  const replies = [];
  const m = {
    args,
    chat: SENDER,
    sender: SENDER,
    fromMe: false,
    isOwner: true,
    isCommand: true,
    body: args.join(" "),
    reply: async (t) => { replies.push(t); },
    react: async () => {},
    ...extra,
  };
  return { m, replies };
}

w("\n— 1. engine state & helper —");
{
  db.data.channelhub = undefined;
  const s = state();
  check("1a. defaults lengkap", s.autopost.on === false && s.react.on === false && s.reply.on === false && Array.isArray(s.stats.snapshots));
  const s2 = state();
  check("1b. idempotent (gak ngereset)", s2 === s && s2.autopost.jam === "08:00");
  check("1c. parseJamSaluran valid", engine.parseJamSaluran("8:05") === "08:05" && engine.parseJamSaluran("23:59") === "23:59");
  check("1d. parseJamSaluran invalid", engine.parseJamSaluran("25:00") === null && engine.parseJamSaluran("") === null);
}

w("\n— 2. buildDailyContent (AI) —");
{
  engine._setSaluranHubAIForTest(async () => "Tips Hari Ini\nRajin cek .menu buat liat fitur baru.\nSampai jumpa besok!");
  const c = await engine.buildDailyContent("tips teknologi");
  check("2a. konten AI ke-lewat", c.includes("Tips Hari Ini") && c.length >= 20);
  engine._setSaluranHubAIForTest(async () => "   ");
  let threw = false;
  try { await engine.buildDailyContent("x"); } catch { threw = true; }
  check("2b. AI jawab kosong → THROW (jujur, gak diterusin)", threw);
}

w("\n— 3. autopost tick (dedupe + urutan aman) —");
{
  const s = state();
  engine._setSaluranHubNowForTest(() => T);
  engine._setSaluranHubAIForTest(async () => "Konten autopost uji\nBaris kedua isi bermakna.\nSampai jumpa!");
  const t1 = await engine.processAutopostTick(sock);
  check("3a. off → skip jujur", t1.off === true && sends.length === 0);

  s.autopost.on = true;
  s.autopost.jam = "10:00"; // sekarang 09:00 < 10:00 → belum waktunya
  const t2 = await engine.processAutopostTick(sock);
  check("3b. belum jam → wait", t2.wait === true && t2.sent === 0);

  s.autopost.jam = "08:00";
  engine._setSaluranHubAIForTest(async () => { throw new Error("AI down"); });
  const t3 = await engine.processAutopostTick(sock);
  check("3c. AI gagal → error jujur + TIDAK claim", t3.sent === 0 && /AI down/.test(t3.error) && s.autopost.lastDate !== "2026-09-25");

  engine._setSaluranHubAIForTest(async () => "Konten autopost uji\nBaris kedua isi bermakna.\nSampai jumpa!");
  const t4 = await engine.processAutopostTick(sock);
  const posted = sends.find((x) => x.jid === MAIN_JID && /Konten autopost uji/.test(x.payload.text || ""));
  check("3d. kirim ke saluran utama", t4.sent === 1 && !!posted);
  check("3e. claim lastDate tercatat", s.autopost.lastDate === "2026-09-25" && s.autopost.lastError === "");

  const t5 = await engine.processAutopostTick(sock);
  check("3f. dedupe hari sama → done", t5.done === true && t5.sent === 0 && sends.filter((x) => /Konten autopost/.test(x.payload?.text || "")).length === 1);

  // dry-run tidak kirim
  s.autopost.lastDate = "";
  sends.length = 0;
  const t6 = await engine.processAutopostTick(sock, { dryRun: true });
  check("3g. dryRun → claim tanpa kirim", t6.dry === true && sends.length === 0 && s.autopost.lastDate === "2026-09-25");
}

w("\n— 4. snapshot follower + milestone —");
{
  const s = state();
  s.stats.snapshots = []; s.stats.lastMilestone = 0;
  curFollowers = 950;
  engine._setSaluranHubNowForTest(() => T);
  const r1 = await engine.snapshotFollowers(sock);
  check("4a. snapshot pertama", r1.count === 950 && s.stats.snapshots.length === 1);
  const r2 = await engine.snapshotFollowers(sock);
  check("4b. dedupe < 30 mnt → skipped", r2.skipped === true && s.stats.snapshots.length === 1);
  curFollowers = 1240;
  engine._setSaluranHubNowForTest(() => T + 31 * MIN);
  const r3 = await engine.snapshotFollowers(sock);
  check("4c. snapshot baru tiap 30 mnt", r3.count === 1240 && s.stats.snapshots.length === 2);
  check("4d. milestone 500 tercatat (lompatan ke 1240 → 1000)", r3.milestone?.followers === 1000 && s.stats.lastMilestone === 2);
  const r4 = engine.checkMilestone(s, 1500);
  check("4e. milestone naik → 1500", r4?.followers === 1500);
  const r5 = engine.checkMilestone(s, 1500);
  check("4f. milestone dobel → null", r5 === null);
  check("4g. 499 follower → gak ada milestone", engine.checkMilestone({ stats: { lastMilestone: 0 } }, 499) === null);

  metaReadable = false;
  s.stats.snapshots = [];
  const r6 = await engine.snapshotFollowers(sock);
  check("4h. metadata mati → error jujur, tanpa snapshot palsu", !!r6.error && s.stats.snapshots.length === 0);
  metaReadable = true;
}

w("\n— 5. kartu stat —");
{
  const s = state();
  engine._setSaluranHubNowForTest(() => T); // sekarang = T: snapshot 24h/7d/30d kebaca bener
  s.stats.snapshots = [
    { ts: T - 30 * 24 * 3600_000, count: 800 },
    { ts: T - 7 * 24 * 3600_000, count: 900 },
    { ts: T - 24 * 3600_000, count: 950 },
    { ts: T - 5 * MIN, count: 1000 },
  ];
  const card = engine.buildStatCard(s, "Rara Official");
  check("5a. kartu 🕒 + boxLeft", card.includes("🕒") && card.includes("Rara Official"));
  check("5b. follower 1.000 (format id)", card.includes("1.000"));
  check("5c. delta harian/mingguan/bulanan", card.includes("+50") && card.includes("+100") && card.includes("+200"));
  check("5d. sparkline render", /[▁▂▃▄▅▆▇█]/.test(card));
}

w("\n— 6. notif milestone (saluran + DM owner) —");
{
  sends.length = 0;
  const res = await engine.notifyMilestone(sock, 1000);
  const sal = sends.find((x) => x.jid === MAIN_JID && /followers/.test(x.payload?.text || ""));
  const dm = sends.find((x) => x.jid.endsWith("@s.whatsapp.net") && /Milestone saluran/.test(x.payload?.text || ""));
  check("6a. post ke saluran", res.saluranOk === true && !!sal);
  check("6b. DM owner terkirim", res.dmOk === true && !!dm);
}

w("\n— 7. inbound: auto-react + auto-reply —");
{
  const s = state();
  engine._setSaluranHubNowForTest(() => T);
  const mkPost = (extra = {}) => ({
    chat: MAIN_JID, fromMe: false, body: "Info fitur baru hari ini", isNewsletter: true,
    key: { id: "POST-1", remoteJid: MAIN_JID }, ...extra,
  });

  let r = await engine.inboundHandler(sock, mkPost());
  check("7a. react/reply off → handled false", r.handled === false && reacts.length === 0);

  s.react.on = true;
  sends.length = 0; reacts.length = 0;
  r = await engine.inboundHandler(sock, mkPost());
  check("7b. react ON → post direact", r.handled === true && r.react && reacts.length === 1 && reacts[0].jid === MAIN_JID);
  check("7c. key react = key post", reacts[0].key?.id === "POST-1");

  r = await engine.inboundHandler(sock, mkPost({ key: { id: "POST-2", remoteJid: MAIN_JID } }));
  check("7d. cooldown 3 mnt → react kedua diblok", r.react === undefined && reacts.length === 1);

  engine._setSaluranHubNowForTest(() => T_4MNT);
  r = await engine.inboundHandler(sock, mkPost({ key: { id: "POST-3", remoteJid: MAIN_JID } }));
  check("7e. lewat cooldown → react lagi", !!r.react && reacts.length === 2);

  s.react.count = s.react.capDay;
  r = await engine.inboundHandler(sock, mkPost({ key: { id: "POST-4", remoteJid: MAIN_JID } }));
  check("7f. cap harian → stop react", r.react === undefined && reacts.length === 2);
  s.react.count = 0;

  r = await engine.inboundHandler(sock, mkPost({ fromMe: true }));
  check("7g. post bot sendiri → skip (anti self-loop)", r.skip === "post-bot-sendiri");
  r = await engine.inboundHandler(sock, mkPost({ chat: OTHER_JID }));
  check("7h. saluran lain → skip", r.skip === "saluran-lain");
  r = await engine.inboundHandler(sock, { chat: "1234@g.us", body: "x" });
  check("7i. bukan saluran → skip", r.skip === "bukan-saluran");

  // auto-reply keyword
  s.reply.on = true;
  s.reply.rules = [{ key: "menu", text: "Ketik .menu di chat pribadi bot ya!", hits: 0 }];
  sends.length = 0;
  engine._setSaluranHubNowForTest(() => T_4MNT + 10 * MIN);
  r = await engine.inboundHandler(sock, mkPost({ body: "ada MENU ga di sini", key: { id: "POST-5", remoteJid: MAIN_JID } }));
  const rep = sends.find((x) => /Ketik \.menu/.test(x.payload?.text || ""));
  check("7j. keyword match → balasan ke saluran (case-insensitive)", r.reply === "menu" && !!rep);
  check("7k. rule hits tercatat", s.reply.rules[0].hits === 1);

  r = await engine.inboundHandler(sock, mkPost({ body: "menu lagi", key: { id: "POST-6", remoteJid: MAIN_JID } }));
  const repCount = sends.filter((x) => /Ketik \.menu/.test(x.payload?.text || "")).length;
  check("7l. cooldown reply 5 mnt → dobel diblok", repCount === 1 && s.reply.count === 1);

  r = await engine.inboundHandler(sock, mkPost({ body: "topik gak nyambung", key: { id: "POST-7", remoteJid: MAIN_JID } }));
  check("7m. body tanpa keyword → gak ada balasan", r.reply === undefined);
}

w("\n— 8. scheduler idempotent —");
{
  const t1 = engine.initSaluranHubScheduler(sock);
  const t2 = engine.initSaluranHubScheduler(sock);
  check("8a. dobel init → timer sama", t1 === t2 && !!t1);
  engine.stopSaluranHubScheduler();
  const t3 = engine.initSaluranHubScheduler(sock);
  check("8b. stop → timer baru", t3 !== t1);
  engine.stopSaluranHubScheduler();
}

w("\n— 9. plugin .channelhub —");
{
  engine._resetSaluranHubSeamsForTest();
  const s = state();
  s.autopost.on = false; s.react.on = false; s.reply.on = false; s.reply.rules = [];
  s.stats.snapshots = [{ ts: Date.now() - 60_000, count: 1000 }];

  let { m, replies } = await mkM([]);
  await plugin.handler(m, { sock });
  check("9a. no-arg → panduan", /autopost/.test(replies[0]) && /react/.test(replies[0]) && /stat/.test(replies[0]));

  ({ m, replies } = await mkM(["status"]));
  await plugin.handler(m, { sock });
  const rb = norm(replies[0]);
  check("9b. status → ringkasan 3 modul", /autopost/.test(rb) && /auto-react/.test(rb) && /auto-reply/.test(rb) && /snapshot/.test(rb));

  ({ m, replies } = await mkM(["autopost", "on", "08:30"]));
  await plugin.handler(m, { sock });
  check("9c. autopost on 08:30 → state jalan", s.autopost.on === true && s.autopost.jam === "08:30" && /aktif/.test(replies[0]));

  ({ m, replies } = await mkM(["autopost", "on", "jam-salah"]));
  await plugin.handler(m, { sock });
  check("9d. jam salah → tolak jujur", /HH:MM/.test(replies[0]));

  ({ m, replies } = await mkM(["autopost", "topic", "tips", "bot", "whatsapp"]));
  await plugin.handler(m, { sock });
  check("9e. topic tersimpan", s.autopost.topic === "tips bot whatsapp");

  engine._setSaluranHubAIForTest(async () => "Preview konten tes uji yang cukup panjang.\nIsi baris kedua.\nSampai jumpa!");
  ({ m, replies } = await mkM(["autopost", "tes"]));
  await plugin.handler(m, { sock });
  check("9f. autopost tes → preview tanpa kirim", /Preview konten/.test(replies[0]) && !sends.some((x) => /Preview konten/.test(x.payload?.text || "")));

  ({ m, replies } = await mkM(["autopost", "off"]));
  await plugin.handler(m, { sock });
  check("9g. autopost off", s.autopost.on === false);

  ({ m, replies } = await mkM(["react", "on"]));
  await plugin.handler(m, { sock });
  check("9h. react on", s.react.on === true);

  ({ m, replies } = await mkM(["react", "emoji", "🤝", "🌟"]));
  await plugin.handler(m, { sock });
  check("9i. emoji set", s.react.emojis.join("") === "🤝🌟");

  ({ m, replies } = await mkM(["react", "cooldown", "10"]));
  await plugin.handler(m, { sock });
  check("9j. cooldown 10 mnt", s.react.cooldownMin === 10);

  ({ m, replies } = await mkM(["reply", "add", "menu|ketik", ".menu", "ya"]));
  await plugin.handler(m, { sock });
  check("9k. reply add (multi-kata)", s.reply.rules.length === 1 && s.reply.rules[0].text === "ketik .menu ya");

  ({ m, replies } = await mkM(["reply", "add", "bad"]));
  await plugin.handler(m, { sock });
  check("9l. reply add tanpa | → tolak", norm(replies[0]).includes("keyword>|<balasan>") && s.reply.rules.length === 1);

  ({ m, replies } = await mkM(["reply", "list"]));
  await plugin.handler(m, { sock });
  check("9m. reply list", norm(replies[0]).includes('"menu"'));

  ({ m, replies } = await mkM(["reply", "del", "1"]));
  await plugin.handler(m, { sock });
  check("9n. reply del 1", s.reply.rules.length === 0 && norm(replies[0]).includes("dihapus"));

  ({ m, replies } = await mkM(["reply", "del", "9"]));
  await plugin.handler(m, { sock });
  check("9o. del nomor gak ada → tolak", /gak valid/.test(replies[0]));

  engine._setSaluranHubNowForTest(() => T + 25 * 3600_000);
  ({ m, replies } = await mkM(["stat"]));
  await plugin.handler(m, { sock });
  check("9p. stat → kartu follower", /Saluran Stat/.test(replies[0]) && /follower/.test(replies[0]));
  engine._resetSaluranHubSeamsForTest();

  sends.length = 0;
  ({ m, replies } = await mkM(["tes"]));
  await plugin.handler(m, { sock });
  check("9q. tes kirim → nyampe saluran + konfirmasi", norm(replies[0]).includes("terkirim ke saluran") && sends.some((x) => x.jid === MAIN_JID && /Tes Saluran Hub/.test(x.payload?.text || "")));

  ({ m, replies } = await mkM(["ngawur"]));
  await plugin.handler(m, { sock });
  check("9r. sub gak dikenal → tolak", /tidak dikenal/.test(replies[0]));
}

w("\n— 10. wiring statis —");
{
  const h = fs.readFileSync(R + "/src/handler.js", "utf8");
  check("10a. hook inbound handler.js kepasang", h.includes("rara-saluran-hub.js") && h.includes("inboundHandler"));
  const ix = fs.readFileSync(R + "/index.js", "utf8");
  check("10b. scheduler index.js kepasang", ix.includes('"ChannelHub"') && ix.includes("initSaluranHubScheduler"));
  const eng = fs.readFileSync(R + "/src/lib/rara-saluran-hub.js", "utf8");
  check("10c. engine gak duplikasi resolusi (numpang rara-saluran)", eng.includes('from "./rara-saluran.js"') && eng.includes('from "./rara-saluran-safe.js"'));
}

engine._resetSaluranHubSeamsForTest();
engine.stopSaluranHubScheduler();
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
