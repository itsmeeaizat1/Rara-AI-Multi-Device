// NOVA AI WHATSAPP BOT — E2E: AGENT MEMORY LAYER (upgrade #2 "bot masa depan")
// Owner 25 Sep 2026: "harusnya nyambung ke dua ai agent novaagent dan
// aisuperagent" + "autonovaagent juga harusnya punya memory jangka panjang
// krna itu ai otomatis". Engine = nova-memory.js (store per-user db.setting
// "novaMemory"); ini nge-verifikasi WIRING-nya: engine sanity, injeksi blok
// memori ke prompt runAgent, agentloop & autotask (recall + auto-extract),
// dan static wiring .aisuperagent/.novaagent/autoflow aichat.
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentmem-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));
const db = getDatabase();

const mem = await import(R + "/src/lib/nova-memory.js");
const {
  addMemory, listMemories, removeMemory, resetMemories,
  toggleMemory, isMemoryOn, memoryBlock, relevantMemories,
} = mem;

const OWNER = "628174887770@s.whatsapp.net";
const U = "6289988776655@s.whatsapp.net";
const sent = [];
const sock = { sendMessage: async (jid, payload) => { sent.push({ jid, text: payload.text }); return true; } };

console.log("— section 1: engine nova-memory.js (sanity: add/dedupe/recall/off/cap) —");
{
  resetMemories(db, U);
  t("1a. addMemory tersimpan", addMemory(db, U, "pelihara kucing bernama Lucas") === true && listMemories(db, U).length === 1);
  t("1b. dedupe parafase ditolak (Jaccard >= 0.5)", addMemory(db, U, "punya kucing bernama Lucas") === false && listMemories(db, U).length === 1);
  addMemory(db, U, "kerja shift malam di pabrik");
  const rel = relevantMemories(db, U, "gimana nasib kucing lucas", 2);
  t("1c. recall: fakta relevan ke topik menang", rel.length === 2 && /Lucas/.test(rel[0].text), rel.map((x) => x.text.slice(0, 30)));
  const blk = memoryBlock(db, U, "kucing");
  t("1d. memoryBlock berformat blok + isi fakta", blk.includes("== MEMORI TENTANG USER (yang kamu inget dari obrolan sebelumnya) ==") && blk.includes("Lucas"), blk?.slice(0, 80));
  t("1e. memory off → blok kosong", toggleMemory(db, U, false) === false && isMemoryOn(db, U) === false && memoryBlock(db, U, "kucing") === "");
  t("1f. memory on lagi → blok balik", toggleMemory(db, U, true) === true && memoryBlock(db, U, "kucing").includes("Lucas"));
  t("1g. removeMemory 1-based + resetMemories", removeMemory(db, U, 2) === true && listMemories(db, U).length === 1 && resetMemories(db, U) === true && listMemories(db, U).length === 0);
  // cap 30: fakta ke-31 evict paling lama
  resetMemories(db, U);
  for (let i = 1; i <= 32; i++) addMemory(db, U, `fakta nomor ${String(i).padStart(3, "0")} kode${i}`);
  const list = listMemories(db, U);
  t("1h. cap 30 fakta, paling lama ke-evict", list.length === 30 && /kode3\b/.test(list[0].text) && !/kode[12]\b/.test(list.map((x) => x.text).join(" ")), { len: list.length, first: list[0]?.text });
  resetMemories(db, U);
}

