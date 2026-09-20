// NOVA AI — formatGuard e2e: sanitizer format pesan permanen
// Fix 18 Sep 2026 (owner: pesan ".bot on" broadcast muncul literal "\n"
// sebagai teks — akar: plugins/owner/bot.js join('\\n') dua-backslash.
// FIX berlapis: (1) akar dibenerin di bot.js, (2) formatGuard() di
// styler.js dipasang di m.reply + makeLangAwareSock — biar kelas bug
// typo-backslash/JSON-round-trip di plugin mana pun gak pernah muncul
// lagi ke user.)
import { createRequire } from "module";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// handler anti-mati-senyap (nova-lid swallow exception → exit 0)
process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

const DB_DIR = "/tmp/nova-fg-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

let pass = 0, fail = 0;
const w = (s) => console.log(s);
const t = (name, ok, extra) => { ok ? pass++ : fail++; w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); };

const { formatGuard } = await import(R + "/src/lib/styler.js");
const { getDatabase } = await import(R + "/src/lib/nova-database.js");
const { makeLangAwareSock } = await import(R + "/src/lib/nova-i18n-sock.js");

const BS = String.fromCharCode(92);   // "\"
const NL = String.fromCharCode(10);  // newline
const SENDER = "6281234567890@s.whatsapp.net";

w("\n— formatGuard: unit —");
{
  const dirty = "BOT KEMBALI AKTIF OLEH OWNER!" + BS + "nSEMUA FITUR SUDAH BISA." + BS + "n" + BS + "nTERIMA KASIH.";
  const clean = formatGuard(dirty);
  t("literal backslash-n jadi baris baru sungguhan",
    clean === "BOT KEMBALI AKTIF OLEH OWNER!" + NL + "SEMUA FITUR SUDAH BISA." + NL + NL + "TERIMA KASIH.",
    JSON.stringify(clean));
  t("idempotent (dipanggil 2x hasil sama)", formatGuard(clean) === clean);
  t("teks normal utuh", formatGuard("Baris 1" + NL + NL + "Baris 3") === "Baris 1" + NL + NL + "Baris 3");
  t("backslash-r backslash-n (CRLF literal) jadi 1 baris baru",
    formatGuard("A" + BS + "r" + BS + "nB") === "A" + NL + "B");
  t("backslash-t literal jadi spasi", formatGuard("A" + BS + "tB") === "A  B");
  // REVISI 20 Sep 2026 (rata kiri): baris plain ber-spasi awal kini di-DEDENT,
  // spasi ujung tetap dibuang — " B" jadi "B"
  t("spasi ujung baris dibuang + baris plain dedent", formatGuard("A   " + NL + " B") === "A" + NL + "B");
  t("3+ baris kosong dirapatkan jadi 1",
    formatGuard("A" + NL + NL + NL + NL + "B") === "A" + NL + NL + "B");
  // REVISI 20 Sep 2026: leading-space baris pertama (art) TIDAK lagi di-trim
  // total — newline kosong di awal dibuang, spasi ekor dibuang, isi dedent.
  t("trim awal/akhir (newline awal + ekor dibuang)", formatGuard(NL + "  A  " + NL) === "A");
  t("non-string dibalikin apa adanya", formatGuard(123) === 123 && formatGuard(null) === null && formatGuard(undefined) === undefined);
  t("ratakiri-1. baris plain ber-indent di-dedent", formatGuard("1. Ketik .menu" + NL + "   contoh: reply foto + .hd") === "1. Ketik .menu" + NL + "contoh: reply foto + .hd");
  t("ratakiri-2. art box-drawing indent UTUH (hangman)", formatGuard("  " + "\u256d\u2500\u2500\u2500\u256e" + NL + "  \u2502   \u2502") === "  \u256d\u2500\u2500\u2500\u256e" + NL + "  \u2502   \u2502");
  const fenced = "contoh:" + "```js" + NL + 'const x = "hi' + BS + 'n";```';
  t("isi code fence DIKIRIM PERSIS (fitur kode gak rusak)", formatGuard(fenced) === fenced);
  t("string kosong utuh", formatGuard("") === "");
}

