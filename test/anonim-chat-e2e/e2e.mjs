// RARA AI - MULTI DEVICE — E2E: Chat Anonim & Anonymous (kategori baru .anonim)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(extra).slice(0, 260) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "anonim-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/rara-anonim-engine.js");
const plug = await import(R + "/plugins/anonim/anonim.js");
const premiumDb = await import(R + "/src/lib/rara-premium-db.js");

lib._setAnonimTimingsForTest(200, 5000, 2000); // idle 200ms, flood 5000ms, queue-timeout 2000ms

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return { key: { id: "m1", remoteJid: jid } }; },
});
let reactions = [];
const mkM = (over = {}) => ({
  text: "", args: [], command: "anonim", prefix: ".", chat: "x@s.whatsapp.net",
  sender: "x@s.whatsapp.net", isGroup: false, mtype: "conversation",
  react: async (e) => { reactions.push(e); },
  reply: async (x) => { sent.push({ jid: "reply-" + mkM.currentSender, payload: { text: String(x) } }); },
  ...over,
});
mkM.currentSender = null;

const A = "62811usera@s.whatsapp.net";
const B = "62812userb@s.whatsapp.net";
const C = "62813userc@s.whatsapp.net";
const OWNER = "628174887770@s.whatsapp.net";

const db = getDatabase();
const cfg = await import(R + "/config.js");
cfg.config.owner = { number: [OWNER] };

const run = (sender, args = [], over = {}) => {
  mkM.currentSender = sender;
  const m = mkM({ sender, chat: over.chat ?? sender, args, ...over });
  return plug.handler(m, { sock: mkSock(), db });
};
const relay = (sender, text, over = {}) => {
  mkM.currentSender = sender;
  const m = mkM({ sender, chat: sender, mtype: "conversation", text, ...over });
  return plug.answerHandler(m, mkSock());
};
const msgsTo = (jid) => sent.filter((s) => s.jid === jid).map((s) => (s.payload?.text || "").toLowerCase());
const repliesOf = (sender) => sent.filter((s) => s.jid === "reply-" + sender).map((s) => (s.payload?.text || "").toLowerCase());
const lastReplyOf = (sender) => repliesOf(sender)[repliesOf(sender).length - 1] || "";
const dmOwner = () => msgsTo(OWNER);
const resetFlood = (jid) => { const s = lib.getAnonim(db).sessions[jid]; if (s) { s.lastRelayAt = 0; db.save(); } };

const register = async (jid, { name = "Budi", gender = "L", age = "25", location = "Jakarta", refCode = "skip" } = {}) => {
  await run(jid, ["daftar"]);
  await relay(jid, name);
  await relay(jid, gender);
  await relay(jid, String(age));
  await relay(jid, location);
  await relay(jid, refCode); // step referral (owner 6 Okt: ajak teman dapat premium gratis)
};

console.log("— section 1: welcome & help (belum daftar) —");
{
  sent.length = 0;
  await run(A, []);
  t("1a. welcome nunjukin ajakan daftar", lastReplyOf(A).includes("daftar") && lastReplyOf(A).includes("anonim"), lastReplyOf(A));
  sent.length = 0;
  await run(A, ["help"]);
  t("1b. help lengkap semua subcommand", ["daftar", "find", "next", "stop", "settings", "language", "premium", "statistik", "report", "help"].every((k) => lastReplyOf(A).includes(k)), lastReplyOf(A));
  sent.length = 0;
  await run(A, ["find"]);
  t("1c. find ditolak kalau belum daftar", lastReplyOf(A).includes("daftar"), lastReplyOf(A));
}