console.log("— section 2: runAgent opts.memBlock — blok nyangkut di prompt AI —");
{
  const { runAgent, setAgentDeps, resetAgentDeps } = await import(R + "/src/lib/nova-agent.js");
  resetMemories(db, U);
  addMemory(db, U, "suka kopi susu gula aren");

  let aiCalls = [];
  let n = 0;
  setAgentDeps({
    aiChat: async (p) => {
      aiCalls.push(String(p));
      n++;
      if (n === 1) return `{"mode":"persona","persona":"teman ngobrol"}`;
      return "oke siap, aku inget kamu suka kopi susu gula aren!";
    },
  });
  let r = await runAgent("rekomendasikan minuman buat aku", { memBlock: memoryBlock(db, U, "rekomendasikan minuman") });
  t("2a. persona mode jalan", r.mode === "persona" && /kopi susu/.test(r.answer), r);
  t("2b. blok memori ke-inject ke prompt plan", aiCalls[0].includes("MEMORI TENTANG USER") && aiCalls[0].includes("suka kopi susu gula aren"), aiCalls[0]?.slice(0, 120));
  t("2c. blok memori ikut ke prompt persona (compose)", aiCalls[1].includes("suka kopi susu gula aren"), aiCalls[1]?.slice(0, 120));

  // tanpa memBlock → prompt bersih dari blok memori
  aiCalls = []; n = 0;
  setAgentDeps({
    aiChat: async (p) => {
      aiCalls.push(String(p));
      n++;
      if (n === 1) return `{"mode":"persona","persona":"teman"}`;
      return "jawab";
    },
  });
  await runAgent("halo", {});
  t("2d. tanpa memBlock → prompt tanpa blok", !aiCalls[0].includes("MEMORI TENTANG USER"), aiCalls[0]?.slice(0, 80));

  // research compose juga kena injeksi (plan → pick → compose = call ke-3)
  resetMemories(db, U);
  addMemory(db, U, "domisili di Bandung, hobi naik gunung");
  aiCalls = []; n = 0;
  setAgentDeps({
    aiChat: async (p) => {
      aiCalls.push(String(p));
      n++;
      if (n === 1) return `{"mode":"research","queries":["gunung favorit bandung"]}`;
      return "bukan json";
    },
    search: async () => ({ items: [{ title: "Gunung di Bandung", url: "https://contoh.id/gunung", snippet: "Tangkuban Perahu" }] }),
    preview: async () => ({ text: "Tangkuban Perahu adalah gunung di Bandung." }),
  });
  r = await runAgent("rekomendasikan gunung buat weekend", { memBlock: memoryBlock(db, U, "rekomendasikan gunung") });
  t("2e. research mode jalan sampai compose", r.mode === "research" && aiCalls.length >= 3, { mode: r.mode, calls: aiCalls.length });
  t("2f. blok memori ke-inject ke prompt compose riset", aiCalls.some((c) => c.includes("MEMORI TENTANG USER") && c.includes("naik gunung")), aiCalls.map((c) => c.slice(0, 40)));
  resetAgentDeps();
  resetMemories(db, U);
}

console.log("— section 3: .agentloop — recall ke prompt putaran + auto-extract —");
{
  const al = await import(R + "/plugins/owner/agentloop.js");
  const I = al._agentloopInternalsForTest();
  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });

  resetMemories(db, OWNER);
  addMemory(db, OWNER, "punya proyek bot whatsapp bernama Nova");

  let runnerPrompt = "";
  const extracts = [];
  I.resetSeams();
  I.setExtractor(async (dbx, sender, instr, res) => { extracts.push({ sender, instr: String(instr), res: String(res) }); return 0; });
  I.setPlanner(async () => JSON.stringify({ goal: "audit fitur Nova", criteria: "ada daftar fitur", steps: ["baca fitur"] }));
  I.setRunner(async (prompt) => { runnerPrompt = String(prompt); return "HASIL PUTARAN 1: audit oke"; });
  I.setCritic(async () => JSON.stringify({ satisfied: true, missing: "", next: "" }));
  I.setComposer(async () => "JAWABAN FINAL: audit selesai.");

  await al.handler(mkM({ text: "audit fitur nova bot" }), { sock, db, config: { command: { prefix: "." } } });
  await wait(900);
  t("3a. prompt putaran mengandung fakta memori owner", runnerPrompt.includes("punya proyek bot whatsapp bernama Nova"), runnerPrompt?.slice(0, 90));
  t("3b. auto-extract jalan pasca hasil putaran, sender = pemilik loop", extracts.length >= 1 && extracts[0].sender === OWNER, extracts);
  t("3c. extractor nerima instruksi putaran + hasilnya", extracts[0] && extracts[0].instr === "baca fitur" && /HASIL PUTARAN/i.test(extracts[0].res), extracts[0]);

  // memory off → prompt putaran tanpa blok memori
  toggleMemory(db, OWNER, false);
  runnerPrompt = ""; extracts.length = 0;
  await al.handler(mkM({ text: "audit kedua fitur nova" }), { sock, db, config: { command: { prefix: "." } } });
  await wait(900);
  t("3d. memory off → prompt putaran tanpa blok memori", !runnerPrompt.includes("MEMORI TENTANG USER"), runnerPrompt?.slice(0, 90));
  t("3e. memory off → extractor tetap dipanggil (extractMemories skip sendiri)", extracts.length >= 1, extracts.length);
  toggleMemory(db, OWNER, true);
  resetMemories(db, OWNER);
  I.resetSeams();
}

