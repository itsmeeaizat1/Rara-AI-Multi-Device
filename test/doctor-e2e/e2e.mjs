// E2E RARA DOCTOR — Self-Healing Bot (12 Sep 2026)
// Stub aiChat + repoRoot via setDoctorDeps. Deterministik tanpa network.
// Jalankan: node <repo>/test/doctor-e2e/e2e.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  setDoctorDeps, resetDoctorDeps, getDoctorData, isDoctorOn, isDoctorAuto,
  setDoctorOn, setDoctorAuto, recordDoctorError, extractRepoFrame,
  doctorScan, doctorClean, doctorHeal, recordDoctorErrorAuto, initDoctorMonitor,
} from "../../src/lib/rara-doctor.js";
import { config as docConfig, handler as docHandler } from "../../plugins/bot/doctor.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

// ── mock ────────────────────────────────────────────────────
function mkDb() {
  const store = {};
  return {
    setting(k, v) { if (v === undefined) return store[k]; store[k] = v; },
    _store: store,
  };
}

let fakeNow = 1700000000000;
function mkRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "doctor-repo-"));
  mkdirSync(path.join(root, "src"), { recursive: true });
  mkdirSync(path.join(root, "backups"), { recursive: true });
  return root;
}

const BUGGY_CODE = `import path from "path";
export function hitungHarga(items) {
  const total = items.reduce((a, b) => a + b.harga, 0);
  return total;
}
export function label(order) {
  return order.customer.name.toUpperCase();
}
`;

function mkErr(msg, file, line) {
  const e = new Error(msg);
  e.stack = `Error: ${msg}\n    at hitungHarga (${file}:${line}:5)\n    at process (internal:1:1)`;
  return e;
}

// ============================================================
w("\n— default: pairing pertama OFF —");
{
  resetDoctorDeps();
  setDoctorDeps({ now: () => fakeNow });
  const db = mkDb();
  const d = getDoctorData(db);
  check("on default false", d.on === false);
  check("auto default false", d.auto === false);
  check("errors default kosong", Array.isArray(d.errors) && d.errors.length === 0);
  check("isDoctorOn false", isDoctorOn(db) === false);
}

w("\n— record + dedup + stack parse —");
{
  const db = mkDb();
  const root = mkRepo();
  setDoctorDeps({ repoRoot: root, now: () => fakeNow });
  const e1 = mkErr("Cannot read properties of undefined (reading 'harga')", path.join(root, "src/cart.js"), 2);
  recordDoctorError(db, "uncaughtException", e1);
  recordDoctorError(db, "uncaughtException", mkErr("Cannot read properties of undefined (reading 'harga')", path.join(root, "src/cart.js"), 2));
  const d = getDoctorData(db);
  check("1 entri (dedup)", d.errors.length === 1, `got ${d.errors.length}`);
  check("count 2x", d.errors[0].count === 2, `got ${d.errors[0].count}`);
  check("file terparse", d.errors[0].file === "src/cart.js", `got ${d.errors[0].file}`);
  check("line terparse", d.errors[0].line === 2, `got ${d.errors[0].line}`);
  // error beda file = entri beda
  recordDoctorError(db, "unhandledRejection", mkErr("order.customer is undefined", path.join(root, "src/order.js"), 6));
  check("entri beda kalau beda file", d.errors.length === 2, `got ${d.errors.length}`);
  check("recordDoctorErrorAuto jalan (db dari param)", recordDoctorErrorAuto("uncaughtException", mkErr("auto err", path.join(root, "src/x.js"), 1), db) !== null);
  check("auto record masuk db", getDoctorData(db).errors.some((e) => e.message.includes("auto err")));
  check("recordDoctorErrorAuto aman pas db gak siap (null)", recordDoctorErrorAuto("uncaughtException", mkErr("x", path.join(root, "src/x.js"), 1), null) === null);
}

w("\n— extractRepoFrame: tolak luar repo + whitelist —");
{
  const root = mkRepo();
  setDoctorDeps({ repoRoot: root });
  const inside = extractRepoFrame(`Error: x\n    at f (${path.join(root, "src", "a.js")}:3:1)`);
  check("frame dalem repo keambil", inside?.file === "src/a.js" && inside?.line === 3);
  const outside = extractRepoFrame(`Error: x\n    at f (/usr/lib/node/a.js:3:1)`);
  check("frame luar repo ditolak", outside === null);
  const notWhite = extractRepoFrame(`Error: x\n    at f (${path.join(root, "assets", "a.js")}:3:1)`);
  check("folder di luar src/plugins ditolak", notWhite === null);
}

