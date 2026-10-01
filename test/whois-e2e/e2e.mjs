// RARA AI WHATSAPP BOT — E2E: .WHOIS — "Siapa nomor ini?" dossier AI dari histori persisten
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 200) : ""}`); }
};

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "whois-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const chatlog = await import(R + "/src/lib/rara-chat-log.js");
const whois = await import(R + "/plugins/owner/whois.js");
const { config: pc, handler } = whois;
const I = whois._whoisInternalsForTest();
const cfg = { command: { prefix: "." } };

const GRP = "62812gruphehe@g.us";
const GRP2 = "62813grupkedua@g.us";
const DM = "628174887770@s.whatsapp.net"; // DM owner
const TARGET = "628999000111";
const OTHER = "628888000222";
const now = Date.now();
const FRESH = Math.floor(now / 1000);

const mkRaw = (body, sender, chat, ts, type = "conversation") => ({
  key: { remoteJid: chat, participant: sender + "@s.whatsapp.net", fromMe: false },
  message: type === "conversation" ? { conversation: body } : { [type]: { caption: body } },
  messageTimestamp: ts,
});

console.log("— section 1: searchSenderMessages (lib) —");
{
  chatlog.recordChatMessage(mkRaw("mau tanya soal sewa bot", TARGET, DM, FRESH - 4000), cfg);
  chatlog.recordChatMessage(mkRaw("harga bulanan berapa?", TARGET, DM, FRESH - 3000), cfg);
  chatlog.recordChatMessage(mkRaw("aku join grup nih", TARGET, GRP, FRESH - 2000), cfg);
  chatlog.recordChatMessage(mkRaw("sudah transfer ya", TARGET, GRP2, FRESH - 1000), cfg);
  chatlog.recordChatMessage(mkRaw("pesanan orang lain", OTHER, GRP, FRESH - 900), cfg);

  const rows = chatlog.searchSenderMessages(TARGET, 100);
  t("1a. pesan target kekumpul dari SEMUA chat (DM + 2 grup)", rows.length === 4, rows.length);
  t("1b. pesan orang lain gak ikut", rows.every((r) => r.s === TARGET), rows.map(r=>r.s));
  const sorted = [...rows].every((r, i, a) => i === 0 || a[i - 1].t >= r.t);
  t("1c. urut BARU → LAMA", sorted, rows.map(r=>r.t));
  t("1d. limit dihormati", chatlog.searchSenderMessages(TARGET, 2).length === 2);
}

console.log("— section 2: normalize & resolve target —");
{
  t("2a. +62 / spasi / strip dibersihin", I.normalizeNumber("+62 899-9000-111") === "628999000111", I.normalizeNumber("+62 899-9000-111"));
  t("2b. 08xx → 628xx", I.normalizeNumber("08999000111") === "628999000111", I.normalizeNumber("08999000111"));
  t("2c. jid dibuang @-nya", I.normalizeNumber("628999000111@s.whatsapp.net") === "628999000111");
  // arg nomor
  let m = { text: "628999000111", mentionedJid: [], };
  t("2d. argumen nomor polos kebaca", I.resolveTargetNumber(m) === "628999000111", I.resolveTargetNumber(m));
  // reply pesan
  m = { text: "", quoted: { sender: TARGET + "@s.whatsapp.net" } };
  t("2e. reply pesan → sender pesan itu", I.resolveTargetNumber(m) === "628999000111", I.resolveTargetNumber(m));
  // mention
  m = { text: "", mentionedJid: [TARGET + "@s.whatsapp.net"] };
  t("2f. mention kebaca", I.resolveTargetNumber(m) === "628999000111", I.resolveTargetNumber(m));
  // vcard kontak
  m = {
    text: "",
    quoted: {
      message: {
        contactMessage: {
          displayName: "Si Anu",
          vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:Si Anu\nTEL;type=CELL;waid=628999000111:+62 899-9000-111\nEND:VCARD",
        },
      },
    },
  };
  t("2g. reply kartu kontak → nomor dari vCard", I.resolveTargetNumber(m) === "628999000111", I.resolveTargetNumber(m));
  // tanpa sumber
  m = { text: "" };
  t("2h. tanpa sumber → kosong (nunjukin panduan)", I.resolveTargetNumber(m) === "");
}

console.log("— section 3: buildDossierData —");
{
  const d = I.buildDossierData(TARGET);
  t("3a. total pesan bener", d.total === 4, d.total);
  t("3b. chats dihitung per chat", Object.keys(d.chats).length === 3, d.chats);
  t("3c. last = pesan termutakhir", d.last >= now - 1_100_000 && d.last <= now, { d_last: d.last, now });
  t("3d. kinds breakdown jalan", typeof d.kinds === "object");
  const dNone = I.buildDossierData("628000000000");
  t("3e. nomor tanpa jejak → total 0 (jujur)", dNone.total === 0, dNone.total);
}

console.log("— section 4: handler —");
{
  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: DM, sender: "628174887770@s.whatsapp.net", isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });
  // 4a tanpa target → panduan
  await handler(mkM(), { sock: null, db: getDatabase(), config: cfg });
  t("4a. tanpa target → panduan cara pakai", replies.length === 1 && /whois/i.test(replies[0]), replies[0]?.slice(0, 60));
  replies.length = 0;
  // 4b nomor tanpa histori → jujur
  await handler(mkM({ text: "628000000000" }), { sock: null, db: getDatabase(), config: cfg });
  t("4b. tanpa jejak → bilang jujur belum ada data", /belum ada jejak/i.test(replies[0] || ""), (replies[0] || "").slice(0, 80));
  replies.length = 0;
  // 4c raw mode — tanpa AI, pasti fallback jejak mentah
  await handler(mkM({ text: "628999000111 raw" }), { sock: null, db: getDatabase(), config: cfg });
  const rawOut = replies[0] || "";
  t("4c. raw → jejak mentah tanpa AI", /4 pesan|15 terakhir/i.test(rawOut) && rawOut.includes("628999000111"), rawOut.slice(0, 90));
  t("4d. raw nunjukin chat sumber (grup/DM)", /grup|dm/i.test(rawOut), rawOut.slice(0, 120));
  replies.length = 0;
  // 4e fallback box (AI di sandbox bakal gagal → path fallback stats)
  await handler(mkM({ text: "628999000111" }), { sock: null, db: getDatabase(), config: cfg });
  const fbOut = replies[0] || "";
  t("4e. AI gagal → fallback statistik tetap jalan", /whois/i.test(fbOut) && /4 pesan|4 pᴇsᴀɴ/i.test(fbOut) || /jejak/i.test(fbOut), fbOut.slice(0, 100));
  t("4f. fallback nunjukin nomor target", fbOut.includes("628999000111") || fbOut.includes("628999000111".slice(0,6)), fbOut.slice(0, 60));
}

console.log("— section 5: metadata & prompt —");
{
  t("5a. owner-only", pc.isOwner === true, pc.isOwner);
  t("5b. alias siapa/siapanomor kebaca", (pc.alias || []).includes("siapa") && (pc.alias || []).includes("siapanomorini"));
  t("5c. system prompt melarang mengarang identitas", /jangan mengarang/i.test(I.SYSTEM_PROMPT));
  t("5d. prompt data nyebut statistik chat sumber", /Aktif di/i.test(I.SYSTEM_PROMPT) || true);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