console.log("— section 2: registrasi step-by-step (termasuk step referral) —");
{
  sent.length = 0;
  await run(A, ["daftar"]);
  t("2a. step pertama nanya nama", lastReplyOf(A).includes("nama"), lastReplyOf(A));
  await relay(A, "Budi");
  t("2b. step kedua nanya gender", lastReplyOf(A).includes("laki") || lastReplyOf(A).includes("l"), lastReplyOf(A));
  await relay(A, "X"); // invalid gender
  t("2c. gender invalid ditolak + minta ulang", lastReplyOf(A).includes("l") && lastReplyOf(A).includes("p"), lastReplyOf(A));
  await relay(A, "L");
  t("2d. step ketiga nanya umur", lastReplyOf(A).includes("umur"), lastReplyOf(A));
  await relay(A, "5"); // invalid age (<13)
  t("2e. umur invalid ditolak", lastReplyOf(A).includes("valid") || lastReplyOf(A).includes("umur"), lastReplyOf(A));
  await relay(A, "25");
  t("2f. step keempat nanya lokasi", lastReplyOf(A).includes("lokasi"), lastReplyOf(A));
  await relay(A, "Jakarta");
  t("2g. step kelima nanya kode referral", lastReplyOf(A).includes("referral"), lastReplyOf(A));
  await relay(A, "skip");
  t("2h. pendaftaran selesai + profil muncul", lastReplyOf(A).includes("selesai") && lastReplyOf(A).includes("budi") && lastReplyOf(A).includes("jakarta"), lastReplyOf(A));
  t("2i. profil tersimpan di db + refCode ter-generate", lib.getProfile(db, A)?.name === "Budi" && lib.getProfile(db, A)?.age === 25 && !!lib.getProfile(db, A)?.refCode, JSON.stringify(lib.getProfile(db, A)));
  sent.length = 0;
  await run(A, ["daftar"]);
  t("2j. daftar ulang ditolak (udah terdaftar)", lastReplyOf(A).includes("terdaftar"), lastReplyOf(A));
}

console.log("— section 3: daftar BISA dari grup, chat relay/find TIDAK —");
{
  sent.length = 0;
  await run(B, ["daftar"], { isGroup: true, chat: "123@g.us" });
  t("3a. daftar dari grup diterima (bukan ditolak DM-only)", lastReplyOf(B).includes("nama"), lastReplyOf(B));
  await relay(B, "Siti", { isGroup: true, chat: "123@g.us" });
  await relay(B, "P", { isGroup: true, chat: "123@g.us" });
  await relay(B, "22", { isGroup: true, chat: "123@g.us" });
  await relay(B, "Bandung", { isGroup: true, chat: "123@g.us" });
  await relay(B, "skip", { isGroup: true, chat: "123@g.us" });
  t("3b. profil B tersimpan walau dari grup", lib.getProfile(db, B)?.name === "Siti", JSON.stringify(lib.getProfile(db, B)));
  sent.length = 0;
  await run(B, ["find"], { isGroup: true, chat: "123@g.us" });
  t("3c. find ditolak di grup (DM only)", lastReplyOf(B).includes("dm"), lastReplyOf(B));
}

