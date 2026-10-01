// RARA AI WHATSAPP BOT — E2E: CHATIB LOBBY (ruang obrol anonim multi-user + guard)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(extra).slice(0, 300) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatib-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/rara-chatib-lobby.js");
const plug = await import(R + "/plugins/fun/chatiblobby.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

lib._setChatibTimingsForTest(200, 5000, 3); // idle 200ms, flood 5s, max member 3

const sent = [];
const mkSock = () => ({ sendMessage: async (jid, payload) => { sent.push({ jid, text: String(payload?.text || "") }); return {}; } });
let reactions = [];
const mkM = (over = {}) => ({
  text: "", args: [], command: "chatiblobby", prefix: ".", chat: "x@s.whatsapp.net",
  sender: "x@s.whatsapp.net", isGroup: false, mtype: "conversation",
  react: async (e) => { reactions.push(e); },
  reply: async (x) => { sent.push({ jid: "reply-" + (mkM.currentSender || "x"), text: String(x) }); },
  ...over,
});
mkM.currentSender = "x";

const A = "6281111111a@s.whatsapp.net";
const B = "6281222222b@s.whatsapp.net";
const C = "6281333333c@s.whatsapp.net";
const D = "6281444444d@s.whatsapp.net";
const OWNER = "628174887770@s.whatsapp.net";

const db = getDatabase();
const cfg = await import(R + "/config.js");
const origOwner = cfg.config.owner;
cfg.config.owner = { number: [OWNER] };

const run = (sender, over = {}) => {
  mkM.currentSender = sender;
  return plug.handler(mkM({ sender, chat: sender, ...over }), { sock: mkSock(), db });
};
const relay = async (sender, text, over = {}) => {
  mkM.currentSender = sender;
  return plug.answerHandler(mkM({ sender, chat: sender, mtype: "conversation", text, ...over }), mkSock());
};
const msgsTo = (jid) => sent.filter((s) => s.jid === jid).map((s) => sc(s.text));
const repliesOf = (sender) => sent.filter((s) => s.jid === "reply-" + sender).map((s) => sc(s.text));
const lastReplyOf = (sender) => repliesOf(sender)[repliesOf(sender).length - 1] || "";
const nickOf = (jid) => lib.getLobby(db).members[jid]?.nick || "";
const normC = () => nickOf(C).replace(/\s+/g, "").toLowerCase();
const onlineCount = () => Object.keys(lib.getLobby(db).members).length;

console.log("— section 1: join lobby + nickname —");
{
  reactions = [];
  await run(A, { args: ["KucingGalak"] });
  const lobby = lib.getLobby(db);
  t("1a. A masuk lobby dengan nickname pilihan", !!lobby.members[A] && lobby.members[A].nick === "KucingGalak", nickOf(A));
  t("1b. dapet aturan + info idle 1 jam", lastReplyOf(A).includes("1 jam") && lastReplyOf(A).includes("nickname"), lastReplyOf(A));
  t("1c. reaksi ⚡ saat join", reactions.includes("⚡"), reactions.join(","));
  await run(A);
  t("1d. join ulang → ditolak (udah di lobby)", lastReplyOf(A).includes("udah di lobby"), lastReplyOf(A));
  sent.length = 0;
  await run(B); // tanpa nama → auto nickname
  t("1e. B auto-nickname tanpa dikasih nama", /^[a-z]+[a-z]+\d+$/.test(nickOf(B).toLowerCase()), nickOf(B));
  t("1f. A dapet broadcast B masuk", msgsTo(A).some((x) => x.includes("masuk lobby") && x.includes(nickOf(B).toLowerCase())), JSON.stringify(msgsTo(A)));
}

console.log("— section 2: relay broadcast (nomor gak pernah muncul) —");
{
  sent.length = 0;
  const handled = await relay(A, "pagi semua!");
  t("2a. pesan A di-broadcast ke B", handled === true && msgsTo(B).some((x) => x.includes("pagi semua!") && x.includes("kucinggalak")), JSON.stringify(msgsTo(B)));
  t("2b. broadcast gak pernah nyebut nomor A", !msgsTo(B).join(" ").includes("62811"), JSON.stringify(msgsTo(B)));
  await relay(B, "halo juga!");
  t("2c. balasan B nyampe ke A dengan nicknya", msgsTo(A).some((x) => x.includes("halo juga!") && x.includes(nickOf(B).toLowerCase())), JSON.stringify(msgsTo(A)));
  const handledNo = await relay(D, "halo");
  t("2d. non-member gak ke-relay", handledNo === false, handledNo);
}

console.log("— section 3: ATURAN BARU — link boleh, di-broadcast normal —");
{
  sent.length = 0;
  // flood seam 5 dtk — B barusan ngerelay di section 2, reset dulu
  lib.getLobby(db).members[B].lastRelayAt = 0; db.save();
  await relay(B, "cek bonus di bit.ly/hadiah99");
  const lobby = lib.getLobby(db);
  t("3a. pengirim link TETAP di lobby (gak di-kick)", !!lobby.members[B], JSON.stringify(Object.keys(lobby.members)));
  t("3b. link di-broadcast ke member lain", msgsTo(A).some((x) => x.includes("bit.ly/hadiah99")), JSON.stringify(msgsTo(A)));
  t("3c. owner GAK dapat laporan apa pun", msgsTo(OWNER).length === 0, JSON.stringify(msgsTo(OWNER)));
  // varian link lain juga lolos
  for (const v of ["wa.me/62811", "kunjungi www.hadiah.com", "daftar di chatib.info ya"]) {
    sent.length = 0;
    lobby.members[B].lastRelayAt = 0; db.save();
    await relay(B, v);
    t(`3d-${v.slice(0, 16)} → di-broadcast & tetap di lobby`, msgsTo(A).some((x) => x.includes(v.split(" ").pop())) && !!lib.getLobby(db).members[B], v);
  }
}

console.log("— section 4: media, flood, prefix —");
{
  sent.length = 0;
  await relay(A, "teks normal", { mtype: "conversation" });
  await relay(A, "foto", { mtype: "imageMessage", text: "" });
  t("4a. media ditolak, gak di-broadcast", repliesOf(A).some((x) => x.includes("media")) && !msgsTo(B).some((x) => x.includes("foto")), JSON.stringify(repliesOf(A)));
  const before = msgsTo(B).length;
  await relay(A, "spam");
  await relay(A, "spam");
  await relay(A, "spam");
  t("4b. flood guard: spam gak semua lewat", msgsTo(B).length - before <= 2, msgsTo(B).length - before);
  const cmdRelay = await relay(A, ".menu");
  t("4c. command (awalan .) gak di-broadcast", cmdRelay === false, cmdRelay);
}

console.log("— section 5: chatibnick / chatiblist / chatibleave —");
{
  sent.length = 0;
  await run(C, { args: ["PandaMalam"] });
  await plug.handler(mkM({ sender: A, chat: A, command: "chatibnick", args: ["Rubah", "Kilat"], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5a. ganti nick → unik & kecatat", nickOf(A).replace(/\s+/g, "").toLowerCase() === "rubahkilat", nickOf(A));
  t("5b. member lain dapet broadcast ganti nama", msgsTo(C).some((x) => x.includes("ganti nama") && x.replace(/\s+/g, "").includes("rubahkilat")), JSON.stringify(msgsTo(C)));
  sent.length = 0;
  // nick bentrok → dikasih suffix
  await plug.handler(mkM({ sender: C, chat: C, command: "chatibnick", args: ["RubahKilat"], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5c. nick nabrak (beda spasi pun) → otomatis di-unik-in", normC() !== "rubahkilat" && normC().startsWith("rubahkilat"), nickOf(C));
  sent.length = 0;
  await plug.handler(mkM({ sender: C, chat: C, command: "chatiblist", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5d. chatiblist nunjukin nick online (nomor gak ada)", lastReplyOf(C).includes("rubahkilat") && !lastReplyOf(C).includes("6281"), lastReplyOf(C));
  sent.length = 0;
  await plug.handler(mkM({ sender: C, chat: C, command: "chatibleave", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("5e. leave → keluar lobby + broadcast", !lib.getLobby(db).members[C] && msgsTo(A).some((x) => x.includes("keluar dari lobby")), JSON.stringify(msgsTo(A)));
}

console.log("— section 6: lobby penuh + grup ditolak —");
{
  sent.length = 0;
  // maxMembers seam = 3; isi: A + B + D
  await run(B, { args: ["KodokSultan"] });
  await run(D, { args: ["ElangPetir"] });
  mkM.currentSender = C;
  await plug.handler(mkM({ sender: C, chat: C, command: "chatiblobby", args: ["GagalMasuk"], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("6a. lobby penuh → join ditolak", !!lib.getLobby(db).members[B] && !!lib.getLobby(db).members[D] && !lib.getLobby(db).members[C] && lastReplyOf(C).includes("penuh"), lastReplyOf(C));
  sent.length = 0;
  mkM.currentSender = C;
  await plug.handler(mkM({ sender: C, chat: "grup@g.us", isGroup: true, command: "chatiblobby", args: [], text: "", react: async () => {} }), { sock: mkSock(), db });
  t("6b. dipakai di grup → disuruh DM bot", sent.some((s) => sc(s.text).includes("dm bot")), JSON.stringify(sent.map((s) => sc(s.text).slice(0, 50))));
  // pesan member yang diketik di grup → gak di-broadcast
  sent.length = 0;
  const grp = mkM({ sender: A, chat: "grup@g.us", isGroup: true, mtype: "conversation", text: "pesan grup", react: async () => {} });
  const handled = await plug.answerHandler(grp, mkSock());
  t("6c. pesan lobby yang diketik di grup gak di-broadcast", handled === false && msgsTo(B).length === 0, handled);
}

console.log("— section 7: sweeper idle auto-leave —");
{
  sent.length = 0;
  const l = lib.getLobby(db);
  l.members[A].lastActive = Date.now() - 99999; // basi
  db.save();
  await lib.initChatibLobbySweeper(mkSock(), 100);
  await new Promise((r) => setTimeout(r, 500));
  t("7a. member idle di-keluarkan otomatis", !lib.getLobby(db).members[A], JSON.stringify(Object.keys(lib.getLobby(db).members)));
  t("7b. member lain dapet kabar keluarnya (1 jam)", msgsTo(B).some((x) => x.includes("keluar") || x.includes("1 jam")), JSON.stringify(msgsTo(B)));
  lib._stopChatibSweeperForTest();
}

lib._resetChatibTimingsForTest();
cfg.config.owner = origOwner;
fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
