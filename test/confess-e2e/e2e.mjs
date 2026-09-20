// E2E: confess — versi DM LAMA yang direstore jadi .confess (owner 20 Sep 2026)
// + confess channel pindah ke .confess2. Jalankan: node test/confess-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { fromSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);

// DB real (pola penilaian-e2e): handler manggil getDatabase() internal
fs.rmSync("/tmp/confess-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-database.js")).href);
await initDatabase("/tmp/confess-e2e-db/nova.json");
const db = getDatabase();

const confess = await import(pathToFileURL(path.join(REPO, "plugins/fun/confess.js")).href);
const confess2 = await import(pathToFileURL(path.join(REPO, "plugins/fun/confess2.js")).href);
const confessHandler = confess.handler;
const confessReply = confess.replyHandler;
const confess2Handler = confess2.handler;

// ── plugin config ──
t("1a. confess DM: name = confess (restore owner 20 Sep)", confess.config.name === "confess");
t("1b. confess DM: alias confessdm", confess.config.alias.includes("confessdm"));
t("1c. confess2: name = confess2 (channel pindah command)", confess2.config.name === "confess2");
t("1d. confess2: alias lama tetap sah (confessv2/confessv3/confessch)",
  ["confessv2", "confessv3", "confessch", "confesschannel"].every((a) => confess2.config.alias.includes(a)));
t("1e. dua plugin beda file, dua-duanya aktif kategori confess menfess",
  confess.config.category === "confess menfess" && confess2.config.category === "confess menfess");

// ── mock util ──
const sent = [], replies = [], reacted = [];
function mockM(fullArgs, opts = {}) {
  return {
    text: fullArgs, fullArgs, body: fullArgs,
    prefix: ".", command: "confess", args: String(fullArgs).split(/\s+/),
    chat: opts.chat || "12036302-1234@g.us",
    sender: opts.sender || "6289999000001@s.whatsapp.net",
    pushName: opts.pushName || "Penguji",
    chatName: opts.chatName || "Grup Uji",
    isGroup: true, isOwner: false, quoted: opts.quoted || null,
    react: async (e) => reacted.push(e),
    reply: async (txt) => replies.push(String(txt)),
  };
}
let msgSeq = 0; // id unik global biar confessData antar-case gak ketimpa
function mockSock() {
  return {
    sendMessage: async (jid, payload) => {
      sent.push({ jid, payload });
      msgSeq += 1;
      return { key: { id: "MSGID-" + msgSeq } };
    },
    onWhatsApp: async () => [{ exists: true }],
  };
}

// ── case 2: tanpa argumen → panduan ──
{
  replies.length = 0;
  await confessHandler(mockM("confess"), { sock: mockSock() });
  const guide = sent.find((s) => s.jid === "6289999000001@s.whatsapp.net");
  const g = fromSC(guide?.payload?.text || "");
  t("2a. tanpa arg: panduan masuk ke DM pengirim (bukan grup)", /anonim/i.test(g) && /non-anonim/i.test(g), g.slice(0, 80));
  t("2b. grup GAK nerima panduan (sifatnya DM doang)", replies.length === 0, "grup dapat: " + replies.length);
}

