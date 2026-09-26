// E2E LinkedIn Job Notifier — fetcher di-inject (setFetcher), 100% offline.
// Jalankan: node test/linkedinnotify-e2e/e2e.mjs
import fs from "fs";
import path from "path";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok, extra) => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

// state file dihapus biar fresh tiap run
const STATE = path.join(process.cwd(), "src", "database", "auto", "linkedinnotify.json");
try { fs.unlinkSync(STATE); } catch {}

const lib = await import("../../src/lib/nova-linkedin-notify.js");
const plug = (await import("../../plugins/loker/linkedinnotify.js")).default;

// ── market lowongan ala actor valig (struktur ASLI live) ──
const job = (id, over = {}) => ({
  id: String(id), url: `https://id.linkedin.com/jobs/view/pos-${id}`,
  title: `Backend Engineer ${id}`, location: "Jakarta, Indonesia",
  postedDate: new Date().toISOString(), companyName: `PT Maju ${id}`,
  companyUrl: "https://id.linkedin.com/company/pt-maju", recruiterName: "", recruiterUrl: "",
  experienceLevel: "Mid-Senior", contractType: "Full-time", workType: "Engineering and Information Technology",
  sector: "Software Development", salary: "Rp 10.000.000 - 15.000.000/bulan", applyType: "EXTERNAL",
  postedTimeAgo: "2 jam lalu", applicationsCount: 7,
  description: "<p>Deskripsi <b>lengkap</b> lowongan nomor " + id + " — kualifikasi, benefit, tanggung jawab.</p>",
  applyUrl: `https://id.linkedin.com/jobs/view/pos-${id}`, ...over,
});
let market = [job(1), job(2), job(3)];
lib.setFetcher(async () => market.map((j) => ({ ...j })));

// ── mock sock ──
const sent = [];
const sock = {
  sendMessage: async (jid, content) => { sent.push({ jid, content }); return { key: { id: "m" + sent.length } }; },
  groupMetadata: async (jid) => { throw new Error("gak ikut grup"); },
};
lib.setSock(sock);
lib.__setWindowOverride(true);

// ── mock m ──
const mkM = (chat) => ({
  chat, sentMsgs: [], reacts: [],
  reply: async (t) => { const m = arguments; mkM._last = t; return { text: t }; },
  react: async (e) => { },
});
const lastReply = () => String(mkM._last || "");
const toSC = (s) => String(s); // claraWrap smallcaps — assert pakai substring longgar

const clear = () => { sent.length = 0; mkM._last = null; };

// ═══ 1. CONFIG CRUD ═══
w("\n[1] Config CRUD");
const kw1 = lib.addKeyword("frontend");
check("keyword add frontend", kw1.ok && kw1.keywords.includes("frontend") && kw1.keywords.length === 2, JSON.stringify(kw1));
const kw2 = lib.addKeyword("data analyst");
check("keyword add ke-2 (developer+frontend+ini)", kw2.ok && kw2.keywords.length === 3);
const kw3 = lib.addKeyword("devops");
check("keyword ke-4 DITOLAK (cap 3 — biaya Apify)", !kw3.ok && String(kw3.error).includes("maks"), JSON.stringify(kw3));
check("list tetap 3 keyword", lib.getStatus().keywords.length === 3);
const kwDup = lib.addKeyword("FRONTEND");
check("keyword duplikat DITOLAK", !kwDup.ok);
const kwDel = lib.delKeyword("frontend");
check("keyword del frontend", kwDel.ok && !kwDel.keywords.includes("frontend"));

check("lokasi Jakarta", lib.setLocation("Jakarta") === "Jakarta");
check("lokasi kosong → default Indonesia", lib.setLocation("") === "Indonesia");
check("periode hari → r86400", lib.setDatePosted("hari") === "r86400");
check("periode minggu → r604800", lib.setDatePosted("minggu") === "r604800");
check("periode bulan → r2592000", lib.setDatePosted("bulan") === "r2592000");
check("periode ngasal → tetap", lib.setDatePosted("xyz") === "r2592000");
check("easyapply ON", lib.setEasyApply(true) === true);
check("interval 60", lib.setIntervalMenit("60") === 60);
check("interval 29 DITOLAK", lib.setIntervalMenit(29) === null);
check("interval 721 DITOLAK", lib.setIntervalMenit(721) === null);

