// NOVA AI WHATSAPP BOT — E2E: CHAT ANONIM ANTAR MEMBER + GUARD LINK
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "anonchat-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/nova-anonchat.js");
const plug = await import(R + "/plugins/fun/vibychatanonymouschat.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

// seams: guard cepat (idle 200ms buat sweeper, flood 5000ms biar spam pasti keblok)
lib._setAnonTimingsForTest(200, 5000);

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
let reactions = [];
const mkM = (over = {}) => ({
  text: "", args: [], command: "vibychatanonymouschat", prefix: ".", chat: "jid-x@s.whatsapp.net",
  sender: "jid-x@s.whatsapp.net", isGroup: false, mtype: "conversation",
  react: async (e) => { reactions.push(e); },
  reply: async (x) => { sent.push({ jid: "reply-" + (mkM.currentSender || "x"), payload: { text: String(x) } }); },
  ...over,
});
mkM.currentSender = null;

const A = "62811usera@s.whatsapp.net";
const B = "62812userb@s.whatsapp.net";
const C = "62813userc@s.whatsapp.net";
const OWNER = "628174887770@s.whatsapp.net";

const db = getDatabase();
// set owner buat laporan guard
const cfg = await import(R + "/config.js");
const origOwner = cfg.config.owner;
cfg.config.owner = { number: [OWNER] };

const run = (sender, over = {}) => {
  mkM.currentSender = sender;
  const m = mkM({ sender, chat: sender, ...over });
  return plug.handler(m, { sock: mkSock(), db });
};
const relay = async (sender, text, over = {}) => {
  mkM.currentSender = sender;
  const m = mkM({ sender, chat: sender, mtype: "conversation", text, ...over });
  return plug.answerHandler(m, mkSock());
};
const msgsTo = (jid) => sent.filter((s) => s.jid === jid).map((s) => sc(s.payload?.text || s.payload?.caption || ""));
const repliesOf = (sender) => sent.filter((s) => s.jid === "reply-" + sender).map((s) => sc(s.payload?.text || ""));
const lastReplyOf = (sender) => repliesOf(sender)[repliesOf(sender).length - 1] || "";
const dmOwner = () => msgsTo(OWNER);
const resetFlood = (jid) => { const s = lib.getAnon(db).sessions[jid]; if (s) { s.lastRelayAt = 0; db.save(); } };

console.log("— section 1: mulai & pairing —");
{
  await run(A);
  t("1a. user A masuk daftar tunggu (reaksi 🔍)", lastReplyOf(A).includes("daftar tunggu") && reactions.includes("🔍"), lastReplyOf(A));
  t("1b. queue tercatat 1 orang", lib.getAnon(db).queue.length === 1 && lib.getAnon(db).queue[0].jid === A, JSON.stringify(lib.getAnon(db).queue));
  await run(A);
  t("1c. A nunggu lagi → gak dobel di queue", lastReplyOf(A).includes("sudah masuk daftar tunggu") && lib.getAnon(db).queue.length === 1, lastReplyOf(A));
  reactions = [];
  await run(B);
  const a = lib.getAnon(db).sessions;
  t("1d. B masuk → langsung terpasang sama A", a[A]?.partner === B && a[B]?.partner === A, JSON.stringify(a));
  t("1e. kedua pihak dapat info pairing + info idle 1 jam", lastReplyOf(B).includes("terhubung sama stranger") && lastReplyOf(B).includes("1 jam") && lastReplyOf(B).includes("link juga boleh") && msgsTo(A).some((x) => x.includes("terhubung") && x.includes("1 jam")), lastReplyOf(B));
  t("1f. queue kosong setelah pairing", lib.getAnon(db).queue.length === 0, lib.getAnon(db).queue.length);
  t("1g. reaksi ⚡ saat pairing", reactions.includes("⚡"), reactions.join(","));
}

console.log("— section 1b: alias lama tetap jalan —");
{
  sent.length = 0;
  // C (gak ada di sesi) pakai alias LAMA .anonymouschat — harus tetap jalan
  mkM.currentSender = C;
  await plug.handler(mkM({ sender: C, chat: C, command: "anonymouschat", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("1b-a. alias .anonymouschat lama tetap dikenal (C masuk daftar tunggu)", lastReplyOf(C).includes("daftar tunggu"), lastReplyOf(C));
  // keluarin C dari queue — sesi A-B biar tetap utuh buat section 2
  const a1b = lib.getAnon(db);
  a1b.queue = a1b.queue.filter((q) => q.jid !== C);
  db.save();
  t("1b-b. pluginConfig.name = vibychatanonymouschat", (await import(R + "/plugins/fun/vibychatanonymouschat.js")).config.name === "vibychatanonymouschat");
  t("1b-c. sesi A-B gak keganggu", !!lib.getAnon(db).sessions[A] && !!lib.getAnon(db).sessions[B], JSON.stringify(lib.getAnon(db).sessions));
}

console.log("— section 2: relay pesan dua arah —");
{
  sent.length = 0;
  const handled = await relay(A, "hai, apa kabar?");
  t("2a. pesan A diteruskan ke B (anonim)", handled === true && msgsTo(B).some((x) => x.includes("hai, apa kabar?")), JSON.stringify(msgsTo(B)));
  t("2b. pesan relay gak nyebut nomor A", !msgsTo(B).join(" ").includes("62811"), JSON.stringify(msgsTo(B)));
  await relay(B, "kabar baik nih!");
  t("2c. balasan B diteruskan ke A", msgsTo(A).some((x) => x.includes("kabar baik nih!")), JSON.stringify(msgsTo(A)));
  const handledNo = await relay(C, "halo");
  t("2d. user C (bukan peserta) gak ke-relay", handledNo === false, handledNo);
}

console.log("— section 3: ATURAN BARU — link boleh, tetap diteruskan —");
{
  sent.length = 0;
  resetFlood(A);
  const handled = await relay(A, "cek ini guys https://contoh.com/video");
  t("3a. link DIKIRIM → di-handle & diteruskan normal", handled === true, handled);
  t("3b. sesi TETAP TERBUKA (gak ditutup)", !!lib.getAnon(db).sessions[A] && !!lib.getAnon(db).sessions[B], JSON.stringify(Object.keys(lib.getAnon(db).sessions)));
  t("3c. link nyampe ke partner", msgsTo(B).some((x) => x.includes("contoh.com")), JSON.stringify(msgsTo(B)));
  t("3d. owner GAK dapat laporan apa pun", dmOwner().length === 0, JSON.stringify(dmOwner()));
  // varian link lain juga lolos + diteruskan
  const variants = ["wa.me/628123", "kunjungi www.hadiah.com", "daftar di premku.info ya", "bit.ly/xx99"];
  for (const v of variants) {
    sent.length = 0;
    resetFlood(A);
    await relay(A, v);
    t(`3e-${v.slice(0, 16)} → diteruskan & sesi tetap`, msgsTo(B).some((x) => x.includes(v.split(" ").pop())) && !!lib.getAnon(db).sessions[A], v);
  }
}

console.log("— section 4: media & flood guard —");
{
  await run(A); await run(B); // pasang ulang sesi A-B (loop 3g menutup sesi terakhir)
  sent.length = 0;
  await relay(A, "teks normal dulu", { mtype: "conversation" });
  await relay(A, "sticker", { mtype: "stickerMessage", text: "" });
  t("4a. media ditolak, gak diteruskan", repliesOf(A).some((x) => x.includes("media")) && !msgsTo(B).some((x) => x.includes("sticker")), JSON.stringify(repliesOf(A)));
  const before = msgsTo(B).length;
  await relay(A, "spammm");
  await relay(A, "spammm");
  await relay(A, "spammm");
  t("4b. flood guard: spam cepet gak semua diteruskan", msgsTo(B).length - before <= 2, msgsTo(B).length - before);
}

console.log("— section 5: skip & stop —");
{
  sent.length = 0;
  await run(C);
  await run(A); // A skip
  // A masih di sesi sama B? setelah section 4 ya
  const sessBefore = !!lib.getAnon(db).sessions[A];
  await plug.handler(mkM({ sender: A, chat: A, command: "vibychatskip", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5a. skip: sesi A-B putus + A langsung re-pair sama C", sessBefore && lib.getAnon(db).sessions[A]?.partner === C, JSON.stringify(lib.getAnon(db).sessions));
  t("5b. B dapat kabar partner skip", msgsTo(B).some((x) => x.includes("diputuskan") || x.includes("keluar")), JSON.stringify(msgsTo(B)));
  sent.length = 0;
  await plug.handler(mkM({ sender: A, chat: A, command: "vibychatstop", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5c. stop: A keluar dari queue", !lib.getAnon(db).queue.some((q) => q.jid === A) && !lib.getAnon(db).sessions[A], JSON.stringify(lib.getAnon(db).queue));
}

console.log("— section 6: grup ditolak + sesi gak dibocorin —");
{
  sent.length = 0;
  await plug.handler(mkM({ sender: A, chat: "123@g.us", isGroup: true, command: "vibychatanonymouschat", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("6a. dipakai di grup → disuruh DM bot", sent.some((s) => sc(s.payload?.text || "").includes("dm bot")), JSON.stringify(sent.map((s) => sc(s.payload?.text || "").slice(0, 60))));
  // relay dari sesi yang kirim di grup → gak diteruskan
  await run(A); await run(B);
  sent.length = 0;
  const grp = mkM({ sender: A, chat: "123@g.us", isGroup: true, mtype: "conversation", text: "pesan grup", react: async () => {} });
  const handled = await plug.answerHandler(grp, mkSock());
  t("6b. pesan sesi di grup gak di-relay", handled === false && msgsTo(B).length === 0, handled);
  // pesan diawali prefix "." gak di-relay (diproses command normal)
  const cmdRelay = await relay(A, ".menu");
  t("6c. teks command (awalan .) gak di-relay", cmdRelay === false, cmdRelay);
}

console.log("— section 7: sweeper timeout idle —");
{
  sent.length = 0;
  // paksa lastActive basi
  const a = lib.getAnon(db);
  a.sessions[A].lastActive = Date.now() - 99999;
  db.save();
  const sock = mkSock();
  await lib.initAnonChatSweeper(sock, 100);
  await new Promise((r) => setTimeout(r, 450));
  t("7a. sesi idle ditutup otomatis sama sweeper", !lib.getAnon(db).sessions[A] && !lib.getAnon(db).sessions[B], JSON.stringify(lib.getAnon(db).sessions));
  t("7b. kedua pihak dapet kabar timeout 1 jam", msgsTo(A).some((x) => x.includes("1 jam")) && msgsTo(B).some((x) => x.includes("1 jam")), JSON.stringify(msgsTo(A)));
  lib._stopAnonSweeperForTest();
  // queue kedaluwarsa dibuang
  const a2 = lib.getAnon(db);
  a2.queue.push({ jid: "62899old@s.whatsapp.net", at: Date.now() - 999999999 });
  a2.queue.push({ jid: C, at: Date.now() });
  db.save();
  await lib.initAnonChatSweeper(sock, 100);
  await new Promise((r) => setTimeout(r, 450));
  t("7c. antrean kedaluwarsa dibuang, yang baru tetap", !lib.getAnon(db).queue.some((q) => q.jid === "62899old@s.whatsapp.net") && lib.getAnon(db).queue.some((q) => q.jid === C), JSON.stringify(lib.getAnon(db).queue));
  lib._stopAnonSweeperForTest();
}

lib._resetAnonTimingsForTest();
cfg.config.owner = origOwner;
fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