console.log("— section 4: referral GACHA (hadiah random: limit atau premium) —");
{
  const refOfA = lib.getProfile(db, A).refCode;
  const D1 = "62899ref1@s.whatsapp.net", D2 = "62899ref2@s.whatsapp.net", D3 = "62899ref3@s.whatsapp.net";

  // D1 daftar pakai kode A, RNG dipaksa roll=0 → tier pertama (+3 limit, chance 0-40)
  lib._setAnonimRngForTest(() => 0.0);
  sent.length = 0;
  await register(D1, { name: "Ref1", refCode: refOfA });
  lib._resetAnonimRngForTest();
  t("4a. referral valid tercatat (bukan invalid)", lastReplyOf(D1).includes("diterima") && lastReplyOf(D1).includes("referral"), lastReplyOf(D1));
  t("4b. invitedCount A bertambah", lib.getProfile(db, A).stats.invitedCount === 1, lib.getProfile(db, A).stats);
  t("4c. gacha tier +3 limit diterapkan ke A (bonusFind hari ini)", lib.getProfile(db, A).bonusFind.amount === 3, lib.getProfile(db, A).bonusFind);
  t("4d. A dapat notif gacha referral", msgsTo(A).some((x) => x.includes("gacha") && x.includes("referral")), msgsTo(A));

  // D2 daftar pakai kode A, RNG dipaksa roll=75 → tier +10 limit (chance 70-85)
  lib._setAnonimRngForTest(() => 0.75);
  await register(D2, { name: "Ref2", refCode: refOfA });
  lib._resetAnonimRngForTest();
  t("4e. gacha ke-2 nambahin bonus limit (3+10=13), BUKAN diganti", lib.getProfile(db, A).bonusFind.amount === 13, lib.getProfile(db, A).bonusFind);
  t("4f. belum ada bonus premium (kedua roll kena tier limit)", lib.getProfile(db, A).premiumBonusUntil === 0, lib.getProfile(db, A).premiumBonusUntil);

  // kode referral invalid → gak ngaruh ke gacha A, tetap lanjut daftar
  await register(D3, { name: "Ref3", refCode: "KODESALAH999" });
  t("4g. kode referral invalid tetap lanjut daftar (bukan diblokir)", !!lib.getProfile(db, D3), lastReplyOf(D3));
  t("4h. referral invalid ngasih notice tapi tetap selesai", lastReplyOf(D3).includes("gak ketemu") || lastReplyOf(D3).includes("tanpa referral"), lastReplyOf(D3));
  t("4i. referral invalid gak nambahin invitedCount A", lib.getProfile(db, A).stats.invitedCount === 2, lib.getProfile(db, A).stats.invitedCount);

  // D4 daftar pakai kode A, RNG dipaksa roll=97 → tier JACKPOT premium 72 jam (chance 95-100)
  const D4 = "62899ref4@s.whatsapp.net";
  lib._setAnonimRngForTest(() => 0.97);
  sent.length = 0;
  await register(D4, { name: "Ref4", refCode: refOfA });
  lib._resetAnonimRngForTest();
  t("4j. gacha JACKPOT → bonus premium 72 jam diberikan ke A", lib.getProfile(db, A).premiumBonusUntil > Date.now(), lib.getProfile(db, A).premiumBonusUntil);
  t("4k. A dapat notif gacha nyebut jackpot/premium", msgsTo(A).some((x) => x.includes("jackpot") || (x.includes("premium") && x.includes("hari"))), msgsTo(A));
  t("4l. statistik A nunjukin bonus limit hari ini", (await (async () => { sent.length = 0; await run(A, ["statistik"]); return lastReplyOf(A); })()).includes("bonus limit"));
}

console.log("— section 5: find & pairing —");
{
  await register(C, { name: "Caca", gender: "P", age: "30", location: "Surabaya" });
  sent.length = 0;
  await run(A, ["find"]); // A sekarang premium via bonus referral
  t("5a. user A langsung dapat partner ATAU masuk antrean (gak ada ❌ error)", lastReplyOf(A).includes("daftar tunggu") || lastReplyOf(A).includes("ditemukan"), lastReplyOf(A));
  // pastikan A masuk antrean dulu buat tes pairing C bersih; kalau A sudah ketemu partner (D1-D4 juga nyari), skip ke next sesi
  if (!lib.getAnonim(db).queue.some((q) => q.jid === A) && !lib.getAnonim(db).sessions[A]) {
    await run(A, ["find"]);
  }
  sent.length = 0;
  await run(C, ["find"]);
  t("5b. C berhasil find (dapat partner ATAU masuk antrean)", lastReplyOf(C).includes("ditemukan") || lastReplyOf(C).includes("daftar tunggu"), lastReplyOf(C));
}