w("\n— setDoctorOn / auto gate —");
{
  const db = mkDb();
  check("auto ON ditolak pas doctor off", setDoctorAuto(db, true).ok === false);
  setDoctorOn(db, true, "owner@s.whatsapp.net");
  check("owner on manual jalan", isDoctorOn(db) === true);
  const okAuto = setDoctorAuto(db, true);
  check("auto ON lolos pas doctor on", okAuto.ok === true && okAuto.auto === true);
  setDoctorOn(db, false);
  check("off total matiin auto juga", isDoctorOn(db) === false && isDoctorAuto(db) === false);
}

w("\n— scan + clean TTL —");
{
  const db = mkDb();
  const root = mkRepo();
  setDoctorDeps({ repoRoot: root, now: () => fakeNow });
  recordDoctorError(db, "t", mkErr("err lama", path.join(root, "src/a.js"), 1));
  const s1 = doctorScan(db);
  check("scan total 1", s1.total === 1);
  // 8 hari kemudian → kecleanup
  setDoctorDeps({ now: () => fakeNow + 8 * 24 * 3600 * 1000 });
  const res = doctorClean(db);
  check("cleanup 7 hari buang entri tua", res.removed === 1 && res.total === 0, `got ${res.removed}/${res.total}`);
}

w("\n— heal happy path: AI patch → backup → syntax ok —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "cart.js"), BUGGY_CODE);
  const aiCalls = [];
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async (p, o) => {
      aiCalls.push({ p, o });
      return JSON.stringify({
        find: "const total = items.reduce((a, b) => a + b.harga, 0);",
        replace: "const total = (items || []).reduce((a, b) => a + (b?.harga || 0), 0);",
        reason: "items bisa undefined — dikasih guard biar gak throw",
      });
    },
  });
  recordDoctorError(db, "uncaughtException", mkErr("Cannot read properties of undefined (reading 'harga')", path.join(root, "src/cart.js"), 2));
  const res = await doctorHeal(db, 0);
  check("heal ok", res.ok === true, res.msg);
  check("prompt AI ngandung stack + kode", String(aiCalls[0].p).includes("STACK TRACE") && String(aiCalls[0].p).includes("POTONGAN KODE"));
  const patched = readFileSync(path.join(root, "src", "cart.js"), "utf-8");
  check("kode ketae patch", patched.includes("(items || [])"));
  check("backup kebikin", existsSync(path.join(root, "backups", "doctor")) && readdirSync(path.join(root, "backups", "doctor")).length === 1);
  check("entri ditandai healed", getDoctorData(db).errors[0].healed === true);
  check("heal ulang ditolak", (await doctorHeal(db, 0)).ok === false);
}

w("\n— heal tolak: find gak unik —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "dup.js"), "let a = 1;\nlet b = 2;\n");
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async () => JSON.stringify({ find: "let", replace: "var", reason: "tes" }),
  });
  recordDoctorError(db, "t", mkErr("dup err", path.join(root, "src/dup.js"), 1));
  const res = await doctorHeal(db, 0);
  check("ditolak karena gak unik", res.ok === false && /unik/.test(res.msg), res.msg);
  check("file utuh gak keubah", readFileSync(path.join(root, "src", "dup.js"), "utf-8") === "let a = 1;\nlet b = 2;\n");
}

w("\n— heal revert pas syntax check gagal —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "bad.js"), "export const x = 1;\n");
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async () => JSON.stringify({ find: "export const x = 1;", replace: "export const x = {{{;", reason: "tes rusak" }),
    checkSyntax: async () => { throw new Error("SyntaxError: Unexpected token"); },
  });
  recordDoctorError(db, "t", mkErr("bad err", path.join(root, "src/bad.js"), 1));
  const res = await doctorHeal(db, 0);
  check("heal gagal syntax", res.ok === false && /revert/i.test(res.msg), res.msg);
  check("file DIREVERT utuh", readFileSync(path.join(root, "src", "bad.js"), "utf-8") === "export const x = 1;\n");
  check("entri tetep belum healed (bisa dicoba lagi)", getDoctorData(db).errors[0].healed === false);
}

w("\n— heal: AI bilang gak bisa dipatch —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "net.js"), "export const p = 1;\n");
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async () => JSON.stringify({ find: "", replace: "", reason: "error network API down, bukan bug kode" }),
  });
  recordDoctorError(db, "t", mkErr("fetch failed ECONNRESET", path.join(root, "src/net.js"), 1));
  const res = await doctorHeal(db, 0);
  check("balas reason tanpa patch", res.ok === false && /network/.test(res.msg), res.msg);
}

