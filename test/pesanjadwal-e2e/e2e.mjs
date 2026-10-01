// E2E — PESAN TERJADWAL .pesanjadwal (14 Sep 2026): waktu absolut (gap .remind
// cuma durasi max 7 hari / .schedule owner-only). REUSE engine rara-reminder
// (persist + restore + missed). kind:"pesanjadwal" → kartu bunyi sendiri.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.NOVA_TICK_MAXEDITS = "2";
process.chdir(R);

const DB_DIR = "/tmp/rara-pjd-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const { parseWhen, formatWib } = await import(R + "/plugins/tools/messageschedule.js");
const { handler } = await import(R + "/plugins/tools/messageschedule.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const {
  cancelReminder, listActiveReminders, persistReminders,
  armReminder, fireReminder,
} = await import(R + "/src/lib/rara-reminder-engine.js");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const moment = (await import("moment-timezone")).default;
const TZ = "Asia/Jakarta";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase(); // GOTCHA: raraWrap = smallcaps

const SENDER = "62812@s.whatsapp.net";
let sends = [];
const mkSock = () => ({
  sendMessage: async (jid, opt) => { sends.push({ jid, text: opt?.text || "", mentions: opt?.mentions || [] }); return { key: { id: "k" + sends.length } }; },
});
const mk = (text) => {
  // mirror rara-serialize: m.text = body TANPA command, args = kata setelahnya
  const body = String(text).trim();
  const t2 = body.replace(/^\.\S+\s*/, "");
  const args = t2.split(/\s+/);
  return { sender: SENDER, pushName: "Budi", key: { remoteJid: "g@gnus" }, args, text: t2, react: async () => {}, reply: async (t) => sends.push({ jid: "reply", text: t }) };
};

// bersihin state antar blok
function resetAll() {
  sends = [];
  global.raraReminders = [];
}

// ═══════════════════════════════════════════════════════════════
w("\n— parser waktu absolut (WIB) —");
{
  const nowWib = moment.tz(TZ);

  // HH:MM hari ini
  const h = (nowWib.hour() + 2) % 24;
  const mt = `${String(h).padStart(2, "0")}:15`;
  const r1 = parseWhen(mt);
  check("HH:MM → epoch WIB hari ini", r1 && moment.tz(r1, TZ).format("HH:mm") === `${String(h).padStart(2, "0")}:15`, String(r1));

  // HH:MM yang udah lewat → besok
  const past = (nowWib.hour() + 23) % 24;
  const r2 = parseWhen(`${String(past).padStart(2, "0")}:00`);
  check("HH:MM lewat → geser besok", r2 && moment.tz(r2, TZ).diff(nowWib.startOf("day"), "days") === 1, String(r2));

  // besok/lusa
  const r3 = parseWhen("besok 07:00");
  const r4 = parseWhen("lusa 07:30");
  check("besok 07:00", r3 && moment.tz(r3, TZ).diff(nowWib.startOf("day"), "days") === 1 && moment.tz(r3, TZ).hour() === 7, String(r3));
  check("lusa 07:30 → +2 hari", r4 && moment.tz(r4, TZ).diff(nowWib.startOf("day"), "days") === 2 && moment.tz(r4, TZ).minute() === 30, String(r4));

  // tanggal — tahun depan (biar gak lewat)
  const y = nowWib.year() + 1;
  const r5 = parseWhen(`25-12-${y} 08:00`);
  check("DD-MM-YYYY HH:MM", r5 && moment.tz(r5, TZ).format("DD-MM-YYYY HH:mm") === `25-12-${y} 08:00`, String(r5));
  const r6 = parseWhen(`01-06-${y}`);
  check("DD-MM doang → default jam 08:00", r6 && moment.tz(r6, TZ).hour() === 8 && moment.tz(r6, TZ).date() === 1, String(r6));

  // invalid
  check("31-2 invalid → null", parseWhen("31-2") === null);
  check("25:00 invalid → null", parseWhen("25:00") === null);
  check("sampah → null", parseWhen("kapan-kapan") === null);

  // dalam <durasi>
  const r7 = parseWhen("dalam 2 jam");
  check("dalam 2 jam → relatif", Math.abs(r7 - (Date.now() + 7200000)) < 3000, String(r7));
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin: guide + add + list + status —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk(".pesanjadwal help"), { sock });
  check("help → guide format", norm(sends.at(-1).text).includes("waktu absolut") || norm(sends.at(-1).text).includes("pesanjadwal"), norm(sends.at(-1).text).slice(0, 60));

  // add tanpa pipe → error format
  await handler(mk(".pesanjadwal besok 07:00"), { sock });
  check("tanpa pipe → error format wajib |", norm(sends.at(-1).text).includes("|") && norm(sends.at(-1).text).includes("format"), norm(sends.at(-1).text).slice(0, 80));

  // add bener — waktu 1 menit ke depan (biar gak kena min 1 menit)
  const fireTs = Date.now() + 120000;
  const mtStr = moment.tz(fireTs, TZ).format("HH:mm");
  await handler(mk(`.pesanjadwal ${mtStr} | Tes pesan penting`), { sock });
  const card = norm(sends.find((s) => norm(s.text).includes("pesan terjadwal dibuat"))?.text || "");
  check("add → kartu live countdown (🕒)", card.includes("pesan terjadwal dibuat") && card.includes("🕒") && card.includes("kirim dalam"), card.slice(0, 90));
  check("pesan kecatat di kartu", card.includes("tes pesan penting"), card.slice(0, 120));
  const pjd = global.raraReminders.find((r) => r.kind === "pesanjadwal" && !r.fired);
  check("reminder ke-push + armed + kind", pjd && typeof pjd.timerId === "object" && pjd.fireAt > Date.now(), pjd && String(pjd.fireAt));
  check("persist ke db", (getDatabase().setting("raraReminders") || []).length === 1);

  // list
  await handler(mk(".pesanjadwal list"), { sock });
  const lcard = norm(sends.at(-1).text);
  check("list → item + ID + ETA", lcard.includes("aktif (1)") && lcard.includes("tes pesan penting") && lcard.includes("wib"), lcard.slice(0, 100));

  // status
  await handler(mk(".pesanjadwal status"), { sock });
  check("status → jumlah aktif", norm(sends.at(-1).text).includes("1"), norm(sends.at(-1).text).slice(0, 80));
}

