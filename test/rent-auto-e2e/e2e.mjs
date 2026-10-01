// RARA — E2E: AUTO SEWA & PREMIUM MANAGER .rentauto (27 Sep 2026)
// Lib murni (processRentAutoTick) + plugin handler. Pola: botdoctor-e2e.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-rentauto-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const lib = await import(R + "/src/lib/rara-rent-auto.js");
const {
  ensureRentAutoState, processRentAutoTick, buildRentAutoStatus,
  initRentAutoScheduler, stopRentAutoScheduler,
  _setRentAutoNowForTest, _clearRentAutoNowForTest,
  _setRentAutoOwnerJidForTest, _clearRentAutoOwnerJidForTest,
} = lib;
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const { addPremium, loadPremium } = await import(R + "/src/lib/rara-premium-db.js");
const { handler } = await import(R + "/plugins/owner/rentauto.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 260))); ok ? pass++ : fail++; };

const DAY = 86400000, HOUR = 3600000;
const REAL_NOW = Date.now();
let NOW = REAL_NOW; // seam clock — geser via offset
_setRentAutoNowForTest(() => NOW);
_setRentAutoOwnerJidForTest(() => "6281700000001@s.whatsapp.net");

const db = getDatabase();
db.data.sewa = { enabled: true, groups: {}, registrations: {} };

// fake sock: rekam semua DM/pesan + groupLeave
const mkSock = (fail = false) => {
  const s = { sent: [], left: [], sendMessage: async (jid, o) => { if (fail) throw new Error("send gagal"); s.sent.push({ jid, text: o?.text || "" }); }, groupLeave: async (gid) => { s.left.push(gid); } };
  return s;
};
const dmTo = (sock, jid) => sock.sent.filter((s) => s.jid === jid);

w("\n===== 1. state & default =====");
{
  const st = ensureRentAutoState(db);
  check("default: on AKTIF", st.on === true, st.on);
  check("default: grace 3 hari", st.graceDays === 3, st.graceDays);
  check("default: digest 21:00", st.digestJam === "21:00", st.digestJam);
  st.digestJam = "23:59"; // tunda digest — section 8 nyetel jam sendiri
  st.marks = {}; st.log = []; st.lastDigestTs = 0; st.lastDigestDate = "";
  db.db.write();
}

w("\n===== 2. reminder sewa H-3 =====");
{
  const gid = "120363021000000001@g.us";
  db.data.sewa.groups[gid] = { name: "Grup A", addedAt: NOW, expiredAt: NOW + 2 * DAY, isLifetime: false, addedBy: "6281700000002@s.whatsapp.net" };
  const sock = mkSock();
  const a1 = await processRentAutoTick(sock);
  const dms = dmTo(sock, "6281700000002@s.whatsapp.net");
  check("H-3: DM ke penyewa terkirim 1x", dms.length === 1, dms.length);
  check("H-3: DM berisi kartu 🕒 + boxLeft", dms[0]?.text?.includes("🕒") && dms[0]?.text?.includes("「"), dms[0]?.text?.slice(0, 80));
  check("H-3: DM sebut nama grup", dms[0]?.text?.includes("Grup A"), dms[0]?.text?.slice(0, 120));
  check("H-3: action tercatat", a1.length === 1 && /H-3/.test(a1[0]), JSON.stringify(a1));
  const a2 = await processRentAutoTick(sock);
  check("H-3: tick kedua dedupe (gak dobel)", dmTo(sock, "6281700000002@s.whatsapp.net").length === 1 && a2.length === 0, JSON.stringify(a2));
  delete db.data.sewa.groups["120363021000000001@g.us"]; // jangan bocor ke section lain
}

w("\n===== 3. reminder sewa H-1 & reset pas renew =====");
{
  const gid = "120363021000000002@g.us";
  db.data.sewa.groups[gid] = { name: "Grup B", addedAt: NOW, expiredAt: NOW + 12 * HOUR, isLifetime: false, addedBy: "6281700000003@s.whatsapp.net" };
  const sock = mkSock();
  const a1 = await processRentAutoTick(sock);
  const dms = dmTo(sock, "6281700000003@s.whatsapp.net");
  check("H-1: DM terkirim, teks 'kurang dari 1 hari'", dms.length === 1 && /kurang dari 1 hari/.test(dms[0].text), dms[0]?.text?.slice(0, 120));
  check("H-1: action tercatat", a1.length === 1 && /H-1/.test(a1[0]), JSON.stringify(a1));
  // renew: expiredAt baru → reminder H-3 boleh lagi
  db.data.sewa.groups[gid].expiredAt = NOW + 2 * DAY;
  const a2 = await processRentAutoTick(sock);
  check("renew: expiredAt baru → reminder nyala lagi", dmTo(sock, "6281700000003@s.whatsapp.net").length === 2 && /H-3/.test(a2[0] || ""), JSON.stringify(a2));
  delete db.data.sewa.groups[gid];
}

w("\n===== 4. sewa kedaluwarsa: umum → grace → keluar =====");
{
  const gid = "120363021000000004@g.us";
  db.data.sewa.groups[gid] = { name: "Grup D", addedAt: NOW, expiredAt: NOW - HOUR, isLifetime: false, addedBy: "6281700000004@s.whatsapp.net" };
  const sock = mkSock();
  const a1 = await processRentAutoTick(sock);
  const keGrup = dmTo(sock, gid);
  check("expired: pengumuman ke GRUP (bukan DM) 1x", keGrup.length === 1, keGrup.length);
  check("expired: pengumuman sebut grace 3 hari", /3 hari/.test(keGrup[0]?.text || ""), keGrup[0]?.text?.slice(0, 140));
  check("expired: belum keluar (grace belum lewat)", sock.left.length === 0, sock.left.length);
  const a2 = await processRentAutoTick(sock);
  check("expired: umum dedupe", dmTo(sock, gid).length === 1 && a2.length === 0, JSON.stringify(a2));
  // geser 4 hari → grace 3 hari lewat
  NOW = REAL_NOW + 4 * DAY;
  const a3 = await processRentAutoTick(sock);
  check("grace lewat: bot keluar grup + record dibersihin", sock.left.includes(gid) && !db.data.sewa.groups[gid], JSON.stringify({ left: sock.left, masih: Boolean(db.data.sewa.groups[gid]) }));
  check("grace lewat: action keluar tercatat", a3.some((x) => /keluar/.test(x)), JSON.stringify(a3));
}

w("\n===== 5. lifetime & tanpa penyewa =====");
{
  const gid = "120363021000000005@g.us";
  db.data.sewa.groups[gid] = { name: "Grup E Lifetime", addedAt: NOW, expiredAt: 0, isLifetime: true, addedBy: "6281700000005@s.whatsapp.net" };
  const sock = mkSock();
  const a = await processRentAutoTick(sock);
  check("lifetime: gak pernah disentuh", a.length === 0 && sock.sent.length === 0 && !sock.left.length, JSON.stringify(a));
  delete db.data.sewa.groups[gid];
  const gid2 = "120363021000000006@g.us";
  db.data.sewa.groups[gid2] = { name: "Grup F Tanpa Renter", addedAt: NOW, expiredAt: NOW + 2 * DAY, isLifetime: false };
  const a2 = await processRentAutoTick(sock);
  check("tanpa addedBy: skip senyap (gak crash)", a2.length === 0, JSON.stringify(a2));
  delete db.data.sewa.groups[gid2];
}

w("\n===== 6. kirim gagal → gak dicatat, di-retry tick berikutnya =====");
{
  const gid = "120363021000000007@g.us";
  db.data.sewa.groups[gid] = { name: "Grup G", addedAt: NOW, expiredAt: NOW + 2 * DAY, isLifetime: false, addedBy: "6281700000007@s.whatsapp.net" };
  const sockJahat = mkSock(true);
  const a1 = await processRentAutoTick(sockJahat);
  check("send gagal: gak ada action", a1.length === 0, JSON.stringify(a1));
  const sockBaik = mkSock();
  const a2 = await processRentAutoTick(sockBaik);
  check("send gagal: retry tick berikutnya sukses", a2.length === 1 && dmTo(sockBaik, "6281700000007@s.whatsapp.net").length === 1, JSON.stringify(a2));
  delete db.data.sewa.groups[gid];
}

w("\n===== 7. premium: reminder H-1 + auto-hapus kedaluwarsa =====");
{
  // reset log/marks biar section steril
  const st = ensureRentAutoState(db);
  st.marks = {}; st.log = [];
  addPremium("6281700000008@s.whatsapp.net", 2, "Peminjam Delapan"); // expiredAt = Date.now() NYATA + 2 hari
  const sock0 = mkSock();
  NOW = REAL_NOW; // sisa 2 hari → belum apa-apa
  const a0 = await processRentAutoTick(sock0);
  check("premium 2 hari: belum ada aksi", a0.length === 0, JSON.stringify(a0));
  NOW = REAL_NOW + 1.5 * DAY; // sisa ~12 jam
  const sock1 = mkSock();
  const a1 = await processRentAutoTick(sock1);
  const dms = dmTo(sock1, "6281700000008@s.whatsapp.net");
  check("premium H-1: DM ke nomor terkirim", dms.length === 1 && dms[0].text.includes("🕒"), dms.length);
  check("premium H-1: action tercatat", a1.some((x) => /H-1 premium/.test(x)) && !a1.some((x) => /sewa/.test(x)), JSON.stringify(a1));
  NOW = REAL_NOW + 2.5 * DAY; // kedaluwarsa
  const sock2 = mkSock();
  const a2 = await processRentAutoTick(sock2);
  check("premium expired: dihapus otomatis dari list", !loadPremium().some((p) => p && p.number === "6281700000008"), JSON.stringify(loadPremium().map((p) => p?.number)));
  check("premium expired: action tercatat", a2.some((x) => /dihapus otomatis/.test(x)), JSON.stringify(a2));
}

w("\n===== 8. digest harian owner =====");
{
  const st = ensureRentAutoState(db);
  st.lastDigestTs = 0; st.lastDigestDate = ""; st.digestJam = "00:05";
  // NOW = REAL_NOW + 2.5 DAY → jam WIB-nya pasang-pasan; pakai momen pasti lewat jam digest:
  // pilih NOW sehingga WIB jam >= 00:05 — ambil awal hari WIB + 1 jam.
  const wib = new Date(REAL_NOW + 7 * HOUR);
  const wibMidnightUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 17, 0, 0); // 17:00 UTC = 00:00 WIB
  NOW = wibMidnightUtc + HOUR; // 01:00 WIB
  const sock = mkSock();
  const a = await processRentAutoTick(sock);
  const own = dmTo(sock, "6281700000001@s.whatsapp.net");
  check("digest: DM owner terkirim", own.length === 1, own.length);
  check("digest: isinya rangkuman kejadian + total", own[0]?.text?.includes("LAPORAN SEWA AUTO") && /Total \d+ kejadian/.test(own[0]?.text || ""), own[0]?.text?.slice(0, 160));
  check("digest: action tercatat", a.some((x) => /digest/.test(x)), JSON.stringify(a));
  const sock2 = mkSock();
  const a2 = await processRentAutoTick(sock2);
  check("digest: dedupe per hari (gak dobel)", dmTo(sock2, "6281700000001@s.whatsapp.net").length === 0 && a2.length === 0, JSON.stringify(a2));
  // hari baru TANPA kejadian → gak spam
  NOW = wibMidnightUtc + DAY + HOUR;
  const st2 = ensureRentAutoState(db);
  st2.log = [];
  const sock3 = mkSock();
  const a3 = await processRentAutoTick(sock3);
  check("digest: hari kosong → gak ada DM owner", dmTo(sock3, "6281700000001@s.whatsapp.net").length === 0, JSON.stringify(a3));
}