// ── case 3: .confess nomor|pesan → DM anonim ke ORANGnya + status ke GRUP ──
{
  sent.length = 0; replies.length = 0; reacted.length = 0;
  const m = mockM("confess 6281234567890|hai, aku suka kamu diam-diam");
  await confessHandler(m, { sock: mockSock() });
  const dm = sent.find((s) => s.jid === "6281234567890@s.whatsapp.net");
  t("3a. DM confess terkirim ke nomor orangnya", !!dm, JSON.stringify(sent.map((s) => s.jid)));
  const dmText = fromSC(dm?.payload?.text || "");
  t("3b. DM: isi pesan masuk", /aku suka kamu diam-diam/.test(dmText), dmText.slice(0, 80));
  t("3c. DM: anonim (gak nyebut nama pengirim)", !/Penguji/.test(dmText), dmText.slice(0, 80));
  const dmStatus = sent.find((s) => s.jid === "6289999000001@s.whatsapp.net");
  const statusText = fromSC(dmStatus?.payload?.text || "");
  t("3d. status PESAN TERKIRIM masuk ke DM pengirim", /pesan terkirim/i.test(statusText), statusText.slice(0, 60));
  t("3e. GRUP GAK DAPAT APA-APA (nol jejak di grup — revisi owner 20 Sep)", replies.length === 0, "grup dapat: " + replies.length);
  t("3f. react 💌 HANYA di private (di grup gak boleh keliatan)", !reacted.includes("💌"));
  t("3g. stats tersimpan (sender sent=1)", (() => {
    const u = db.getUser("6289999000001@s.whatsapp.net");
    return (u?.confessStats?.sent || 0) >= 1;
  })());
}

// ── case 4: .confess nomor|pesan|nama → non-anonim ──
{
  sent.length = 0; replies.length = 0;
  await confessHandler(mockM("confess 6281234567890|hai, aku Budi|Budi"), { sock: mockSock() });
  const dm = sent.find((s) => s.jid === "6281234567890@s.whatsapp.net");
  const dmText = fromSC(dm?.payload?.text || "");
  t("4a. DM non-anonim nyebut nama pengirim", /Budi/.test(dmText), dmText.slice(0, 80));
}

// ── case 5: validasi ──
{
  sent.length = 0;
  await confessHandler(mockM("confess 62|pendek"), { sock: mockSock() });
  const v1 = sent.find((s) => s.jid === "6289999000001@s.whatsapp.net");
  t("5a. nomor gak valid ditolak (ke DM)", /valid/i.test(fromSC(v1?.payload?.text || "")), (v1?.payload?.text || "").slice(0, 60));
  sent.length = 0;
  await confessHandler(mockM("confess 6289999000001|ke diri sendiri ya"), { sock: mockSock() });
  const v2 = sent.find((s) => s.jid === "6289999000001@s.whatsapp.net");
  t("5b. confess ke diri sendiri ditolak (ke DM)", /diri sendiri/i.test(fromSC(v2?.payload?.text || "")));
}

// ── case 6: replyHandler — target balas DM → diterusin ke grup pengirim ──
{
  sent.length = 0;
  const m = mockM("iya aku juga suka kamu", {
    sender: "6281234567890@s.whatsapp.net",
    chat: "6281234567890@s.whatsapp.net",
    quoted: { id: "MSGID-2", key: { id: "MSGID-2" } },
  });
  const handled = await confessReply(m, { sock: mockSock() });
  t("6a. reply target di-handle (return true)", handled === true);
  const fwd = sent.find((s) => s.jid === "6289999000001@s.whatsapp.net");
  t("6b. balasan diterusin ke DM pengirim (grup tetap hening)", !!fwd, JSON.stringify(sent.map((s) => s.jid)));
  t("6e. GAK ADA pesan apa pun ke grup pengirim", !sent.some((s) => s.jid === "12036302-1234@g.us"));
  t("6c. isi balasan masuk", /iya aku juga suka kamu/.test(fromSC(fwd?.payload?.text || "")), (fwd?.payload?.text || "").slice(0, 80));
  t("6d. konfirmasi ke target", sent.some((s) => s.jid === "6281234567890@s.whatsapp.net"));
}

// ── case 7: confess2 masih jalan (channel) ──
{
  replies.length = 0;
  const m = mockM("confess2 help", { chat: "6285555@s.whatsapp.net" });
  m.args = ["help"];
  await confess2Handler(m, { sock: mockSock() });
  const h = fromSC(replies[0] || replies[1] || "");
  t("7a. .confess2 help masih jalan", /anonim|reply|like/i.test(h), h.slice(0, 80));
}

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