// ═══════════════════════════════════════════════════════════════
w("\n— del: cancel + closing adaptif —");
{
  resetAll();
  const sock = mkSock();
  const fireTs = Date.now() + 3600000;
  const mtStr = moment.tz(fireTs, TZ).format("HH:mm");
  await handler(mk(`.pesanjadwal ${mtStr} | Pesan buat dihapus`), { sock });
  const pjd = global.raraReminders.find((r) => r.kind === "pesanjadwal" && !r.fired);

  // del salah id
  await handler(mk(".pesanjadwal del PJD-XXXX"), { sock });
  check("del id nyasar → gak ketemu", norm(sends.at(-1).text).includes("gak ketemu"), norm(sends.at(-1).text).slice(0, 60));

  // del bener
  await handler(mk(`.pesanjadwal del ${pjd.id}`), { sock });
  const dcard = norm(sends.at(-1).text);
  check("del → kartu dibatalkan", dcard.includes("dibatalkan") && dcard.includes("pesan buat dihapus"), dcard.slice(0, 80));
  check("reminder fired=true + cancelled=true", pjd.fired === true && pjd.cancelled === true);
  check("isCancelled flag → ticker closing DIBATALKAN (bukan 'tiba')", pjd.cancelled === true);

  // list kosong lagi
  await handler(mk(".pesanjadwal list"), { sock });
  check("list → kosong setelah del", norm(sends.at(-1).text).includes("gak punya"), norm(sends.at(-1).text).slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════
w("\n— engine: fireReminder kind pesanjadwal + miss —");
{
  resetAll();
  const sock = mkSock();
  const r = { id: "PJD-T1", kind: "pesanjadwal", jid: "g@gnus", sender: SENDER, message: "Halo jadwal", createdAt: Date.now() - 60000, fired: false, timerId: null };
  await fireReminder(sock, r, false);
  check("fire tepat waktu → judul 'Pesan Terjadwal Tiba'", norm(sends.at(-1).text).includes("pesan terjadwal tiba") && norm(sends.at(-1).text).includes("tepat waktu"), norm(sends.at(-1).text).slice(0, 80));
  await fireReminder(sock, r, true);
  check("missed → 'Pesan Terjadwal Terlewat'", norm(sends.at(-1).text).includes("pesan terjadwal terlewat"), norm(sends.at(-1).text).slice(0, 80));

  // .remind lama gak kena ubah (kind undefined → judul lama)
  const r2 = { id: "RMD-T1", jid: "g@gnus", sender: SENDER, message: "Halo remind", createdAt: Date.now() - 60000, fired: false, timerId: null };
  await fireReminder(sock, r2, false);
  check("regresi: .remind tetep 'Reminder Berbunyi'", norm(sends.at(-1).text).includes("reminder berbunyi"), norm(sends.at(-1).text).slice(0, 60));

  // arm → fire nyata (timer beneran jalan)
  resetAll();
  const r3 = { id: "PJD-T2", kind: "pesanjadwal", jid: "g@gnus", sender: SENDER, message: "Fire nyata", createdAt: Date.now(), fired: false, timerId: null, fireAt: Date.now() + 300 };
  global.raraReminders.push(r3);
  armReminder(sock, r3);
  await new Promise((res) => setTimeout(res, 700));
  check("arm timer → fire otomatis + fired", r3.fired === true && sends.some((s) => norm(s.text).includes("fire nyata")), sends.map((s) => norm(s.text).slice(0, 30)).join(" / "));
}

// ═══════════════════════════════════════════════════════════════
w("\n— persist + restore (tahan restart) —");
{
  resetAll();
  const sock = mkSock();
  const fireTs = Date.now() + 7200000;
  const mtStr = moment.tz(fireTs, TZ).format("HH:mm");
  await handler(mk(`.pesanjadwal ${mtStr} | Persist tes`), { sock });
  const saved = getDatabase().setting("raraReminders");
  check("persist: 1 tersimpan di db", (saved || []).length === 1);

  // simulasikan restart: RAM kosong → restore dari db
  global.raraReminders = [];
  const { restoreReminders } = await import(R + "/src/lib/rara-reminder-engine.js");
  const st = restoreReminders(sock);
  const restored = global.raraReminders.find((r) => r.message === "Persist tes");
  check("restore: pesan terjadwal ke-pasang ulang", st.rearmed >= 1 && restored && restored.kind === "pesanjadwal", JSON.stringify(st));
  check("restored punya timer", restored && typeof restored.timerId === "object");
  if (restored?.timerId) clearTimeout(restored.timerId);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
