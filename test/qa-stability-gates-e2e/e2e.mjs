// E2E QA STABILITY GATES — gerbang 1 (integration DB), 2 (state & session),
// 5 (error boundary & graceful shutdown) dari QA Standard v1 (owner 9 Okt 2026).
// Tanpa mock penuh: DB asli di tmp dir (data bener-bener ke disk, kebaca
// pas "restart", bisa dihapus), state session wizard dites beneran,
// error boundary diverifikasi struktural + behavioral.
// Jalankan: node test/qa-stability-gates-e2e/e2e.mjs

import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
};
const R = path.resolve(import.meta.dirname, "../..");

async function bootDb(dir) {
  const mod = await import("file://" + path.join(R, "src/lib/rara-database.js") + `?t=${Date.now()}`);
  if (mod.__resetDatabaseForTest) mod.__resetDatabaseForTest();
  return await mod.initDatabase(dir);
}

// ══════════════════════════════════════════════════════════════════
console.log("\n『 *Gate 1 — Integration DB (tanpa mock, file asli) *』");
// ══════════════════════════════════════════════════════════════════
const dir1 = mkdtempSync(path.join(tmpdir(), "rara-gate1-"));
{
  // Fase A: "proses bot jalan" — tulis data user + setting
  const db = await bootDb(dir1);
  db.db.data.users["628111222333@s.whatsapp.net"] = {
    name: "Budi", limit: 10, premium: false,
  };
  db.db.data.settings.hello = "dunia";
  db.db.write(); // flush ke disk (sama kayak pas save berkala)
  const rawUsers = readFileSync(path.join(dir1, "user/users.json"), "utf8");
  t("1a. data user BENER-BENER nulis ke file disk", rawUsers.includes("Budi"), rawUsers.slice(0, 80));

  // Fase B: "restart proses bot" — init ulang, data harus balik
  const db2 = await bootDb(dir1);
  t("1b. data user TAHAN restart (kebaca lagi dari disk)", db2.db.data.users["628111222333@s.whatsapp.net"]?.name === "Budi");
  t("1c. data setting TAHAN restart", db2.db.data.settings.hello === "dunia");

  // Fase C: update → restart → nilai baru menang
  db2.db.data.users["628111222333@s.whatsapp.net"].limit = 99;
  db2.db.write();
  const db3 = await bootDb(dir1);
  t("1d. update data TAHAN restart (nilai baru)", db3.db.data.users["628111222333@s.whatsapp.net"]?.limit === 99);

  // Fase D: delete → restart → data hilang permanen
  delete db3.db.data.users["628111222333@s.whatsapp.net"];
  db3.db.write();
  const db4 = await bootDb(dir1);
  t("1e. delete data TAHAN restart (gak zombi)", !db4.db.data.users["628111222333@s.whatsapp.net"]);
}
rmSync(dir1, { recursive: true, force: true });
t("1f. tmp dir test kebersihkan", !existsSync(dir1));