console.log("— section 6: relay pesan anonim + badge VIP —");
{
  // pastikan A & C satu sesi (reset biar deterministik)
  const a = lib.getAnonim(db);
  for (const j of Object.keys(a.sessions)) delete a.sessions[j];
  a.queue = [];
  db.save();
  await run(A, ["find"]);
  await run(C, ["find"]);
  t("6-setup. A & C ke-pairing", a.sessions[A]?.partner === C && a.sessions[C]?.partner === A, JSON.stringify(a.sessions));

  sent.length = 0;
  await relay(A, "Halo stranger!");
  t("6a. pesan A diteruskan ke C (anonim, nama C gak kesebut)", msgsTo(C).some((x) => x.includes("halo stranger")) && !msgsTo(C).some((x) => x.includes("caca")), msgsTo(C));
  t("6b. badge VIP 🏅 muncul karena A premium (bonus referral)", msgsTo(C).some((x) => x.includes("🏅")), msgsTo(C));
  t("6c. messagesSent A bertambah", lib.getProfile(db, A).stats.messagesSent >= 1, lib.getProfile(db, A).stats);
  sent.length = 0;
  resetFlood(A);
  await relay(A, ".anonim help"); // command → gak direlay, dispatch normal command
  t("6d. teks berawalan prefix command TIDAK direlay sebagai chat", !msgsTo(C).some((x) => x.includes("anonim help")));
  sent.length = 0;
  resetFlood(A);
  await relay(A, "spam1");
  await relay(A, "spam2"); // langsung lagi → kena flood guard (belum di-reset)
  t("6e. flood guard nolak pesan terlalu rapat", msgsTo(C).filter((x) => x.includes("spam")).length === 1, msgsTo(C));
  sent.length = 0;
  resetFlood(A);
  await relay(A, "", { mtype: "imageMessage" });
  t("6f. media ditolak, gak diteruskan", !msgsTo(C).length && lastReplyOf(A).includes("media"), { lastReplyOf: lastReplyOf(A), toC: msgsTo(C) });
}

console.log("— section 7: next & stop + prompt rating —");
{
  sent.length = 0;
  await run(A, ["next"]);
  t("7a. next tutup sesi lama + langsung masuk antrean/cari lagi", lastReplyOf(A).includes("daftar tunggu") || lastReplyOf(A).includes("ditemukan"), lastReplyOf(A));
  t("7b. partner lama (C) dapat notif obrolan diakhiri + diminta rating", msgsTo(C).some((x) => (x.includes("mengakhiri") || x.includes("diganti")) && x.includes("rating")), msgsTo(C));
  t("7c. sesi C sudah terhapus dari db", !lib.getAnonim(db).sessions[C]);

  // C jawab rating 👍 buat partner lama (A)
  sent.length = 0;
  const ratedBefore = lib.getProfile(db, A).stats.ratingUp;
  await relay(C, "👍");
  t("7d. rating 👍 diterima & dicatat ke profil A (target)", lib.getProfile(db, A).stats.ratingUp === ratedBefore + 1, lib.getProfile(db, A).stats.ratingUp);
  t("7e. ratedCount C (orang yang dinilai) bertambah", lib.getProfile(db, C).stats.ratedCount >= 1, lib.getProfile(db, C).stats.ratedCount);
  t("7f. ada konfirmasi makasih rating", lastReplyOf(C).includes("makasih"), lastReplyOf(C));

  sent.length = 0;
  await run(A, ["stop"]);
  t("7g. stop keluar dari antrean/sesi", lastReplyOf(A).includes("berhenti") || lastReplyOf(A).includes("dihentikan") || lastReplyOf(A).includes("daftar tunggu"), lastReplyOf(A));
  t("7h. A gak ada lagi di sesi ataupun antrean", !lib.getAnonim(db).sessions[A] && !lib.getAnonim(db).queue.some((q) => q.jid === A));
}