w("\n— makeLangAwareSock: sanitizer jalan walau TANPA bahasa —");
{
  const sent = [];
  const sock = { sendMessage: async (jid, params) => { sent.push({ jid, params }); return { key: { id: "x" } }; } };
  // user TANPA preferensi bahasa + master toggle mati — sanitizer tetap wajib jalan
  const db = getDatabase();
  db.setting("multiLangEnabled", false);
  try { await db.save(); } catch {}
  const wrapped = makeLangAwareSock(sock, "628999000001@s.whatsapp.net");
  t("tanpa bahasa → sock tetap dibungkus (demi sanitizer)", wrapped !== sock);
  const dirty = "A!" + BS + "nB.";
  await wrapped.sendMessage("g@x", { text: dirty });
  t("sock.sendMessage text disanitasi", sent[0].params.text === "A!" + NL + "B.", JSON.stringify(sent[0].params.text));
  await wrapped.sendMessage("g@x", { caption: dirty, image: Buffer.from("x") });
  t("sock.sendMessage caption disanitasi", sent[1].params.caption === "A!" + NL + "B.");
  t("field media gak disentuh", !!sent[1].params.image);
  db.setting("multiLangEnabled", true);
  try { await db.save(); } catch {}
}

w("\n— plugin bot.js: broadcast .bot on HARUS baris baru sungguhan (REGRESI BUG ASLI) —");
{
  const db = getDatabase();
  db.setting("botPower", false);
  db.setting("botMute", false);
  try { await db.save(); } catch {}

  const sent = [];
  const sends = [];
  const sock = {
    sendMessage: async (jid, params) => {
      sent.push({ jid, params });
      await new Promise((r) => setTimeout(r, 5)); // broadcastStatusChange kasih jeda 800ms — percepat
      return { key: { id: "x" } };
    },
  };
  const m = {
    sender: SENDER,
    pushName: "Owner",
    chat: "123@g.us",
    key: { remoteJid: "123@g.us" },
    args: ["on"],
    text: "on",
    react: async () => {},
    reply: async (txt) => { sends.push(txt); },
  };

  // seed 1 grup biar broadcast punya target (db.getAllGroups() baca ini)
  db.setGroup("1203630111@g.us", { subject: "Grup Tes" });

  const plugin = await import(R + "/plugins/owner/bot.js");
  const mod = plugin.default || plugin;
  const handler = mod.handler || (typeof mod === "function" ? mod : null);
  if (typeof handler !== "function") throw new Error("handler bot.js gak kebaca: " + Object.keys(mod));
  await handler(m, { sock });

  // tunggu fire-and-forget broadcast (sleep 800ms per target di plugin asli)
  await new Promise((r) => setTimeout(r, 1500));

  t("reply konfirmasi terkirim", sends.length > 0);
  const bcast = sent.find((s) => /Terima kasih sudah menunggu/.test(String(s.params.text || "")));
  t("broadcast status terkirim ke grup", !!bcast, "sent: " + JSON.stringify(sent.map((s) => s.params.text)));
  if (bcast) {
    const txt = bcast.params.text;
    // GOTCHA: RegExp(BS+"n") = /\n/ nyocok newline ASLI — bukan literal
    // backslash-n. Literal 2-char butuh backslash ganda di sumber regex.
    const literalNL = new RegExp(BS + BS + "n");
    t("broadcast BEBAS literal backslash-n (bug asli gak keulang)",
      !literalNL.test(txt) && txt.includes(NL),
      "codes=" + [...txt].slice(0, 40).map((c) => c.charCodeAt(0)).join(","));
    t("broadcast 4 baris rapi (judul + isi + kosong + penutup)",
      txt.split(NL).length >= 4);
  }
  t("state botPower balik ON", db.setting("botPower") === true);
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
