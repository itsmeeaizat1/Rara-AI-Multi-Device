// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .agentloop — AGENT LOOP ITERATIF dengan self-critique (upgrade #1 menuju
 * bot "masa depan", disetujui owner 24 Sep 2026).
 *
 * Gap yang ditutup: .novaagent/.aisuperagent = ONE-SHOT (plan → eksekusi →
 * selesai), .autotask = tahapan berjangka tapi rencana disusun SEKALI dan
 * hasilnya GAK pernah diverifikasi. .agentloop menambahkan siklus sejati:
 *
 *   PLAN → KERJAKAN → AMATI HASIL → KRITIK DIRI → (belum tercapai? ulangi
 *   dengan koreksi) → ... → JAWABAN FINAL
 *
 * Tiap putaran, AI menilai sendiri: "apakah tujuan udah tercapai? kalau
 * belum, apa yang kurang?" — instruksi putaran berikutnya lahir dari
 * jawaban kritik itu (self-correction), bukan rencana kaku. Ada budget
 * putaran biar gak jalan selamanya, dan laporan jujur kalau tujuan belum
 * sepenuhnya tercapai saat budget habis.
 *
 * Commands (owner-only):
 *   .agentloop <tugas>     — jalankan loop, progress tiap putaran → DM owner
 *   .agentloop list         — daftar semua loop
 *   .agentloop status [id]  — status detail loop
 *   .agentloop stop [id]    — hentikan loop
 *   .agentloop hasil [id]   — kirim ulang jawaban final ke DM
 *
 * Persisten di db.data.agentloop — restart bot, loop "running" dilanjut
 * otomatis dari putaran berikutnya (resumeAgentLoops dipanggil index.js).
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaBox, novaGuide } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { runAgent } from "../../src/lib/nova-agent.js";
import { memoryBlock, extractMemories } from "../../src/lib/nova-memory.js";
import { skillsBlock } from "../../src/lib/nova-askills.js";
import config from "../../config.js";