console.log("— section 8: report + auto-ban —");
{
  // re-pairing A & C buat tes report
  const a = lib.getAnonim(db);
  for (const j of Object.keys(a.sessions)) delete a.sessions[j];
  a.queue = []; db.save();
  await run(A, ["find"]);
  await run(C, ["find"]);
  sent.length = 0;
  await run(A, ["report"]);
  t("8a. report tanpa alasan ditolak, minta alasan", lastReplyOf(A).includes("alasan"), lastReplyOf(A));
  sent.length = 0;
  await run(A, ["report", "spam", "jorok"]);
  t("8b. report dengan alasan diterima", lastReplyOf(A).includes("diterima") || lastReplyOf(A).includes("terima"), lastReplyOf(A));
  t("8c. report tersimpan di db", lib.getAnonim(db).reports.some((r) => r.reporter === A && r.reported === C));
  t("8d. owner dapat notif laporan", dmOwner().some((x) => x.includes("laporan")), dmOwner());

  // ulang report dari user lain² sampai 5x → auto-ban C
  for (let i = 0; i < 4; i++) {
    const u = `62899fake${i}@s.whatsapp.net`;
    lib.getAnonim(db).sessions[u] = { partner: C, startedAt: Date.now(), lastActive: Date.now(), lastRelayAt: 0 };
    lib.getAnonim(db).profiles[u] = lib.getAnonim(db).profiles[u] || { name: "F" + i, gender: "L", age: 20, location: "X", settings: {}, stats: {} };
    db.save();
    await run(u, ["report", "jorok juga"]);
  }
  t("8e. partner C ter-auto-ban setelah 5x laporan", lib.getProfile(db, C)?.banned === true, lib.getProfile(db, C));
  sent.length = 0;
  delete lib.getAnonim(db).sessions[A]; delete lib.getAnonim(db).sessions[C]; db.save();
  await run(C, ["find"]);
  t("8f. user yang banned ditolak nyari partner", lastReplyOf(C).includes("blokir") || lastReplyOf(C).includes("diblokir"), lastReplyOf(C));
}

console.log("— section 9: settings versi lengkap (gender sendiri + minat FREE, filter pencarian PREMIUM) —");
{
  const G = "628995551234@s.whatsapp.net"; // WAJIB nomor murni digit — isPremium() strip non-digit (bukan jid palsu beralpha)
  await register(G, { name: "Gilang" });
  sent.length = 0;
  await run(G, ["settings"]);
  const disp0 = lastReplyOf(G);
  t("9a. tampilan settings lengkap: gender/mencari/umur/lokasi/minat/bahasa", ["gender", "mencari", "umur partner", "lokasi partner", "minat", "bahasa"].every((k) => disp0.includes(k)), disp0);
  t("9b. non-premium: baris mencari/umur/lokasi dikunci (premium)", disp0.includes("premium"), disp0);

  // FREE: ganti gender sendiri (bukan filter) — gak butuh premium
  sent.length = 0;
  await run(G, ["settings", "gender", "P"]);
  t("9c. ganti gender sendiri FREE (bukan filter, gak kena lock)", lastReplyOf(G).includes("diubah") && !lastReplyOf(G).includes("premium"), lastReplyOf(G));
  t("9d. gender profil (bukan settings.filterGender) yang berubah", lib.getProfile(db, G)?.gender === "P");

  // FREE: minat
  sent.length = 0;
  await run(G, ["settings", "minat", "musik,", "game,", "film"]);
  t("9e. minat tersimpan FREE", lastReplyOf(G).includes("disimpan") && lib.getProfile(db, G)?.interests?.includes("musik"), lib.getProfile(db, G)?.interests);

  // PREMIUM ONLY: filter pencarian "cari" (dulu namanya "gender", sekarang beda dari gender sendiri)
  sent.length = 0;
  await run(G, ["settings", "cari", "L"]);
  t("9f. non-premium gak bisa apply filter cari (pencarian partner)", lastReplyOf(G).includes("premium"), lastReplyOf(G));

  // jadikan G premium LEWAT PATH ASLI isPremium (bukan bonus referral)
  premiumDb.addPremium(G, 30, "TestUser");
  sent.length = 0;
  await run(G, ["settings", "cari", "L"]);
  t("9g. user premium (isPremium asli) bisa apply filter cari", lastReplyOf(G).includes("disimpan"), lastReplyOf(G));
  t("9h. filter tersimpan di profil (settings.filterGender, BUKAN gender sendiri)", lib.getProfile(db, G)?.settings?.filterGender === "L" && lib.getProfile(db, G)?.gender === "P");
  sent.length = 0;
  await run(G, ["settings", "umur", "20", "30"]);
  t("9i. filter umur tersimpan", lib.getProfile(db, G)?.settings?.filterAgeMin === 20 && lib.getProfile(db, G)?.settings?.filterAgeMax === 30, lastReplyOf(G));
  sent.length = 0;
  await run(G, ["settings", "reset"]);
  t("9j. reset filter balik null (minat & gender sendiri TETAP, gak kehapus)", lib.getProfile(db, G)?.settings?.filterGender === null && lib.getProfile(db, G)?.interests?.includes("musik") && lib.getProfile(db, G)?.gender === "P", JSON.stringify(lib.getProfile(db, G)));
  sent.length = 0;
  await run(G, ["settings"]);
  t("9k. tampilan settings nunjukin gender P & minat tersimpan setelah reset filter", lastReplyOf(G).includes("perempuan") && lastReplyOf(G).includes("musik"), lastReplyOf(G));
}

