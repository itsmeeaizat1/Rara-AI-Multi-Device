// NOVA AI WHATSAPP BOT — E2E: .AUTOTASK — agent tugas otonom berjangka
// Saran fitur #5: kerjain bertahap di background, lapor tiap milestone ke DM owner.
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "autotask-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const at = await import(R + "/plugins/ai-agent/autotask.js");
const { config: pc, handler } = at;
const I = at._autotaskInternalsForTest();
const cfg = { command: { prefix: "." } };

// mock sock — nangkep DM ke owner
const OWNER = "628174887770@s.whatsapp.net";
const sent = [];
const sock = { sendMessage: async (jid, payload) => { sent.push({ jid, text: payload.text }); return true; } };

console.log("— section 1: parseStages (planner) —");
{
  const s = I.parseStages(`[{"title":"Riset","instruction":"cari data"},{"title":"Rangkum","instruction":"susun laporan"}]`, "x");
  t("1a. JSON murni keparse", s.length === 2 && s[0].title === "Riset", s);
  const s2 = I.parseStages("```json\n[{\"title\":\"A\",\"instruction\":\"kerjakan a\"}]\n```", "x");
  t("1b. JSON dalam code fence keparse", s2.length === 1 && s2[0].instruction === "kerjakan a", s2);
  const s3 = I.parseStages("AI mati jawab ngawur", "tugas induk");
  t("1c. AI gagal → fallback 1 tahap = tugas utuh", s3.length === 1 && s3[0].instruction === "tugas induk", s3);
  const s4 = I.parseStages("[{'title':'x'}]", "fallback ini");
  t("1d. JSON rusak → fallback tugas utuh", s4.length === 1 && s4[0].instruction === "fallback ini");
  const s5 = I.parseStages(JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ title: "T" + i, instruction: "i" + i }))), "x");
  t("1e. maksimal 6 tahap (kecap)", s5.length === 6, s5.length);
}

console.log("— section 2: buat tugas via handler + loop + DM milestone —");
{
  I.resetSeams();
I.setExtractor(async () => 0); // memory layer: jangan ekstrak live di e2e
  I.setPlanner(async () => JSON.stringify([
    { title: "Riset data", instruction: "cari data di web" },
    { title: "Susun laporan", instruction: "rangkum jadi 5 poin" },
  ]));
  I.setStageRunner(async (prompt, stage, idx) => `HASIL TAHAP ${idx + 1}: ${stage.title} — ${prompt.slice(0, 30)}`);

  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });

  await handler(mkM({ text: "riset tren AI minggu ini lalu rangkum" }), { sock, db: getDatabase(), config: cfg });
  t("2a. konfirmasi tugas baru dibalas", replies.length === 1 && /tugas baru|ᴛᴜɢᴀꜱ/i.test(replies[0]), replies[0]?.slice(0, 80));
  t("2b. konfirmasi nunjukin 2 tahap", replies[0].includes("2") && /riset data|susun laporan/i.test(replies[0]), replies[0]?.slice(0, 120));
  t("2c. tugas kepersist di db status running", I.store().tasks.t1?.status === "running", I.store().tasks);

  // tunggu loop kelar (2 tahap instan tanpa jeda)
  await wait(900);
  const task = I.store().tasks.t1;
  t("2d. loop selesai sendiri → status done", task?.status === "done", task?.status);
  t("2e. kedua tahap done + hasil kesimpen", task.stages.every((s) => s.status === "done" && s.result), task.stages?.map((s) => s.status));
  t("2f. cur maju melewati jumlah tahap", task.cur >= 2, task.cur);

  const dms = sent.filter((s) => s.jid === OWNER);
  t("2g. DM milestone terkirim ke owner", dms.length >= 3, dms.map((d) => d.text?.slice(0, 40)));
  t("2h. DM per tahap nyebut hasilnya", dms.some((d) => /HASIL TAHAP 1/.test(d.text)), dms[0]?.text?.slice(0, 90));
  t("2i. DM final tugas selesai terkirim", dms.some((d) => /SELESAI/i.test(d.text)), dms.map((d) => d.text?.slice(0, 30)));
}