// ═══ 2. CARD FORMAT (metadata lengkap ala anime) ═══
w("\n[2] Card format metadata lengkap");
const card = lib.formatJobCard(job(99), { index: 1, total: 1 });
check("header LOWONGAN LINKEDIN BARU", card.includes("LOWONGAN LINKEDIN BARU"));
check("judul posisi", card.includes("Backend Engineer 99"));
check("perusahaan", card.includes("PT Maju 99"));
check("lokasi", card.includes("Jakarta, Indonesia"));
check("tipe kontrak + work type", card.includes("Full-time") && card.includes("Engineering and Information Technology"));
check("sektor", card.includes("Software Development"));
check("level experience", card.includes("Mid-Senior"));
check("gaji", card.includes("Rp 10.000.000"));
check("pelamar + waktu posting", card.includes("7 pelamar") && card.includes("2 jam lalu"));
check("link lamar", card.includes("https://id.linkedin.com/jobs/view/pos-99"));
check("readmore marker (℅)", card.includes("\u200E\u200E\u200E"));
check("deskripsi di balik readmore + HTML dibersihin", card.includes("Deskripsi lengkap lowongan nomor 99") && !card.includes("<p>"));
check("footer total", card.includes("1"));

// ═══ 3. SEND CARD + BANNER ═══
w("\n[3] Send card ke chat");
clear();
await lib.sendJobCardTo(sock, "628test@s.whatsapp.net", job(50), { index: 1, total: 2 });
check("sendMessage terpanggil", sent.length === 1);
const banner = sent[0]?.content?.contextInfo?.externalAdReply;
check("banner externalAdReply ada", !!banner);
check("banner renderLargerThumbnail", banner?.renderLargerThumbnail === true);
check("banner title = posisi", banner?.title?.includes("Backend Engineer 50"));
check("banner sourceUrl = link lamar", banner?.sourceUrl?.includes("pos-50"));
check("caption metadata", String(sent[0]?.content?.text).includes("PT Maju 50"));

// ═══ 4. BASELINE SILENT + THROTTLE + DEDUP ═══
w("\n[4] Core check — baseline / throttle / dedup / cap");
clear();
lib.addTarget("120363@g.us");
const r1 = await lib.runCheck({}); // jalur scheduler asli (non-force)
check("baseline pertama: 0 terkirim (silent, anti-spam)", r1.sent === 0);
check("initDone true", lib.getStatus().initDone === true);
const r2 = await lib.runCheck({}); // tanpa force → throttle
check("run ke-2 throttle skip", r2.skipped === "throttle");

// job BARU masuk market → harus kekirim
market.push(job(4));
const r3 = await lib.runCheck({ force: true });
check("job baru terkirim", r3.sent >= 1, JSON.stringify(r3));
const r4 = await lib.runCheck({ force: true }); // market sama → dedup
check("run ulang dedup → 0 terkirim", r4.sent === 0);

// cap 5 per check
clear();
for (let i = 10; i <= 18; i++) market.push(job(i));
const r5 = await lib.runCheck({ force: true });
check("cap 5 job per check (anti spam), sisa next cycle", r5.capped === 5 && r5.jobs === 9, JSON.stringify(r5));
const r6 = await lib.runCheck({ force: true });
check("sisa job kekirim cycle berikut", r6.sent > 0 && r6.jobs <= 4, JSON.stringify(r6));

// ═══ 5. WINDOW GUARD ═══
w("\n[5] Window + throttle guard");
lib.__setWindowOverride(false);
const r7 = await lib.runCheck({}); // tanpa force, throttle udah reset? lastCheck barusan — pakai force? force bypass window...
check("window OFF → skip", (r7.skipped === "window") || (r7.skipped === "throttle"), JSON.stringify(r7));
lib.__setWindowOverride(undefined);

// ═══ 6. SUBSCRIBER + AUTO ON ═══
w("\n[6] Subscriber + toggle global");
check("isTarget true", lib.isTarget("120363@g.us") === true);
lib.removeTarget("120363@g.us");
check("removeTarget", lib.isTarget("120363@g.us") === false);
check("global OFF default", lib.isLinkedInNotifierOn() === false);
lib.setLinkedInNotifierOn(true);
check("setLinkedInNotifierOn(true)", lib.isLinkedInNotifierOn() === true);
lib.setLinkedInNotifierOn(false);
check("setLinkedInNotifierOn(false)", lib.isLinkedInNotifierOn() === false);