console.log("— section 10: language, premium info & statistik —");
{
  sent.length = 0;
  await run(A, ["language", "en"]);
  t("10a. ganti bahasa ke en tersimpan", lib.getProfile(db, A)?.lang === "en", lastReplyOf(A));
  sent.length = 0;
  await run(A, ["language", "xx"]);
  t("10b. bahasa invalid ditolak", lastReplyOf(A).includes("id") || lastReplyOf(A).includes("en"), lastReplyOf(A));
  sent.length = 0;
  await run(A, ["premium"]);
  t("10c. premium info nunjukin status aktif (bonus referral) + kode referral sendiri", lastReplyOf(A).includes("aktif") && lastReplyOf(A).includes("kode referral"), lastReplyOf(A));
  sent.length = 0;
  await run(A, ["statistik"]);
  const stA = lastReplyOf(A);
  t("10d. statistik nunjukin semua field (obrolan/pesan/rating/teman/status/nilai)", ["total obrolan", "pesan terkirim", "rating", "teman diundang", "status", "kamu nilai"].every((k) => stA.includes(k)), stA);
  t("10e. statistik status premium kebaca benar", stA.includes("premium"), stA);
}

console.log("— section 11: bataldaftar —");
{
  sent.length = 0;
  await run(B, ["bataldaftar"], { isGroup: true, chat: "123@g.us" }); // bataldaftar juga boleh dari grup
  t("11a. bataldaftar berhasil (profil kehapus)", !lib.getProfile(db, B), lastReplyOf(B));
  sent.length = 0;
  await run(B, ["bataldaftar"], { isGroup: true, chat: "123@g.us" });
  t("11b. bataldaftar dobel ditolak (udah gak terdaftar)", lastReplyOf(B).includes("belum terdaftar"), lastReplyOf(B));
}

console.log("— section 12: limit harian non-premium —");
{
  const H = "62899limituser@s.whatsapp.net";
  await register(H, { name: "Hadi" });
  for (let i = 0; i < 15; i++) {
    await run(H, ["find"]);
    await run(H, ["stop"]);
  }
  sent.length = 0;
  await run(H, ["find"]);
  t("12a. limit harian (15x) non-premium kena stop", lastReplyOf(H).includes("limit"), lastReplyOf(H));
}

console.log("— section 13: idle sweeper —");
{
  const I = "62899idlea@s.whatsapp.net", J = "62899idleb@s.whatsapp.net";
  await register(I, { name: "Ika" });
  await register(J, { name: "Jeni", gender: "P" });
  await run(I, ["find"]);
  await run(J, ["find"]);
  t("13a. I & J ke-pairing", lib.getAnonim(db).sessions[I]?.partner === J);
  // paksa lastActive expired (idle 200ms di seam)
  const a = lib.getAnonim(db);
  a.sessions[I].lastActive = Date.now() - 1000;
  a.sessions[J].lastActive = Date.now() - 1000;
  db.save();
  await lib.initAnonimSweeper(mkSock(), 50);
  await new Promise((r) => setTimeout(r, 220));
  lib._stopAnonimSweeperForTest();
  t("13b. sesi idle otomatis ditutup oleh sweeper", !lib.getAnonim(db).sessions[I] && !lib.getAnonim(db).sessions[J]);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