console.log("— section 3: subcommand list/status/stop/pause/lanjut —");
{
  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });
  replies.length = 0;
  await handler(mkM({ text: "list" }), { sock, db: getDatabase(), config: cfg });
  t("3a. list nunjukin tugas t1", /t1/i.test(replies[0] || ""), (replies[0] || "").slice(0, 80));
  replies.length = 0;
  await handler(mkM({ text: "status t1" }), { sock, db: getDatabase(), config: cfg });
  t("3b. status detail t1 done", /t1|ꜱᴛᴀᴛᴜꜱ/i.test(replies[0] || "") && /riset|tren/i.test(replies[0] || ""), (replies[0] || "").slice(0, 80));
  replies.length = 0;

  // tugas baru buat tes stop/pause
  I.setPlanner(async () => JSON.stringify([{ title: "Tahap A", instruction: "kerjakan a" }, { title: "Tahap B", instruction: "kerjakan b" }]));
  let gate = Promise.resolve();
  I.setStageRunner(async () => { await gate; return "hasil a"; });
  await handler(mkM({ text: "tugas kedua jeda 5" }), { sock, db: getDatabase(), config: cfg });
  t("3c. tugas kedua dibuat (jeda keparse)", I.store().tasks.t2?.jedaMin === 5, I.store().tasks.t2?.jedaMin);
  gate = new Promise(() => {}); // tahap 2 gantung → tugas masih running

  await handler(mkM({ text: "pause t2" }), { sock, db: getDatabase(), config: cfg });
  t("3d. pause → status paused", I.store().tasks.t2.status === "paused", I.store().tasks.t2.status);
  replies.length = 0;
  await handler(mkM({ text: "lanjut t2" }), { sock, db: getDatabase(), config: cfg });
  t("3e. lanjut → status running lagi", I.store().tasks.t2.status === "running", I.store().tasks.t2.status);
  await handler(mkM({ text: "stop t2" }), { sock, db: getDatabase(), config: cfg });
  t("3f. stop → status stopped", I.store().tasks.t2.status === "stopped", I.store().tasks.t2.status);

  // ganti runner jadi resolve langsung biar loop lanjut gak gantung
  I.setStageRunner(async () => "hasil b");
  replies.length = 0;
  await handler(mkM({ text: "laporan t1" }), { sock, db: getDatabase(), config: cfg });
  const laporanDm = sent.filter((s) => /SEMUA LAPORAN/i.test(s.text || ""));
  t("3g. laporan dikirim ulang ke DM owner", laporanDm.length >= 1 && laporanDm.at(-1).jid === OWNER, laporanDm.length);
  t("3h. konfirmasi laporan dibalas di chat", replies.length === 1 && /dm/i.test(replies[0]), (replies[0] || "").slice(0, 60));
}

console.log("— section 4: resume setelah restart + guard —");
{
  // t2 stopped; buat t3 running lalu "restart" = resumeAutoTasks
  const st = I.store();
  st.seq = 3;
  st.tasks.t3 = {
    id: "t3", task: "tugas nyangkut pas restart",
    stages: [
      { title: "Tahap 1", instruction: "a", status: "done", result: "hasil 1", finishedAt: 1 },
      { title: "Tahap 2", instruction: "b", status: "pending", result: null, finishedAt: null },
    ],
    status: "running", cur: 1, jedaMin: 0, createdAt: Date.now(), reports: [],
  };
  I.setStageRunner(async () => "hasil tahap 2");
  await I.resumeAutoTasks(sock);
  await wait(900);
  const t3 = I.store().tasks.t3;
  t("4a. resume melanjutkan dari tahap 2 (tahap 1 gak diulang)", t3.stages[0].result === "hasil 1" && t3.stages[1].status === "done", t3.stages.map((s) => s.status));
  t("4b. resume sampai selesai → done", t3.status === "done", t3.status);

  // tugas failed stage gak bikin loop mati
  const st2 = I.store();
  st2.seq = 4;
  st2.tasks.t4 = {
    id: "t4", task: "tugas dengan tahap gagal",
    stages: [
      { title: "Gagal", instruction: "a", status: "pending", result: null, finishedAt: null },
      { title: "Berhasil", instruction: "b", status: "pending", result: null, finishedAt: null },
    ],
    status: "running", cur: 0, jedaMin: 0, createdAt: Date.now(), reports: [],
  };
  I.setStageRunner(async (p, stage, idx) => (idx === 0 ? null : "hasil tahap 2"));
  await I.resumeAutoTasks(sock);
  await wait(900);
  const t4 = I.store().tasks.t4;
  t("4c. tahap gagal dilanjut (gak mati)", t4.stages[0].status === "failed" && t4.stages[1].status === "done", t4.stages.map((s) => s.status));
  t("4d. laporan gagal tetap masuk DM", sent.some((s) => /GAGAL/i.test(s.text || "")), true);
}

console.log("— section 5: validasi input & metadata —");
{
  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });
  replies.length = 0;
  await handler(mkM({ text: "" }), { sock, db: getDatabase(), config: cfg });
  t("5a. tanpa input → panduan lengkap", replies.length === 1 && /autotask/i.test(replies[0]), replies[0]?.slice(0, 60));
  replies.length = 0;
  await handler(mkM({ text: "abc" }), { sock, db: getDatabase(), config: cfg });
  t("5b. tugas kependekan ditolak", /kependekan/i.test(replies[0] || ""), (replies[0] || "").slice(0, 60));
  t("5c. owner-only", pc.isOwner === true, pc.isOwner);
  t("5d. alias agenttugas/tugasai kebaca", (pc.alias || []).includes("agenttugas") && (pc.alias || []).includes("tugasai"));
  t("5e. persisten di db (bukan memory)", getDatabase().data.autotask?.tasks?.t1 != null, Object.keys(getDatabase().data.autotask?.tasks || {}));
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