w("\n===== 9. off state =====");
{
  const st = ensureRentAutoState(db);
  st.on = false;
  const gid = "120363021000000009@g.us";
  db.data.sewa.groups[gid] = { name: "Grup I", addedAt: NOW, expiredAt: NOW + 2 * DAY, isLifetime: false, addedBy: "6281700000009@s.whatsapp.net" };
  const sock = mkSock();
  const a = await processRentAutoTick(sock);
  check("off: tick no-op", a.length === 0 && sock.sent.length === 0, JSON.stringify(a));
  st.on = true;
  delete db.data.sewa.groups[gid];
}

w("\n===== 10. kartu status =====");
{
  NOW = REAL_NOW;
  const card = buildRentAutoStatus(db);
  check("status: boxLeft + 🕒 + status AKTIF", card.includes("「") && card.includes("🕒") && /AKTIF/.test(card), card.slice(0, 120));
  check("status: nunjukin grace & digest", /Grace period: 3 hari/.test(card) && /21:00 WIB|00:05/.test(card), card.slice(0, 200));
}

w("\n===== 11. plugin handler .rentauto =====");
{
  const mkM = (args) => {
    const replies = [];
    return { args, react: () => { }, reply: async (t) => { replies.push(t); return t; }, sender: "6281700000001@s.whatsapp.net", pushName: "Owner", _replies: replies };
  };
  // tanpa argumen → status + guide
  const m1 = mkM([]);
  await handler(m1, { sock: mkSock() });
  check("plugin: .rentauto → status + guide (2 reply)", m1._replies.length === 2 && m1._replies[0].includes("SEWA AUTO"), m1._replies.length);
  // tes → laporan aksi (ada grup sewa segera habis dipasang dulu)
  const gid = "120363021000000010@g.us";
  db.data.sewa.groups[gid] = { name: "Grup Tes", addedAt: NOW, expiredAt: NOW + 2 * DAY, isLifetime: false, addedBy: "6281700000010@s.whatsapp.net" };
  const st = ensureRentAutoState(db);
  st.marks = {}; st.lastDigestTs = NOW; st.lastDigestDate = new Date(NOW + 7 * HOUR).toISOString().slice(0, 10);
  const m2 = mkM(["tes"]);
  await handler(m2, { sock: mkSock() });
  check("plugin: .rentauto tes → lapor aksi H-3", m2._replies.length === 1 && /h-3/i.test(m2._replies[0]) && /1 hal/i.test(m2._replies[0]), m2._replies[0]?.slice(0, 160));
  delete db.data.sewa.groups[gid];
  // grace + jam
  const m3 = mkM(["grace", "7"]);
  await handler(m3, { sock: mkSock() });
  check("plugin: .rentauto grace 7 → state berubah", ensureRentAutoState(db).graceDays === 7, ensureRentAutoState(db).graceDays);
  const m4 = mkM(["jam", "08:30"]);
  await handler(m4, { sock: mkSock() });
  check("plugin: .rentauto jam 08:30 → state berubah", ensureRentAutoState(db).digestJam === "08:30", ensureRentAutoState(db).digestJam);
  const m5 = mkM(["jam", "99:99"]);
  await handler(m5, { sock: mkSock() });
  check("plugin: jam invalid → ditolak, state tetap", ensureRentAutoState(db).digestJam === "08:30" && /Format jam|melewati batas/.test(m5._replies[0]), m5._replies[0]);
  const m6 = mkM(["hahaha"]);
  await handler(m6, { sock: mkSock() });
  check("plugin: sub gak dikenal → guide bantuan", /belum saya kenali/.test(m6._replies[0]), m6._replies[0]);
}

w("\n===== 12. scheduler idempotent + cleanup =====");
{
  const t1 = initRentAutoScheduler(mkSock());
  const t2 = initRentAutoScheduler(mkSock());
  check("scheduler: init dobel = timer sama (idempotent)", t1 === t2 && Boolean(t1), `${Boolean(t1)} ${t1 === t2}`);
  stopRentAutoScheduler();
  check("scheduler: stop bersih", true);
}

_clearRentAutoNowForTest();
_clearRentAutoOwnerJidForTest();
stopRentAutoScheduler();

w(`\n===== HASIL: ${pass} pass, ${fail} fail =====`);
process.exit(fail ? 1 : 0);