// ══════════════════════════════════════════════════════════════════
console.log("\n『 *Gate 2 — State & Session (wizard + reconnect) *』");
// ══════════════════════════════════════════════════════════════════
{
  const engine = await import("file://" + path.join(R, "src/lib/rara-anonim-engine.js"));
  engine._resetAnonimRegSessionsForTest();
  const dir2 = mkdtempSync(path.join(tmpdir(), "rara-gate2-"));
  const db = await bootDb(dir2);

  const replies = [];
  const fakeM = (text, jid = "628997654321@s.whatsapp.net") => ({
    text, sender: jid, chat: jid,
    reply: async (x) => { replies.push(String(x)); },
  });

  // 2a: pesan acak di luar alur saat wizard nunggu input → fallback jelas, gak hang
  engine.startRegistration("628997654321@s.whatsapp.net");
  await engine.registrationAnswerHandler(fakeM("x"), null, db); // nama kependekan
  t("2a. input gak valid pas wizard nunggu → fallback kartu, sesi TETAP hidup",
    replies.length > 0 && /2–40|Coba lagi/i.test(replies[replies.length - 1]) && engine.hasRegistrationSession("628997654321@s.whatsapp.net"));

  // 2b: user tiba-tiba ketik command lain → sesi dibatalkan bersih, gak nyasar
  await engine.registrationAnswerHandler(fakeM(".menu"), null, db);
  t("2b. user pindah command saat wizard → sesi BATAL bersih (gak state nyasar)",
    !engine.hasRegistrationSession("628997654321@s.whatsapp.net"));

  // 2c: timeout sesi — sesi basi otomatis hangus
  engine.startRegistration("628990001111@s.whatsapp.net");
  const stale = engine.hasRegistrationSession("628990001111@s.whatsapp.net");
  // dipaksa basi: timestamp sesi dimundurin melewati REG_SESSION_TIMEOUT (5 mnt)
  const sessObj = global.anonimRegSessions["628990001111@s.whatsapp.net"];
  sessObj.at = Date.now() - (6 * 60 * 1000);
  const expired = !engine.hasRegistrationSession("628990001111@s.whatsapp.net");
  t("2c. sesi expired (5 mnt) → otomatis hangus & kehapus", stale && expired && !global.anonimRegSessions["628990001111@s.whatsapp.net"]);

  // 2d: state DB tahan restart — profil yang udah ke-save gak ilang pas disconnect
  db.db.data.anonim = db.db.data.anonim || {};
  db.db.data.anonim.users = db.db.data.anonim.users || {};
  db.db.data.anonim.users["628990002222@s.whatsapp.net"] = { name: "Sari", gender: "P", age: 20, location: "Bandung", registeredAt: Date.now() };
  db.db.write();
  const db2 = await bootDb(dir2);
  t("2d. state percakapan (profil anonim) TAHAN restart — gak korup",
    db2.db.data.anonim?.users?.["628990002222@s.whatsapp.net"]?.name === "Sari");
  rmSync(dir2, { recursive: true, force: true });

  // 2e: reconnect Baileys — disconnect mendadak auto-reconnect, gak mati diam
  const connSrc = readFileSync(path.join(R, "src/connection.js"), "utf8");
  t("2e. connection.update ditangani → handler close + reconnect otomatis",
    /sock\.ev\.on\("connection\.update"/.test(connSrc) && /setTimeout\(\(\) => startConnection\(options\)/.test(connSrc));
  t("2f. loggedOut/401 = stop reconnect (gak loop login dead), kode lain = retry",
    /sc === DisconnectReason\.loggedOut \|\| sc === 401/.test(connSrc) && /connectionState\.reconnectAttempts\+\+/.test(connSrc));
  t("2g. cap percobaan reconnect ada (gak loop tak berujung)",
    /maxReconnectAttempts \|\| 5/.test(connSrc));
}

// ══════════════════════════════════════════════════════════════════
console.log("\n『 *Gate 5 — Error Boundary & Graceful Shutdown *』");
// ══════════════════════════════════════════════════════════════════
{
  const idx = readFileSync(path.join(R, "index.js"), "utf8");
  t("5a. uncaughtException ditangani → log + engine tetap jalan (gak mati diam)",
    /process\.on\("uncaughtException"/.test(idx) && /Engine is still running/.test(idx));
  t("5b. unhandledRejection ditangani → log + engine tetap jalan",
    /process\.on\("unhandledRejection"/.test(idx) && /Engine is still running/.test(idx));
  t("5c. SIGINT & SIGTERM dua-duanya graceful shutdown (save DB + drain antrean)",
    /gracefulShutdown\("SIGINT"\)/.test(idx) && /gracefulShutdown\("SIGTERM"\)/.test(idx));
  t("5d. shutdown menyelesaikan reply nanggung: drain antrean dulu, baru save DB, baru exit",
    /drainSendQueue\(8000\)/.test(idx) && /getQueueDepth\(\)/.test(idx) && /db\.save\(\)/.test(idx));
  t("5e. guard signal dobel (egg kirim SIGTERM+SIGKILL gak dobel shutdown)", /gracefulShutdown\.__ran/.test(idx));

  // behavioral: drain antrean beneran nunggu job kekirim semua
  const q = await import("file://" + path.join(R, "src/lib/rara-send-queue.js"));
  q.__resetQueueForTest();
  q._setQueueDelaysForTest(1, 5);
  const sent = [];
  const fakeSock = { sendMessage: async (jid, content) => { await new Promise((r) => setTimeout(r, 10)); sent.push(content); return { ok: true }; } };
  q.wrapSendQueue(fakeSock);
  const JID = "628555000111@s.whatsapp.net";
  for (let i = 0; i < 6; i++) fakeSock.sendMessage(JID, { text: "pesan-" + i });
  t("5f. 6 job nanggung → drainSendQueue nunggu SEMUA kekirim", (await q.drainSendQueue(3000)) === true && sent.length === 6);

  // behavioral: drain gak hang selamanya kalau ada job bandel
  q.__resetQueueForTest();
  q._setQueueDelaysForTest(1, 5);
  const stuckSock = { sendMessage: () => new Promise(() => {}) }; // gak pernah resolve
  q.wrapSendQueue(stuckSock);
  stuckSock.sendMessage(JID, { text: "bandel" });
  const t0 = Date.now();
  const drained = await q.drainSendQueue(150); // timeout pendek
  t("5g. drain ada timeout — job bandel gak bikin shutdown hang", drained === false && Date.now() - t0 < 1000);
  q.__resetQueueForTest();
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
if (fail > 0) process.exit(1);
