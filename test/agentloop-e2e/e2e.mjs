// RARA AI - MULTI DEVICE — E2E: .AGENTLOOP — agent loop iteratif dengan self-critique
// Upgrade #1 "bot masa depan" (owner 24 Sep 2026): plan → kerjakan → kritik diri
// → koreksi → ulangi, budget putaran, laporan jujur saat budget habis.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 220) : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentloop-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const al = await import(R + "/plugins/ai-agent/agentloop.js");
const { config: pc, handler } = al;
const I = al._agentloopInternalsForTest();
const cfg = { command: { prefix: "." } };

// mock sock — nangkep DM ke owner
const OWNER = "628174887770@s.whatsapp.net";
let sent = [];
const sock = { sendMessage: async (jid, payload) => { sent.push({ jid, text: payload.text }); return true; } };

const mkM = (over = {}) => ({
  text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
  reply: async (x) => replies.push(String(x)),
  ...over,
});
let replies = [];

console.log("— section 1: parseJsonObject & normalizePlan (planner) —");
{
  const o = I.parseJsonObject(`{"goal":"g","criteria":"c","steps":["a","b"]}`);
  t("1a. JSON murni keparse", o?.goal === "g" && o.steps.length === 2, o);
  const o2 = I.parseJsonObject("```json\n{\"goal\":\"g\"}\n```");
  t("1b. JSON dalam code fence keparse", o2?.goal === "g", o2);
  t("1c. teks ngawur → null", I.parseJsonObject("AI mati jawab") === null);
  // perilaku sama kayak parseStages autotask: array → objek PERTAMA diambil
  t("1d. array → objek pertama terekstrak", I.parseJsonObject('[{"a":1}]')?.a === 1);

  const p1 = I.normalizePlan(`{"goal":"bandingkan laptop","criteria":"ada rekomendasi final","steps":["cari data","bandingkan"]}`, "tugas");
  t("1e. plan normal", p1.goal === "bandingkan laptop" && p1.steps.length === 2, p1);
  const p2 = I.normalizePlan("AI mati", "tugas utuh");
  t("1f. planner gagal → fallback: goal=tugas, 1 langkah", p2.goal === "tugas utuh" && p2.steps.length === 1 && p2.steps[0] === "tugas utuh", p2);
  const p3 = I.normalizePlan(JSON.stringify({ goal: "x", steps: Array.from({ length: 9 }, (_, i) => "s" + i) }), "t");
  t("1g. maksimal 4 langkah (kecap)", p3.steps.length === 4, p3.steps?.length);
}

console.log("— section 2: loop happy path — 2 putaran lalu satisfied —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  sent = []; replies = [];
  I.setPlanner(async () => JSON.stringify({
    goal: "rekomendasi laptop gaming terbaik",
    criteria: "ada perbandingan minimal 3 laptop + 1 rekomendasi final",
    steps: ["cari 3 kandidat laptop", "bandingkan dan rekomendasikan"],
  }));
  let runN = 0;
  I.setRunner(async (prompt, run, n) => `HASIL PUTARAN ${n + 1}: ${prompt.slice(0, 30)}`);
  let critN = 0;
  I.setCritic(async () => {
    critN++;
    return critN === 1
      ? JSON.stringify({ satisfied: false, missing: "belum ada rekomendasi final", next: "susun rekomendasi final dari 3 kandidat" })
      : JSON.stringify({ satisfied: true, missing: "", next: "" });
  });
  I.setComposer(async () => "JAWABAN FINAL: beli laptop A.");

  await handler(mkM({ text: "riset laptop gaming terbaik lalu rekomendasikan" }), { sock, db: getDatabase(), config: cfg });
  t("2a. konfirmasi loop baru dibalas", replies.length === 1 && /loop baru|loop baru/i.test(replies[0]), replies[0]?.slice(0, 80));
  t("2b. konfirmasi nunjukin tujuan + budget", /rekomendasi laptop/i.test(replies[0]) && /4 putaran/.test(replies[0]), replies[0]?.slice(0, 160));
  const run0 = I.store().runs.l1;
  t("2c. loop kepersist status running", run0?.status === "running", run0?.status);

  await wait(900);
  const run = I.store().runs.l1;
  t("2d. loop selesai → status done + met true", run?.status === "done" && run.met === true, { status: run?.status, met: run?.met });
  t("2e. 2 putaran tercatat dengan hasil", run.iterations.length === 2 && run.iterations.every((it) => it.result), run.iterations?.length);
  t("2f. putaran 2 pakai instruksi koreksi critic (self-correction)", /rekomendasi final dari 3 kandidat/i.test(String(run.iterations[1]?.instruction)), run.iterations[1]?.instruction);
  t("2g. critic per putaran terekam", run.iterations[0]?.critique?.satisfied === false && run.iterations[1]?.critique?.satisfied === true, run.iterations?.map((x) => x.critique?.satisfied));
  t("2h. jawaban final tersimpan", run.answer === "JAWABAN FINAL: beli laptop A.", run.answer?.slice(0, 60));

  const dms = sent.filter((s) => s.jid === OWNER);
  t("2i. DM progress per putaran terkirim", dms.length >= 3, dms.map((d) => d.text?.slice(0, 30)));
  t("2j. DM putaran 1 nunjukin evaluasi 'belum tercapai'", dms.some((d) => /belum tercapai/i.test(d.text)), dms[0]?.text?.slice(0, 120));
  t("2k. DM final 'SELESAI' + tercapai terkirim", dms.some((d) => /selesai|selesai/i.test(d.text) && /tercapai|tercapai/i.test(d.text)), dms.at(-1)?.text?.slice(0, 90));
}

