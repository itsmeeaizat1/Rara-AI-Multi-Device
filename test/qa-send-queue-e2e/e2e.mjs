// E2E QA GATE 3 — ANTREAN KIRIM PER-CHAT (rara-send-queue)
// Verifikasi: serial + jeda acak per chat, paralel antar chat, 100 pesan
// bersamaan, error gak merusak chain, return value diteruskan, anti dobel-wrap.
// Jalankan: node test/qa-send-queue-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

const lib = await import(R("../../src/lib/rara-send-queue.js"));

const {
  wrapSendQueue,
  _setQueueDelaysForTest,
  _setQueueEnabledForTest,
  __resetQueueForTest,
  __getQueueStateForTest,
} = lib;

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeSock() {
  const sent = [];
  return {
    sent,
    sendMessage: async (jid, content) => {
      sent.push({ jid, content, at: Date.now() });
      return { key: { id: "msg-" + sent.length } };
    },
  };
}

__resetQueueForTest();

// ===== 1. Serial + urutan per chat =====
{
  _setQueueDelaysForTest(25, 25);
  const s = fakeSock();
  wrapSendQueue(s);
  const N = 12;
  await Promise.all(
    Array.from({ length: N }, (_, i) => s.sendMessage("chatA", { text: "m" + i })),
  );
  const order = s.sent.map((x) => x.content.text);
  t("1a. urutan kirim ke chat sama tetap 0..N-1 (gak loncat)", JSON.stringify(order) === JSON.stringify(Array.from({ length: N }, (_, i) => "m" + i)));
  t("1b. jumlah kirim persis " + N + " (gak dobel)", s.sent.length === N);
  let gapsOk = true;
  for (let i = 1; i < s.sent.length; i++) if (s.sent[i].at - s.sent[i - 1].at < 24) gapsOk = false;
  t("1c. jarak antar kirim >= jeda min (human-like, gak burst instan)", gapsOk);
}

// ===== 2. Paralel antar chat =====
{
  __resetQueueForTest();
  _setQueueDelaysForTest(30, 30);
  const s = fakeSock();
  wrapSendQueue(s);
  const sendN = async (jid, n) => Promise.all(Array.from({ length: n }, (_, i) => s.sendMessage(jid, { text: "x" + i })));
  const t0 = Date.now();
  await Promise.all([sendN("chatB", 10), sendN("chatC", 10)]);
  const elapsed = Date.now() - t0;
  const serialEstimate = 19 * 30; // 9 gap per chat × 2 chat kalau diserial global
  t("2a. chat beda jalan paralel (elapsed " + elapsed + "ms < serial global ~" + (serialEstimate * 2) + "ms)", elapsed < serialEstimate * 2);
  t("2b. tiap chat kekirim 10-10 lengkap", s.sent.filter((x) => x.jid === "chatB").length === 10 && s.sent.filter((x) => x.jid === "chatC").length === 10);
}

// ===== 3. Concurrency 100 pesan bersamaan 1 chat =====
{
  __resetQueueForTest();
  _setQueueDelaysForTest(20, 20);
  const s = fakeSock();
  wrapSendQueue(s);
  const N = 100;
  const results = await Promise.all(Array.from({ length: N }, (_, i) => s.sendMessage("chatD", { text: "c" + i })));
  const order = s.sent.map((x) => x.content.text);
  t("3a. 100 pesan bersamaan → semua kekirim (gak ada yang ilang)", s.sent.length === N);
  t("3b. urutan tetap 0..99 walau fire-100-sekaligus", JSON.stringify(order) === JSON.stringify(Array.from({ length: N }, (_, i) => "c" + i)));
  t("3c. semua promise resolve dengan return value sendMessage asli", results.every((r) => r && r.key && r.key.id.startsWith("msg-")));
  const st = __getQueueStateForTest();
  t("3d. pending kembali 0 setelah selesai (gak leak)", st.pending["chatD"] === 0);
}

// ===== 4. Error satu job gak merusak chain =====
{
  __resetQueueForTest();
  _setQueueDelaysForTest(5, 5);
  let calls = 0;
  const s = {
    sendMessage: async (jid, content) => {
      calls++;
      if (calls === 3) throw new Error("boom");
      return { ok: calls };
    },
  };
  wrapSendQueue(s);
  const out = await Promise.allSettled(
    Array.from({ length: 6 }, (_, i) => s.sendMessage("chatE", { text: "e" + i })),
  );
  t("4a. job error nolak (status rejected) tapi lainnya jalan", out[2].status === "rejected" && out.filter((o) => o.status === "fulfilled").length === 5);
  t("4b. semua 6 job tetap diproses walau ada error", calls === 6);
}

// ===== 5. React chip & queue off bypass =====
{
  __resetQueueForTest();
  _setQueueDelaysForTest(3000, 3000); // kalau react ke-antre, bakal jelas lama
  const s = fakeSock();
  wrapSendQueue(s);
  const t0 = Date.now();
  await s.sendMessage("chatF", { react: { text: "✅" } });
  const elapsed = Date.now() - t0;
  t("5a. react chip bypass antrean (langsung, " + elapsed + "ms < 1000ms)", elapsed < 1000);

  _setQueueEnabledForTest(false);
  const t1 = Date.now();
  await s.sendMessage("chatF", { text: "noq" });
  t("5b. queue disabled → kirim langsung tanpa jeda (" + (Date.now() - t1) + "ms < 1000ms)", Date.now() - t1 < 1000);
}

// ===== 6. Guard dobel-wrap + state seam =====
{
  __resetQueueForTest();
  const s = fakeSock();
  wrapSendQueue(s);
  const afterFirst = s.sendMessage;
  wrapSendQueue(s);
  t("6a. wrap kedua diabaikan (anti delay dobel saat reload)", s.sendMessage === afterFirst);
  const st = __getQueueStateForTest();
  t("6b. seam state queue terekspos buat tes/monitor", typeof st.minDelay === "number" && typeof st.chats === "number");
}

// ===== 7. Integration: wiring connection.js =====
{
  const fs = require("node:fs");
  const src = fs.readFileSync(R("../../src/connection.js"), "utf8");
  t("7a. connection.js import rara-send-queue", /import \{ wrapSendQueue \} from "\.\/lib\/rara-send-queue\.js"/.test(src));
  t("7b. wrapSendQueue(sock) dipanggil setelah makeWASocket", /wrapSendQueue\(sock\);/.test(src));
  t("7c. queue WAJIB aktif default (bukan di-comment)", !/\/\/\s*wrapSendQueue/.test(src));
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
if (fail > 0) process.exit(1);