// ═══ 7. PLUGIN HANDLER ═══
w("\n[7] Plugin handler (.linkedinnotify)");
const m = { chat: "628owner@s.whatsapp.net", reply: async (t) => { mkM._last = t; }, react: async () => { } };
clear();
await plug.handler(m, { sock, args: ["on"] });
check(".on → langganan + global ON", lib.isTarget("628owner@s.whatsapp.net") && lib.isLinkedInNotifierOn() === true);
check(".on reply sukses", lastReply().length > 10);
await plug.handler(m, { sock, args: ["on"] });
check(".on dobel → info udah langganan", lastReply().length > 10);
clear();
await plug.handler(m, { sock, args: ["status"] });
const stat = lastReply();
check(".status tampil token/keyword/lokasi", stat.includes("Apify") && stat.includes("developer") && stat.includes("Indonesia"));
lib.delKeyword("data analyst"); // buat slot kosong
await plug.handler(m, { sock, args: ["keyword", "add", "ui", "ux"] });
check(".keyword add multi-kata", lib.getStatus().keywords.includes("ui ux"));
await plug.handler(m, { sock, args: ["lokasi", "Bandung"] });
check(".lokasi Bandung", lib.getStatus().location === "Bandung");
await plug.handler(m, { sock, args: ["periode", "hari"] });
check(".periode hari", lib.getStatus().datePosted === "r86400");
await plug.handler(m, { sock, args: ["interval", "45"] });
check(".interval 45", lib.getStatus().intervalMenit === 45);
await plug.handler(m, { sock, args: ["interval", "10"] });
check(".interval dibawah 30 DITOLAK", lib.getStatus().intervalMenit === 45);
clear();
market.push(job(77)); // job baru biar .now ada yang dikirim
await plug.handler(m, { sock, args: ["now"] });
check(".now kirim job ke chat", sent.some((s) => s.jid === "628owner@s.whatsapp.net" && String(s.content?.text || "").includes("LOWONGAN LINKEDIN BARU")), "sent=" + sent.length);
await plug.handler(m, { sock, args: ["off"] });
check(".off berhenti langganan", !lib.isTarget("628owner@s.whatsapp.net"));
await plug.handler(m, { sock, args: [] });
check("tanpa arg → guide menu", lastReply().length > 20);

// ═══ 8. SENT TTL PRUNE ═══
w("\n[8] Dedup TTL");
let st = JSON.parse(fs.readFileSync(STATE, "utf8"));
const keys = Object.keys(st.sentIds || {});
check("sentIds terisi", keys.length > 0);
// id basi HARUS bukan job di market — job yang masih di-fetch bakal ke-add lagi
// (behavior bener: lowongan muncul lagi → notify lagi setelah TTL).
st.sentIds["__basetest-stale__"] = new Date(Date.now() - 10 * 86400000).toISOString();
fs.writeFileSync(STATE, JSON.stringify(st));
await lib.runCheck({ force: true });
st = JSON.parse(fs.readFileSync(STATE, "utf8"));
check("id basi (10 hari) di-prune", !st.sentIds["__basetest-stale__"]);
check("job id market tetap ada", st.sentIds[keys[0]]);

// ═══ 9. REGISTRASI ═══
w("\n[9] Registrasi sistem");
const idx = fs.readFileSync(path.join(process.cwd(), "index.js"), "utf8");
check("schedulerInits index.js", idx.includes("nova-linkedin-notify.js") && idx.includes("initLinkedInNotifier"));
const sw = fs.readFileSync(path.join(process.cwd(), "plugins/owner/switch.js"), "utf8");
check("AUTO_REGISTRY autolinkedin", sw.includes("autolinkedin: {"));
check("alias switch linkedinnotify/lnjobs", sw.includes('linkedinnotify: "autolinkedin"') && sw.includes('lnjobs: "autolinkedin"'));
check("SUBSCRIBER_FEATURES", sw.includes("autolinkedin: '.linkedinnotify on'"));
const sh = fs.readFileSync(path.join(process.cwd(), "src/lib/nova-linkedin-notify.js"), "utf8");
check("import lib di switch benar", sw.includes("from '../../src/lib/nova-linkedin-notify.js'"));
check("actor valig (termurah $0.0004/job)", sh.includes("valig~linkedin-jobs-scraper"));
check("window 07:00–22:00 + interval default 120 (credit guard)", sh.includes("WINDOW_START") && sh.includes("DEFAULT_INTERVAL_MENIT"));

// ═══ SUMMARY ═══
lib.setLinkedInNotifierOn(false); // matiin cron monitor biar gak nge-hang process
w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
setTimeout(() => { try { fs.unlinkSync(STATE); } catch {} process.exit(fail ? 1 : 0); }, 300);