w("\n— heal: AI non-JSON —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "nz.js"), "export const q = 1;\n");
  setDoctorDeps({ repoRoot: root, now: () => fakeNow, aiChat: async () => "maaf aku gak bisa baca kodenya" });
  recordDoctorError(db, "t", mkErr("nz err", path.join(root, "src/nz.js"), 1));
  const res = await doctorHeal(db, 0);
  check("non-JSON ditolak", res.ok === false, res.msg);
}

w("\n— plugin handler: status default off → on → scan → auto —");
{
  resetDoctorDeps();
  setDoctorDeps({ now: () => fakeNow });
  const db = mkDb();
  const replies = [];
  const m = {
    args: [], sender: "owner@x", reply: async (t) => replies.push(t), react: async () => {},
  };
  await docHandler({ ...m, args: [] }, { db });
  check("status default OFF", replies[0].includes("off"), replies[0].slice(0, 80));
  await docHandler({ ...m, args: ["on"] }, { sock: { sendMessage: async () => {} }, db });
  check(".doctor on aktif", isDoctorOn(db) === true && replies[1].toLowerCase().includes("aktif"));
  await docHandler({ ...m, args: ["test"] }, { db });
  check(".doctor test suntik dummy", getDoctorData(db).errors.length === 1, "no dummy recorded");
  await docHandler({ ...m, args: ["scan"] }, { db });
  check("scan nampilin error", replies[3].includes("dummy") || replies[3].includes("dummy"), replies[3].slice(0, 100));
  await docHandler({ ...m, args: ["auto", "on"] }, { db });
  check("auto on dari plugin", isDoctorAuto(db) === true && replies[4].toLowerCase().includes("nyala"));
  await docHandler({ ...m, args: ["clean"] }, { db });
  check("clean jalan", /log error|dibersihin/i.test(replies[5])); // 9 Okt: header promo kini kapital
  // config plugin
  check("isOwner gate", docConfig.isOwner === true);
  check("alias ada dokter", docConfig.alias.includes("dokter"));
}

w("\n— monitor: notif error baru ke owner —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "cart.js"), BUGGY_CODE);
  const sent = [];
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async () => JSON.stringify({
      find: "const total = items.reduce((a, b) => a + b.harga, 0);",
      replace: "const total = (items || []).reduce((a, b) => a + (b?.harga || 0), 0);",
      reason: "guard items undefined",
    }),
  });
  setDoctorOn(db, true, "owner@x");
  recordDoctorError(db, "uncaughtException", mkErr("Cannot read properties of undefined (reading 'harga')", path.join(root, "src/cart.js"), 2));
  const sock = { sendMessage: async (to, msg) => { sent.push({ to, msg }); } };
  await initDoctorMonitor(sock, db); // run pertama langsung jalan
  await new Promise((r) => setTimeout(r, 300));
  check("notif error masuk ke owner", sent.some((s) => s.to === "owner@x" && s.msg.text.includes("error baru")));
  check("notif nunjukin file error", sent.some((s) => s.msg.text.includes("src/cart.js")));
  check("lastNotified maju", getDoctorData(db).lastNotified >= fakeNow);
  // belum auto → gak ada heal yang jalan
  check("auto off = gak ada patch", sent.every((s) => !s.msg.text.includes("Auto-heal")));
}

w("\n— monitor auto-heal: opt-in langsung benerin + lapor —");
{
  const db = mkDb();
  const root = mkRepo();
  writeFileSync(path.join(root, "src", "cart.js"), BUGGY_CODE);
  const sent = [];
  setDoctorDeps({
    repoRoot: root, now: () => fakeNow,
    aiChat: async () => JSON.stringify({
      find: "const total = items.reduce((a, b) => a + b.harga, 0);",
      replace: "const total = (items || []).reduce((a, b) => a + (b?.harga || 0), 0);",
      reason: "guard items undefined",
    }),
  });
  setDoctorOn(db, true, "owner@x");
  setDoctorAuto(db, true);
  recordDoctorError(db, "uncaughtException", mkErr("Cannot read properties of undefined (reading 'harga')", path.join(root, "src/cart.js"), 2));
  const sock = { sendMessage: async (to, msg) => { sent.push({ to, msg }); } };
  await initDoctorMonitor(sock, db);
  await new Promise((r) => setTimeout(r, 300));
  check("auto-heal nembak + lapor", sent.some((s) => s.msg.text.includes("Auto-heal") && s.msg.text.includes("diheal")));
  check("file kepatch otomatis", readFileSync(path.join(root, "src", "cart.js"), "utf-8").includes("(items || [])"));
  check("error ditandai healed", getDoctorData(db).errors[0].healed === true);
}

w(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