console.log("— section 4: .autotask — recall ke prompt tahap + auto-extract —");
{
  const at = await import(R + "/plugins/owner/autotask.js");
  const I = at._autotaskInternalsForTest();
  const replies = [];
  const mkM = (over = {}) => ({
    text: "", chat: OWNER, sender: OWNER, isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
    ...over,
  });

  resetMemories(db, OWNER);
  addMemory(db, OWNER, "wishlist beli keyboard mekanik");

  let stagePrompt = "";
  const extracts = [];
  I.resetSeams();
  I.setExtractor(async (dbx, sender, instr, res) => { extracts.push({ sender, instr: String(instr), res: String(res) }); return 0; });
  I.setPlanner(async () => JSON.stringify([{ title: "Riset", instruction: "cari keyboard mekanik terbaik" }]));
  I.setStageRunner(async (prompt, stage) => { stagePrompt = String(prompt); return `HASIL TAHAP: ${stage.title} — nemu 3 kandidat`; });

  await at.handler(mkM({ text: "riset keyboard mekanik buat aku" }), { sock, db, config: { command: { prefix: "." } } });
  await wait(900);
  t("4a. prompt tahap mengandung fakta memori owner", stagePrompt.includes("wishlist beli keyboard mekanik"), stagePrompt?.slice(0, 90));
  t("4b. auto-extract jalan pasca tahap sukses, sender = pemilik tugas", extracts.length >= 1 && extracts[0].sender === OWNER, extracts);

  // tahap GAGAL → gak ada ekstraksi (hasil null gak ada bahan)
  extracts.length = 0;
  I.resetSeams();
  I.setExtractor(async (dbx, sender, instr, res) => { extracts.push(1); return 0; });
  I.setPlanner(async () => JSON.stringify([{ title: "Gagal", instruction: "tahap yang bakal gagal" }]));
  I.setStageRunner(async () => { throw new Error("upstream mati"); });
  await at.handler(mkM({ text: "tugas yang tahapnya gagal" }), { sock, db, config: { command: { prefix: "." } } });
  await wait(900);
  t("4c. tahap gagal → tanpa ekstraksi (jujur, gak ada hasil)", extracts.length === 0, extracts.length);
  resetMemories(db, OWNER);
  I.resetSeams();
}

console.log("— section 5: wiring statis semua pintu agent (owner 25 Sep) —");
{
  const src = (p) => fs.readFileSync(R + "/" + p, "utf8");
  const agentJs = src("plugins/ai/agent.js");
  t("5a. .aisuperagent: recall (memBlock) + auto-extract terpasang", agentJs.includes("memBlock: memoryBlock(db, m.sender, task)") && agentJs.includes("extractMemories(db, m.sender, task"), null);
  const novaaiJs = src("plugins/ai/novaai.js");
  t("5b. .novaagent: recall + extract udah nyambung (store sama)", novaaiJs.includes("memoryBlock(db, m.sender") && novaaiJs.includes("extractMemories(db, m.sender"), null);
  const autoflowJs = src("src/lib/autoflow.js");
  t("5c. .anovaagent rule aichat (AI otomatis): recall + extract", autoflowJs.includes("memoryBlock(getDatabase(), user") && autoflowJs.includes("extractMemories(getDatabase(), user"), null);
  const engineJs = src("src/lib/nova-agent.js");
  t("5d. engine runAgent nerima opts.memBlock + inject ${mem}", engineJs.includes("memBlock } = {}") && engineJs.includes("${mem}"), null);
  const loopJs = src("plugins/owner/agentloop.js");
  t("5e. agentloop: memoryBlock per-sender + extractor seam", loopJs.includes("memoryBlock(getDatabase(), run.sender") && loopJs.includes("setExtractor"), null);
  const atJs = src("plugins/owner/autotask.js");
  t("5f. autotask: memoryBlock per-sender + extractor seam", atJs.includes("memoryBlock(getDatabase(), task.sender") && atJs.includes("setExtractor"), null);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