console.log("— section 3: budget habis tanpa satisfied — laporan jujur —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  sent = []; replies = [];
  I.setPlanner(async () => JSON.stringify({ goal: "analisis pasar kripto", criteria: "prediksi akurat", steps: ["kumpulkan data"] }));
  I.setRunner(async (p, run, n) => `HASIL ${n + 1}`);
  I.setCritic(async () => JSON.stringify({ satisfied: false, missing: "data belum cukup", next: "cari lebih banyak data" }));
  I.setComposer(async () => "JAWABAN: sebagian.");

  await handler(mkM({ text: "analisis pasar kripto minggu ini" }), { sock, db: getDatabase(), config: cfg });
  await wait(1400);
  const run = I.store().runs.l2;
  t("3a. budget 4 putaran jalan semua (gak satisfied-satisfied)", run?.status === "done" && run.iterations.length === 4, { s: run?.status, n: run?.iterations?.length });
  t("3b. met=false — gak bohong tercapai", run.met === false, run.met);
  t("3c. putaran 2+ ikuti instruksi critic", /cari lebih banyak data/i.test(String(run.iterations[2]?.instruction)), run.iterations[2]?.instruction);
  t("3d. DM final jujur 'budget habis'", sent.some((d) => /budget|budget/i.test(d.text) && /habis|habis/i.test(d.text)), sent.at(-1)?.text?.slice(0, 120));
}

console.log("— section 4: putaran gagal + stop + subcommand —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  sent = []; replies = [];
  I.setPlanner(async () => JSON.stringify({ goal: "g", criteria: "c", steps: ["s1", "s2"] }));
  I.setRunner(async (p, run, n) => n === 0 ? null : `HASIL ${n + 1}`);
  I.setCritic(async () => JSON.stringify({ satisfied: false, missing: "m", next: "lanjut" }));
  I.setComposer(async () => "FINAL.");

  await handler(mkM({ text: "tugas loop nomor tiga" }), { sock, db: getDatabase(), config: cfg });
  await wait(700);
  const run3 = I.store().runs.l3;
  t("4a. putaran gagal dicatat, loop lanjut", run3?.iterations[0]?.result === null && run3?.cur >= 2, { r0: run3?.iterations?.[0]?.result, cur: run3?.cur });
  t("4b. DM putaran gagal terkirim", sent.some((d) => /gagal|gagal/i.test(d.text)), sent.map((d) => d.text?.slice(0, 30)));

  // ─── status ───
  replies = [];
  await handler(mkM({ text: "status" }), { sock, db: getDatabase(), config: cfg });
  t("4c. status nunjukin loop terakhir", replies.length === 1 && /status loop|status loop/i.test(replies[0]), replies[0]?.slice(0, 60));
  t("4d. status nunjukin iterasi + ikon evaluasi", /🟡|⚠️|✅/.test(replies[0]), replies[0]?.slice(0, 200));

  // ─── list ───
  replies = [];
  await handler(mkM({ text: "list" }), { sock, db: getDatabase(), config: cfg });
  t("4e. list nunjukin semua loop", /lup|L3|L3|l3/i.test(replies[0] || "") || /list|daftar/i.test(replies[0] || ""), replies[0]?.slice(0, 90));

  // ─── stop loop yang masih jalan (critic gak pernah puas, 4 putaran perlu waktu) ───
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  sent = []; replies = [];
  I.setPlanner(async () => JSON.stringify({ goal: "g4", criteria: "c4", steps: ["satu", "dua", "tiga", "empat"] }));
  // runner lambat biar loop masih jalan pas stop
  I.setRunner(async (p, run, n) => { await wait(120); return `HASIL ${n + 1}`; });
  I.setCritic(async () => JSON.stringify({ satisfied: false, missing: "m", next: "lanjut lagi" }));
  await handler(mkM({ text: "tugas keempat buat uji stop" }), { sock, db: getDatabase(), config: cfg });
  await wait(80); // biarkan putaran 1 jalan
  replies = [];
  await handler(mkM({ text: "stop" }), { sock, db: getDatabase(), config: cfg });
  t("4f. stop loop jalan dibalas", replies.length === 1 && /dihentikan|dihentikan/i.test(replies[0]), replies[0]?.slice(0, 80));
  const run4 = I.store().runs.l4;
  t("4g. status jadi stopped", run4?.status === "stopped", run4?.status);
  await wait(600);
  t("4h. loop berhenti beneran (gak nambah iterasi setelah stop)", (I.store().runs.l4?.iterations?.length || 0) <= 2, I.store().runs.l4?.iterations?.length);

  // ─── hasil (belum ada answer karena di-stop) ───
  replies = [];
  await handler(mkM({ text: "hasil l4" }), { sock, db: getDatabase(), config: cfg });
  t("4i. hasil loop di-stop → jujur belum ada jawaban final", replies.length === 1 && /belum punya|belum punya/i.test(replies[0]), replies[0]?.slice(0, 80));

  // ─── hasil l1 (ada answer) ───
  replies = [];
  await handler(mkM({ text: "hasil l1" }), { sock, db: getDatabase(), config: cfg });
  t("4j. hasil final dikirim ke DM", replies.length === 1 && /dikirim|dikirim/i.test(replies[0]) && sent.some((d) => /jawaban final|jawaban final/i.test(d.text)), replies[0]?.slice(0, 80));
}