const pluginConfig = {
  name: "agentloop",
  alias: ["agentloop", "loopagent", "aicycle"],
  category: "owner",
  description: "Agent loop iteratif — kerjakan, evaluasi diri, koreksi, ulangi sampai tujuan tercapai",
  usage: ".agentloop <tugas/list/status/stop/hasil>",
  example: ".agentloop riset 3 laptop gaming terbaik 2026, bandingkan, kasih rekomendasi final\n.agentloop status\n.agentloop hasil l1",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ────────────────────────────────────────────────────────────────────────────
// KONSTAN & STATE
// ────────────────────────────────────────────────────────────────────────────

// knob: AGENTLOOP_MAX_ITER — pakai !== undefined (GOTCHA falsy: 0 valid input tapi gak masuk akal, dibesarin ke min 1)
const MAX_ITER = process.env.AGENTLOOP_MAX_ITER !== undefined
  ? Math.max(1, parseInt(process.env.AGENTLOOP_MAX_ITER, 10) || 4)
  : 4;
const ITER_TIMEOUT_MS = 5 * 60_000;  // maks 5 menit per putaran (kerjakan+kritik)
const CRITIC_TIMEOUT_MS = 60_000;   // maks 60 detik kritik/compose
const RESULT_CAP = 1200;             // cap hasil per putaran (disimpan + DM)
const ANSWER_CAP = 3000;             // cap jawaban final
const MAX_LOOPS = 20;                // cap jumlah loop tersimpan

const running = new Set(); // id yang loop-nya lagi hidup di proses ini

// seams buat e2e
let _planner = null;   // override penyusun rencana awal
let _runner = null;    // override eksekusi putaran
let _critic = null;    // override evaluator diri
let _composer = null;  // override penyusun jawaban final
let _extractor = null; // override ekstraksi memori (nova-memory.js)

// ────────────────────────────────────────────────────────────────────────────
// STORE — persisten di db.data.agentloop
// ────────────────────────────────────────────────────────────────────────────

function store() {
  const db = getDatabase();
  if (!db.data.agentloop) db.data.agentloop = { runs: {}, seq: 0 };
  if (!db.data.agentloop.runs) db.data.agentloop.runs = {};
  return db.data.agentloop;
}

function save() {
  const db = getDatabase();
  db.markDirty?.("agentloop");
  db.db?.write?.();
}

function ownerJid() {
  const n = (config.owner?.number || [])[0] || "";
  const digits = String(n).replace(/\D/g, "");
  return digits ? digits + "@s.whatsapp.net" : "";
}

async function dmOwner(sock, text) {
  const jid = ownerJid();
  if (!sock || !jid) return false;
  try {
    await sock.sendMessage(jid, { text });
    return true;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PARSE JSON — toleran fence/pembuka (pola parseStages autotask)
// ────────────────────────────────────────────────────────────────────────────

function parseJsonObject(raw) {
  try {
    let s = String(raw || "").trim();
    s = s.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("bukan objek");
    const obj = JSON.parse(s.slice(start, end + 1));
    if (typeof obj !== "object" || obj === null) throw new Error("bukan objek");
    return obj;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 1: PLANNER — susun tujuan, kriteria tercapai, langkah awal
// ────────────────────────────────────────────────────────────────────────────

function normalizePlan(raw, task) {
  const obj = parseJsonObject(raw);
  const steps = Array.isArray(obj?.steps)
    ? obj.steps.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return {
    goal: String(obj?.goal || task).trim().slice(0, 300) || task,
    criteria: String(obj?.criteria || "hasil menjawab tugas user secara lengkap dan faktual").trim().slice(0, 300),
    steps: steps.length ? steps : [task], // fallback: 1 langkah = tugas utuh
  };
}

async function planLoop(task) {
  const doPlan = _planner !== null ? _planner : async (t) => {
    try {
      const res = await callAI(
        `Susun rencana AI agent untuk tugas berikut. Rencana minimal 1 maksimal 4 langkah awal (agent boleh koreksi diri dan nambah langkah sendiri nanti).\n\n` +
        `Tugas: "${t}"\n\n` +
        `Balas HANYA objek JSON murni tanpa markdown tanpa kalimat pembuka:\n` +
        `{"goal":"tujuan akhir yang harus tercapai, 1 kalimat","criteria":"kriteria terukur kapan tujuan dianggap TERCAPAI","steps":["langkah 1","langkah 2"]}`,
        { systemPrompt: "Kamu perencana tugas AI. Balas JSON objek murni tanpa markdown, tanpa kalimat pembuka.", temperature: 0.3, maxTokens: 400 }
      );
      return typeof res === "string" ? res : null;
    } catch { return null; }
  };
  return normalizePlan(await doPlan(task), task);
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 2: EKSEKUSI PUTARAN — engine sama kayak .novaagent (penalaran + riset)
// ────────────────────────────────────────────────────────────────────────────

function scratchpadOf(run) {
  const done = (run.iterations || []).filter((it) => it.result);
  if (!done.length) return "(belum ada hasil)";
  return done
    .map((it) => `Putaran ${it.n}: ${String(it.instruction).slice(0, 120)}\nHasil: ${String(it.result).slice(0, RESULT_CAP)}`)
    .join("\n\n");
}

async function runIteration(run) {
  // instruksi putaran ini: koreksi dari kritik terakhir > langkah rencana > tugas utuh
  const prev = (run.iterations || [])[run.cur - 1];
  const instruction =
    (prev?.critique?.next ? String(prev.critique.next).trim() : "") ||
    (run.plan.steps[run.cur] ? String(run.plan.steps[run.cur]).trim() : "") ||
    run.task;

  const doRun = _runner !== null ? _runner : async (prompt) => {
    try {
      const res = await runAgent(prompt, {
        execTools: {}, // headless: penalaran + riset web (pola autotask)
        toolbox: "penalaran mandiri; riset/browsing web via search engine bawaan (mode research)",
      });
      return res?.answer ? String(res.answer) : null;
    } catch { return null; }
  };

  // 🔹 MEMORY LAYER: fakta durabel user (nova-memory.js — store sama kayak
  // .novaai/.novaagent) di-inject ke prompt putaran biar loop inget owner
  const memLine = run.sender ? memoryBlock(getDatabase(), run.sender, run.plan.goal) : "";
  const skillLine = skillsBlock(run.plan.goal);
  const prompt =
    `${memLine}${memLine ? "\n" : ""}${skillLine}${skillLine ? "\n" : ""}Tugas induk: "${run.plan.goal}"\n` +
    `Kriteria sukses: ${run.plan.criteria}\n` +
    `Hasil putaran sebelumnya (jangan ulangi kerja yang sama, isi celah yang kurang):\n${scratchpadOf(run)}\n\n` +
    `Kerjakan SAAT INI instruksi berikut: "${instruction}"\n` +
    `Balas HASIL putaran ini saja — ringkas, faktual, berbasis data nyata ` +
    `(browsing kalau butuh info terbaru). Tanpa pembuka basa-basi.`;
  const result = await doRun(prompt, run, run.cur);
  return typeof result === "string" && result.trim()
    ? result.trim().slice(0, RESULT_CAP * 2)
    : null;
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 3: KRITIK DIRI — apakah tujuan sudah tercapai?
// ────────────────────────────────────────────────────────────────────────────

function normalizeCritique(raw, run) {
  const obj = parseJsonObject(raw);
  if (obj && typeof obj.satisfied === "boolean") {
    return {
      satisfied: obj.satisfied,
      missing: String(obj.missing || "").trim().slice(0, 300),
      next: String(obj.next || "").trim().slice(0, 400),
    };
  }
  // critic mati → jujur "belum tercapai" supaya loop gak bohong puas;
  // next = langkah rencana berikutnya biar tetap maju
  const nextStep = run.plan.steps[(run.cur || 0) + 1] || "rangkum dan susun jawaban final dari hasil yang sudah ada";
  return { satisfied: false, missing: "(evaluator gagal menilai)", next: nextStep };
}

async function critiqueIteration(run) {
  const doCritique = _critic !== null ? _critic : async (prompt) => {
    try {
      const res = await callAI(prompt, {
        systemPrompt: "Kamu evaluator kritis. Balas JSON objek murni tanpa markdown, tanpa kalimat pembuka.",
        temperature: 0.2, maxTokens: 300,
      });
      return typeof res === "string" ? res : null;
    } catch { return null; }
  };
  const prompt =
    `Tugas induk: "${run.plan.goal}"\n` +
    `Kriteria sukses: ${run.plan.criteria}\n\n` +
    `Kumpulan hasil putaran agent sejauh ini:\n${scratchpadOf(run)}\n\n` +
    `Nilai dengan KEKRITISAN TINGGI: apakah kriteria sukses SUDAH tercapai penuh oleh hasil di atas? ` +
    `Jangan mudah puas — isi missing/next kalau masih ada celah.\n\n` +
    `Balas HANYA JSON murni:\n` +
    `{"satisfied":true,"missing":"","next":""}\n` +
    `(satisfied = true HANYA kalau kriteria benar-benar terpenuhi; kalau false, missing = yang kurang, next = instruksi putaran berikutnya untuk menutup celah itu)`;
  return normalizeCritique(await doCritique(prompt), run);
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 4: COMPOSE — jawaban final dari seluruh scratchpad
// ────────────────────────────────────────────────────────────────────────────

async function composeAnswer(run) {
  const doCompose = _composer !== null ? _composer : async (prompt) => {
    try {
      const res = await callAI(prompt, {
        systemPrompt: "Kamu penyusun laporan akhir. Jawab faktual berdasar HANYA data yang dikasih — jangan mengarang data baru.",
        temperature: 0.4, maxTokens: 1200,
      });
      return typeof res === "string" ? res : null;
    } catch { return null; }
  };
  const prompt =
    `Tugas: "${run.plan.goal}"\n\n` +
    `Kumpulan hasil kerja agent:\n${scratchpadOf(run)}\n\n` +
    `Susun JAWABAN AKHIR yang menjawab tugas itu secara lengkap dan padat, ` +
    `didasarkan 100% pada hasil kerja di atas. Format rapi per poin. Tanpa basa-basi pembuka.`;
  const out = await doCompose(prompt);
  // composer mati → jawaban jujur: hasil putaran terakhir apa adanya
  const fallback = (run.iterations || []).filter((it) => it.result).slice(-1)[0]?.result || "(tidak ada hasil)";
  return (typeof out === "string" && out.trim() ? out.trim() : fallback).slice(0, ANSWER_CAP);
}

// ────────────────────────────────────────────────────────────────────────────
// LOOP UTAMA — jalan di background, DM owner tiap putaran
// ────────────────────────────────────────────────────────────────────────────

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function fmtAt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

async function finishLoop(sock, run) {
  run.answer = await composeAnswer(run);
  run.status = "done";
  run.finishedAt = Date.now();
  save();
  await dmOwner(sock,
    `${run.met ? "✅" : "🟡"} AGENTLOOP ${run.id.toUpperCase()} SELESAI — ${run.iterations.length} putaran\n` +
    `${run.task.slice(0, 100)}\n\n` +
    `${run.met ? "Tujuan dinilai TERCAPAI oleh evaluator." : "Budget putaran habis sebelum tujuan dinilai penuh tercapai — hasil terbaik sejauh ini:"}\n\n` +
    `${run.answer}`
  );
}

async function runLoopLoop(sock, id) {
  if (running.has(id)) return;
  running.add(id);
  try {
    for (;;) {
      const run = store().runs[id];
      if (!run || run.status !== "running") break;
      if (run.cur >= run.maxIter) {
        await finishLoop(sock, run); // budget habis — jujur, compose apa adanya
        break;
      }
      const n = run.cur;
      run.iterations[n] = { n, instruction: "", result: null, critique: null, at: Date.now() };
      const it = run.iterations[n];
      // instruksi: koreksi kritik terakhir > langkah rencana > tugas utuh
      const prev = n > 0 ? run.iterations[n - 1] : null;
      it.instruction =
        (prev?.critique?.next ? String(prev.critique.next).trim() : "") ||
        (run.plan.steps[n] ? String(run.plan.steps[n]).trim() : "") ||
        run.task;
      save();
      const result = await withTimeout(runIteration(run), ITER_TIMEOUT_MS);
      it.result = result ? result.slice(0, RESULT_CAP) : null;
      it.finishedAt = Date.now();
      run.cur = n + 1;
      if (!result) {
        // putaran gagal tetap dicatat — critic gak menilai hasil kosong
        await dmOwner(sock,
          `⚠️ AGENTLOOP ${id.toUpperCase()} — putaran ${n + 1}/${run.maxIter} GAGAL (engine timeout/error).\n` +
          `Lanjut ke putaran berikutnya.`
        );
        save();
        continue;
      }
      // 🔹 auto-ekstrak fakta durabel baru (fire-and-forget, hormatin .memory off)
      const doExtract = _extractor !== null ? _extractor : extractMemories;
      try { Promise.resolve(doExtract(getDatabase(), run.sender, it.instruction, it.result)).catch(() => {}); } catch {}
      const critique = await withTimeout(critiqueIteration(run), CRITIC_TIMEOUT_MS);
      it.critique = critique;
      if (critique.satisfied) run.met = true;
      save();
      await dmOwner(sock,
        `🤖 AGENTLOOP ${id.toUpperCase()} — putaran ${n + 1}/${run.maxIter}\n` +
        `Kerja: ${String(it.instruction).slice(0, 80)}\n\n` +
        `${result.slice(0, 500)}\n\n` +
        `${critique.satisfied
          ? "✅ Evaluator: tujuan TERCAPAI — menyusun jawaban final."
          : `🔍 Evaluator: belum tercapai. Kurang: ${critique.missing || "-"}\nPutaran berikutnya: ${critique.next || "melanjutkan rencana"}`}`
      );
      if (critique.satisfied) {
        await finishLoop(sock, run);
        break;
      }
    }
  } catch (e) {
    try {
      const run = store().runs[id];
      if (run && run.status === "running") {
        run.status = "failed";
        run.error = String(e?.message || e).slice(0, 200);
        save();
        await dmOwner(sock, `❌ AGENTLOOP ${id.toUpperCase()} gagal: ${run.error}`);
      }
    } catch {}
  } finally {
    running.delete(id);
  }
}

/** Resume loop "running" pas boot (dipanggil dari index.js startup list). */
export async function resumeAgentLoops(sock) {
  try {
    const runs = store().runs;
    let n = 0;
    for (const id of Object.keys(runs)) {
      if (runs[id].status === "running" && !running.has(id)) {
        runLoopLoop(sock, id); // fire-and-forget
        n++;
      }
    }
    if (n) console.log(`[agentloop] resume ${n} loop`);
  } catch {}
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// HANDLER
// ────────────────────────────────────────────────────────────────────────────

const STATUS_ICON = { running: "🔄", done: "✅", stopped: "🛑", failed: "❌" };

function statusLine(run) {
  return `${STATUS_ICON[run.status] || "•"} ${run.cur}/${run.maxIter} putaran`;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const raw = (m.text || "").trim();
  if (!raw) {
    await m.reply(novaGuide(
      "agentloop",
      "Agent otonom iteratif — rencanakan, kerjakan, evaluasi diri, koreksi, ulangi sampai tujuan tercapai",
      `${prefix}agentloop riset 3 laptop gaming terbaik 2026, bandingkan, kasih rekomendasi\n${prefix}agentloop status\n${prefix}agentloop stop\n${prefix}agentloop hasil l1`,
      "Bedanya sama .autotask: hasil tiap putaran DINILAI ULANG oleh evaluator sebelum lanjut.\nBudget default 4 putaran, bisa diubah via env AGENTLOOP_MAX_ITER.\nProgress tiap putaran dikirim ke DM owner."
    ));
    return { handled: true };
  }

  const args = raw.split(/\s+/);
  const sub = (args[0] || "").toLowerCase();
  const st = store();

  // ─── LIST ───
  if (sub === "list") {
    const ids = Object.keys(st.runs);
    if (!ids.length) {
      await m.reply(novaBox("AGENTLOOP", ["Belum ada loop.", `Buat: ${prefix}agentloop <tugas>`]));
      return { handled: true };
    }
    const lines = ids.map((id) => {
      const r = st.runs[id];
      return `| ${id.toUpperCase()} ${statusLine(r)} — ${String(r.task).slice(0, 45)}`;
    });
    await m.reply(novaBox("DAFTAR LOOP", lines));
    return { handled: true };
  }

  // ─── STATUS ───
  if (sub === "status") {
    const id = (args[1] || "").toLowerCase();
    const run = id ? st.runs[id] : Object.values(st.runs).find((r) => r.status === "running") || Object.values(st.runs).slice(-1)[0];
    if (!run) {
      await m.reply(novaBox("AGENTLOOP", ["Loop gak ketemu."]));
      return { handled: true };
    }
    const iterLines = (run.iterations || []).map((it) =>
      `| ${it.n + 1}. ${it.result ? (it.critique?.satisfied ? "✅" : "🟡") : "⚠️"} ${String(it.instruction).slice(0, 50)}`
    );
    await m.reply(novaBox("STATUS LOOP " + run.id.toUpperCase(), [
      `Tugas: ${String(run.task).slice(0, 60)}`,
      `Tujuan: ${String(run.plan.goal).slice(0, 60)}`,
      `Status: ${statusLine(run)}${run.status === "done" ? (run.met ? " — tercapai" : " — budget habis") : ""}`,
      `Dibuat: ${fmtAt(run.createdAt)}`,
      "---",
      ...(iterLines.length ? iterLines : ["| (belum ada putaran)"]),
    ]));
    return { handled: true };
  }

  // ─── STOP ───
  if (sub === "stop" || sub === "henti") {
    const id = (args[1] || "").toLowerCase() ||
      Object.keys(st.runs).find((k) => st.runs[k].status === "running") || "";
    const run = st.runs[id];
    if (!run) {
      await m.reply(novaBox("AGENTLOOP", [`${id || "?"} gak ketemu.`, `Loop jalan: ${prefix}agentloop status`]));
      return { handled: true };
    }
    if (run.status !== "running") {
      await m.reply(novaBox("AGENTLOOP", [`${id.toUpperCase()} gak lagi jalan (${run.status}).`]));
      return { handled: true };
    }
    run.status = "stopped";
    run.stoppedAt = Date.now();
    save();
    await m.reply(novaBox("AGENTLOOP", [
      `${id.toUpperCase()} dihentikan di putaran ${run.cur}/${run.maxIter}.`,
      `Hasil sementara: ${prefix}agentloop hasil ${id}`,
    ]));
    return { handled: true };
  }

  // ─── HASIL ───
  if (sub === "hasil" || sub === "answer") {
    const id = (args[1] || "").toLowerCase();
    const run = id ? st.runs[id] : Object.values(st.runs).slice(-1)[0];
    if (!run || !run.answer) {
      await m.reply(novaBox("AGENTLOOP", [`${id || "?"} belum punya jawaban final.`]));
      return { handled: true };
    }
    const ok = await dmOwner(sock,
      `📋 AGENTLOOP ${run.id.toUpperCase()} — JAWABAN FINAL (${run.met ? "tercapai" : "budget habis"})\n\n${run.answer}`
    );
    await m.reply(novaBox("AGENTLOOP", [
      ok ? `Jawaban final dikirim ke DM kamu.` : `Gagal kirim DM (bot gak kenal nomor owner?).`,
    ]));
    return { handled: true };
  }

  // ─── BUAT LOOP BARU ───
  const taskText = raw.trim();
  if (taskText.length < 8) {
    await m.reply(novaBox("AGENTLOOP", ["Tugasnya kependekan bos.", `Contoh: ${prefix}agentloop riset 3 hp terbaik 2026 lalu rekomendasikan satu`]));
    return { handled: true };
  }

  st.seq = (st.seq || 0) + 1;
  const id = "l" + st.seq;
  const plan = await planLoop(taskText);
  st.runs[id] = {
    id,
    task: taskText,
    sender: m.sender || null, // buat memory layer (nova-memory.js per-user)
    plan,
    status: "running",
    met: false,
    cur: 0,
    maxIter: MAX_ITER,
    iterations: [],
    answer: null,
    createdAt: Date.now(),
  };
  // cap jumlah loop tersimpan (terlama dibuang)
  const ids = Object.keys(st.runs);
  if (ids.length > MAX_LOOPS) {
    for (const old of ids.slice(0, ids.length - MAX_LOOPS)) delete st.runs[old];
  }
  save();

  await m.reply(novaBox("LOOP BARU — " + id.toUpperCase(), [
    `Tugas: ${taskText.slice(0, 60)}`,
    `Tujuan: ${plan.goal.slice(0, 60)}`,
    `Kriteria sukses: ${plan.criteria.slice(0, 60)}`,
    `Budget: ${MAX_ITER} putaran (tiap putaran dievaluasi ulang)`,
    "---",
    ...plan.steps.map((s, i) => `| ${i + 1}. ${String(s).slice(0, 60)}`),
    "---",
    `Progress tiap putaran → DM kamu.`,
    `Pantau: ${prefix}agentloop status ${id}`,
  ]));
  runLoopLoop(sock, id);
  return { handled: true };
}

// seams khusus e2e
export function _agentloopInternalsForTest() {
  return {
    store, planLoop, normalizePlan, parseJsonObject, runIteration,
    critiqueIteration, composeAnswer, runLoopLoop, resumeAgentLoops,
    dmOwner, ownerJid, statusLine, MAX_ITER,
    setPlanner: (fn) => { _planner = fn; },
    setRunner: (fn) => { _runner = fn; },
    setCritic: (fn) => { _critic = fn; },
    setComposer: (fn) => { _composer = fn; },
    setExtractor: (fn) => { _extractor = fn; },
    resetSeams: () => { _planner = null; _runner = null; _critic = null; _composer = null; _extractor = null; },
  };
}

export { pluginConfig as config, handler };