console.log("— section 5: resume setelah restart + guard dobel —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  sent = []; replies = [];
  // loop "running" tersisa l3? buat kondisi manual: set l3 jadi running lagi
  const st = I.store();
  st.runs.l3.status = "running";
  st.runs.l3.cur = 1; // putaran 1 selesai, lanjut dari putaran 2
  // kondisi realistis pas restart: putaran in-flight (index 1) gak kesimpen
  // hasilnya — iterasi di luar cur dibuang, resume ngerjain ulang putaran itu
  st.runs.l3.iterations = st.runs.l3.iterations.slice(0, 1);
  let resumed = 0;
  I.setRunner(async (p, run, n) => { resumed++; return `RESUME HASIL ${n + 1}`; });
  I.setCritic(async () => JSON.stringify({ satisfied: true, missing: "", next: "" }));
  I.setComposer(async () => "FINAL RESUME.");
  await I.resumeAgentLoops(sock);
  await wait(900);
  const run3 = I.store().runs.l3;
  t("5a. resume ngerjain loop running setelah restart", run3?.status === "done", run3?.status);
  t("5b. resume lanjut dari putaran tersimpan (bukan dari awal)", run3?.iterations.length === 2 && /RESUME HASIL 2/.test(String(run3?.iterations[1]?.result)), { n: run3?.iterations?.length, r: run3?.iterations?.[1]?.result });
  t("5b2. resume dinilai met oleh critic putaran terakhir", run3?.met === true && run3?.iterations[1]?.critique?.satisfied === true, { met: run3?.met, c: run3?.iterations?.[1]?.critique });
  t("5c. guard: resume gak dobel (running set)", resumed >= 1, resumed);

  // guard dobel — resumeAgentLoops dua kali barengan gak dobel loop
  const before = sent.length;
  await I.resumeAgentLoops(sock); // semua udah done — gak ada yang di-resume
  await wait(200);
  t("5d. resume tanpa loop running → no-op", sent.length === before, { before, after: sent.length });
}

console.log("— section 6: usage tanpa argumen —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  replies = [];
  await handler(mkM({ text: "" }), { sock, db: getDatabase(), config: cfg });
  t("6a. usage desain final keluar (『 *Nama* 』)", replies.length === 1 && /『 \*Agentloop\* 』/.test(replies[0]) && /📝/.test(replies[0]), replies[0]?.slice(0, 60));
  t("6b. usage nunjukin bedanya sama autotask", /autotask|autotask/i.test(replies[0]), replies[0]?.includes("autotask"));

  // tugas kependekan
  replies = [];
  await handler(mkM({ text: "singkat" }), { sock, db: getDatabase(), config: cfg });
  t("6c. tugas <8 char ditolak jujur", replies.length === 1 && /kependekan|kependekan/i.test(replies[0]), replies[0]?.slice(0, 80));
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
