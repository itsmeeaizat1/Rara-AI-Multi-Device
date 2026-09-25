// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autotask — Agent tugas otonom berjangka (saran fitur #5 owner, 21 Sep 2026).
 * "kerjakan X lalu lapor" → AI memecah jadi tahapan (milestone), dikerjain
 * SATU PER SATU di background pakai engine yang sama kayak .novaagent /
 * .aisuperagent (nova-agent.js runAgent: penalaran + browsing/riset web),
 * laporan tiap milestone dikirim ke DM owner. Tugas persisten di db —
 * bot restart pun bisa dilanjut (resume otomatis pas boot).
 *
 * BUKAN upgrade perilaku novaagent/autonovaagent/aisuperagent (mereka tetap
 * one-shot) — ini lapisan orkestrasi baru yang numpang engine mereka.
 *
 * Commands (owner-only):
 *   .autotask <tugas>            — buat tugas, langsung jalan
 *   .autotask <tugas> jeda N      — jeda N menit antar tahap (tugas berjangka jam)
 *   .autotask list                — daftar semua tugas
 *   .autotask status [id]         — status detail tugas
 *   .autotask stop <id>           — hentikan tugas
 *   .autotask pause <id>         — jeda tugas (dilanjut manual)
 *   .autotask lanjut <id>         — lanjutkan tugas yang dijeda
 *   .autotask laporan <id>        — kirim ulang semua laporan ke DM
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaBox } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { runAgent } from "../../src/lib/nova-agent.js";
import { memoryBlock, extractMemories } from "../../src/lib/nova-memory.js";
import { skillsBlock } from "../../src/lib/nova-askills.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autotask",
  alias: ["autotask", "agenttugas", "tugasai"],
  category: "ai agent",
  description: "Agent tugas otonom berjangka — kerjain bertahap, lapor tiap milestone ke DM",
  usage: ".autotask <tugas/list/status/stop/pause/lanjut/laporan>",
  example: ".autotask riset 5 plugin bot WA terpopuler minggu ini lalu rangkum",
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

const MAX_STAGES = 6;          // maksimal tahapan per tugas
const STAGE_RESULT_CAP = 1000; // cap hasil per tahap (disimpan + DM)
const STAGE_TIMEOUT_MS = 5 * 60_000; // maksimal 5 menit per tahap
const MAX_REPORTS = 30;

const running = new Set(); // id yang loop-nya lagi hidup di proses ini

// seams buat e2e
let _planner = null;   // override pembuat tahapan
let _stageRunner = null; // override eksekusi tahap
let _extractor = null; // override ekstraksi memori (nova-memory.js)

// ────────────────────────────────────────────────────────────────────────────
// STORE
// ────────────────────────────────────────────────────────────────────────────

function store() {
  const db = getDatabase();
  if (!db.data.autotask) db.data.autotask = { tasks: {}, seq: 0 };
  if (!db.data.autotask.tasks) db.data.autotask.tasks = {};
  return db.data.autotask;
}

function save() {
  const db = getDatabase();
  db.markDirty?.("autotask");
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
// PLANNER — pecah tugas jadi tahapan milestone
// ────────────────────────────────────────────────────────────────────────────

function parseStages(raw, task) {
  try {
    let s = String(raw || "").trim();
    s = s.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
    const start = s.indexOf("[");
    const end = s.lastIndexOf("]");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    const arr = JSON.parse(s);
    if (!Array.isArray(arr) || !arr.length) throw new Error("bukan array");
    const stages = arr
      .map((x) => ({
        title: String(x?.title || "Tahap").trim().slice(0, 80),
        instruction: String(x?.instruction || x?.task || x?.title || "").trim().slice(0, 600),
      }))
      .filter((x) => x.instruction)
      .slice(0, MAX_STAGES);
    if (!stages.length) throw new Error("kosong");
    return stages;
  } catch {
    // fallback: 1 tahap = tugas utuh (AI planner mati gak bikin fitur mati)
    return [{ title: "Selesaikan tugas", instruction: task }];
  }
}

async function planStages(task) {
  const doPlan = _planner !== null ? _planner : async (t) => {
    try {
      const res = await callAI(
        `Pecah tugas berikut menjadi ${MAX_STAGES} tahapan ATAU LEBIH SEDIKIT (2-6) ` +
        `yang realistis dikerjakan AI agent bertahap (tiap tahap boleh butuh browsing web).\n\n` +
        `Tugas: "${t}"\n\nBalas HANYA array JSON murni: ` +
        `[{"title":"judul tahap singkat","instruction":"instruksi lengkap tahap itu"}]`,
        { systemPrompt: "Kamu perencana tugas AI. Balas JSON array murni tanpa markdown, tanpa kalimat pembuka.", temperature: 0.3, maxTokens: 500 }
      );
      return typeof res === "string" ? res : null;
    } catch { return null; }
  };
  const raw = await doPlan(task);
  return parseStages(raw, task);
}

// ────────────────────────────────────────────────────────────────────────────
// EKSEKUSI TAHAP — engine sama kayak .novaagent/.aisuperagent
// ────────────────────────────────────────────────────────────────────────────

function stageContext(task, stageIdx) {
  const done = (task.stages || []).slice(Math.max(0, stageIdx - 2), stageIdx)
    .filter((s) => s?.result)
    .map((s, i) => `Tahap "${s.title}" hasil: ${String(s.result).slice(0, 400)}`);
  return done.length ? done.join("\n") : "(tahap pertama, belum ada hasil sebelumnya)";
}

async function runStage(task, stageIdx) {
  const stage = task.stages[stageIdx];
  const doRun = _stageRunner !== null ? _stageRunner : async (prompt) => {
    try {
      const res = await runAgent(prompt, {
        execTools: {}, // headless: tanpa tool chat — penalaran + riset web
        toolbox: "penalaran mandiri; riset/browsing web via search engine bawaan (mode research)",
      });
      if (res?.answer) return res.answer;
      return null;
    } catch { return null; }
  };
  // 🔹 MEMORY LAYER: fakta durabel user (nova-memory.js — store sama kayak
  // .novaai/.novaagent) di-inject ke prompt tahap biar tugas inget owner
  const memLine = task.sender ? memoryBlock(getDatabase(), task.sender, task.task) : "";
  const skillLine = skillsBlock(task.task);
  const prompt =
    `${memLine}${memLine ? "\n" : ""}${skillLine}${skillLine ? "\n" : ""}Tugas induk: "${task.task}"\n` +
    `Konteks hasil tahap sebelumnya: ${stageContext(task, stageIdx)}\n\n` +
    `Kerjakan SAAT INI tahap "${stage.title}": ${stage.instruction}\n` +
    `Balas HASIT tahap ini saja — ringkas, faktual, berbasis data nyata ` +
    `(browsing kalau butuh info terbaru). Tanpa pembuka basa-basi.`;
  const result = await doRun(prompt, stage, stageIdx, task);
  return typeof result === "string" && result.trim() ? result.trim().slice(0, STAGE_RESULT_CAP * 2) : null;
}

// ────────────────────────────────────────────────────────────────────────────
// LOOP TUGAS — jalan di background, lapor tiap milestone ke DM owner
// ────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function runTaskLoop(sock, id) {
  if (running.has(id)) return;
  running.add(id);
  try {
    for (;;) {
      const task = store().tasks[id];
      if (!task || task.status !== "running") break;
      if (task.cur >= task.stages.length) {
        task.status = "done";
        task.finishedAt = Date.now();
        save();
        await dmOwner(sock,
          `✅ TUGAS SELESAI — ${id.toUpperCase()}\n` +
          `${task.task}\n\nTotal ${task.stages.length} tahap, ` +
          `${task.stages.filter((s) => s.status === "done").length} sukses. ` +
          `Ketik .autotask laporan ${id} untuk lihat semua hasil.`
        );
        break;
      }
      const idx = task.cur;
      task.stages[idx].status = "running";
      save();
      const ok = await withTimeout(runStage(task, idx), STAGE_TIMEOUT_MS);
      const stage = task.stages[idx];
      stage.result = ok ? ok.slice(0, STAGE_RESULT_CAP) : null;
      stage.status = ok ? "done" : "failed";
      // 🔹 auto-ekstrak fakta durabel baru (fire-and-forget, hormatin .memory off)
      if (ok) {
        const doExtract = _extractor !== null ? _extractor : extractMemories;
        try { Promise.resolve(doExtract(getDatabase(), task.sender, stage.instruction, ok)).catch(() => {}); } catch {}
      }
      stage.finishedAt = Date.now();
      task.reports.push({
        title: stage.title, ok: !!ok, at: Date.now(),
        result: stage.result,
      });
      if (task.reports.length > MAX_REPORTS) task.reports.shift();
      task.cur = idx + 1;
      save();
      await dmOwner(sock,
        `${ok ? "🤖" : "⚠️"} AUTOTASK ${id.toUpperCase()} — tahap ${idx + 1}/${task.stages.length} ` +
        `${ok ? "selesai" : "GAGAL"}: ${stage.title}\n\n${ok || "(tahap gagal — lanjut ke tahap berikutnya)"}`
      );
      // jeda antar tahap (opsional — bikin tugas berjangka jam)
      const nextIdx = task.cur;
      if (task.jedaMin > 0 && nextIdx < task.stages.length) {
        await sleep(Math.min(task.jedaMin, 60) * 60_000);
      }
    }
  } catch (e) {
    try {
      const task = store().tasks[id];
      if (task && task.status === "running") {
        task.status = "failed";
        task.error = String(e?.message || e).slice(0, 200);
        save();
      }
    } catch {}
  } finally {
    running.delete(id);
  }
}

/** Resume tugas "running" pas boot (dipanggil dari index.js startup list). */
export async function resumeAutoTasks(sock) {
  try {
    const tasks = store().tasks;
    let n = 0;
    for (const id of Object.keys(tasks)) {
      if (tasks[id].status === "running" && !running.has(id)) {
        runTaskLoop(sock, id); // fire-and-forget
        n++;
      }
    }
    if (n) console.log(`[autotask] resume ${n} tugas`);
  } catch {}
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS UI
// ────────────────────────────────────────────────────────────────────────────

const STATUS_ICON = { running: "🔄", done: "✅", paused: "⏸️", stopped: "🛑", failed: "❌", pending: "🕒" };

function statusLine(task) {
  const doneN = task.stages.filter((s) => s.status === "done").length;
  return `${STATUS_ICON[task.status] || "•"} ${doneN}/${task.stages.length} tahap`;
}

function fmtAt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HANDLER
// ────────────────────────────────────────────────────────────────────────────

async function handler(m, { sock, db: _db, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const raw = (m.text || "").trim();
  if (!raw) {
    await m.reply(novaBox("AUTOTASK — AGENT TUGAS OTONOM", [
      `Cara pakai:`,
      `${prefix}autotask <tugas> — kerjain bertahap, lapor tiap tahap ke DM`,
      `${prefix}autotask <tugas> jeda N — jeda N menit antar tahap`,
      `${prefix}autotask list — daftar tugas`,
      `${prefix}autotask status [id] — detail tugas`,
      `${prefix}autotask stop/pause/lanjut <id>`,
      `${prefix}autotask laporan <id> — kirim ulang hasil ke DM`,
      "---",
      `Engine sama kayak .novaagent/.aisuperagent`,
      `(penalaran + browsing), tapi berjalan lama di`,
      `background dan bertahap. Persisten — restart`,
      `pun tugas dilanjut otomatis.`,
    ]));
    return { handled: true };
  }

  const args = raw.split(/\s+/);
  const sub = (args[0] || "").toLowerCase();
  const st = store();

  // ─── LIST ───
  if (sub === "list") {
    const ids = Object.keys(st.tasks);
    if (!ids.length) {
      await m.reply(novaBox("AUTOTASK", ["Belum ada tugas.", `Buat: ${prefix}autotask <tugas>`]));
      return { handled: true };
    }
    const lines = ids.map((id) => {
      const t = st.tasks[id];
      return `| ${id.toUpperCase()} ${statusLine(t)} — ${String(t.task).slice(0, 45)}`;
    });
    await m.reply(novaBox("DAFTAR TUGAS", lines));
    return { handled: true };
  }

  // ─── STATUS ───
  if (sub === "status") {
    const id = (args[1] || "").toLowerCase();
    const task = id ? st.tasks[id] : Object.values(st.tasks).find((t) => t.status === "running") || Object.values(st.tasks).slice(-1)[0];
    if (!task) {
      await m.reply(novaBox("AUTOTASK", ["Tugas gak ketemu."]));
      return { handled: true };
    }
    const stageLines = task.stages.map((s, i) =>
      `| ${i + 1}. ${STATUS_ICON[s.status] || "•"} ${s.title}${s.finishedAt ? " (" + fmtAt(s.finishedAt) + ")" : ""}`
    );
    await m.reply(novaBox("STATUS TUGAS " + task.id.toUpperCase(), [
      `Tugas: ${String(task.task).slice(0, 60)}`,
      `Status: ${statusLine(task)}`,
      `Jeda antar tahap: ${task.jedaMin || 0} menit`,
      `Dibuat: ${fmtAt(task.createdAt)}`,
      "---",
      ...stageLines,
    ]));
    return { handled: true };
  }

  // ─── STOP / PAUSE / LANJUT ───
  if (sub === "stop" || sub === "pause" || sub === "lanjut") {
    const id = (args[1] || "").toLowerCase();
    const task = st.tasks[id];
    if (!task) {
      await m.reply(novaBox("AUTOTASK", [`Tugas ${id || "?"} gak ketemu.`]));
      return { handled: true };
    }
    if (sub === "stop") {
      task.status = "stopped";
      task.stoppedAt = Date.now();
      save();
      await m.reply(novaBox("AUTOTASK", [`${id.toUpperCase()} dihentikan.`, `Tahap selesai: ${task.stages.filter((s) => s.status === "done").length}/${task.stages.length}`]));
    } else if (sub === "pause") {
      if (task.status !== "running") {
        await m.reply(novaBox("AUTOTASK", [`${id.toUpperCase()} gak lagi jalan (${task.status}).`]));
        return { handled: true };
      }
      task.status = "paused";
      save();
      await m.reply(novaBox("AUTOTASK", [`${id.toUpperCase()} dijeda.`, `Lanjut: ${prefix}autotask lanjut ${id}`]));
    } else {
      if (task.status !== "paused") {
        await m.reply(novaBox("AUTOTASK", [`${id.toUpperCase()} gak dalam jeda (${task.status}).`]));
        return { handled: true };
      }
      task.status = "running";
      save();
      await m.reply(novaBox("AUTOTASK", [`${id.toUpperCase()} dilanjut dari tahap ${task.cur + 1}.`]));
      runTaskLoop(sock, task.id);
    }
    return { handled: true };
  }

  // ─── LAPORAN ───
  if (sub === "laporan" || sub === "report") {
    const id = (args[1] || "").toLowerCase();
    const task = st.tasks[id];
    if (!task || !task.reports.length) {
      await m.reply(novaBox("AUTOTASK", [`${id || "?"} gak punya laporan.`]));
      return { handled: true };
    }
    const ok = await dmOwner(sock,
      `📋 AUTOTASK ${id.toUpperCase()} — SEMUA LAPORAN\n\n` +
      task.reports.map((r, i) =>
        `${i + 1}. ${r.ok ? "✅" : "⚠️"} ${r.title} (${fmtAt(r.at)})\n${r.result || "(gagal)"}`
      ).join("\n\n")
    );
    await m.reply(novaBox("AUTOTASK", [
      ok ? `Semua laporan dikirim ke DM kamu.` : `Gagal kirim DM (bot gak kenal nomor owner?).`,
    ]));
    return { handled: true };
  }

  // ─── BUAT TUGAS BARU ───
  let taskText = raw;
  let jedaMin = 0;
  const jedaMatch = taskText.match(/\bjeda\s+(\d{1,3})\s*(menit|m)?\b/i);
  if (jedaMatch) {
    jedaMin = Math.max(0, Math.min(60, parseInt(jedaMatch[1], 10)));
    taskText = taskText.replace(jedaMatch[0], "").trim();
  }
  if (taskText.length < 8) {
    await m.reply(novaBox("AUTOTASK", ["Tugasnya kependekan bos.", `Contoh: ${prefix}autotask riset tren AI minggu ini lalu rangkum jadi 5 poin`]));
    return { handled: true };
  }

  st.seq = (st.seq || 0) + 1;
  const id = "t" + st.seq;
  const stages = await planStages(taskText);
  st.tasks[id] = {
    id,
    task: taskText,
    sender: m.sender || null, // buat memory layer (nova-memory.js per-user)
    stages: stages.map((s) => ({ ...s, status: "pending", result: null, finishedAt: null })),
    status: "running",
    cur: 0,
    jedaMin,
    createdAt: Date.now(),
    reports: [],
  };
  save();

  await m.reply(novaBox("TUGAS BARU — " + id.toUpperCase(), [
    `Tugas: ${taskText.slice(0, 60)}`,
    `Tahap: ${stages.length}`,
    `Jeda antar tahap: ${jedaMin} menit`,
    "---",
    ...stages.map((s, i) => `| ${i + 1}. ${s.title}`),
    "---",
    `Laporan tiap tahap → DM kamu.`,
    `Pantau: ${prefix}autotask status ${id}`,
  ]));
  runTaskLoop(sock, id);
  return { handled: true };
}

// seam khusus e2e
export function _autotaskInternalsForTest() {
  return {
    store, planStages, parseStages, runStage, runTaskLoop, resumeAutoTasks,
    dmOwner, ownerJid, statusLine,
    setPlanner: (fn) => { _planner = fn; },
    setStageRunner: (fn) => { _stageRunner = fn; },
    setExtractor: (fn) => { _extractor = fn; },
    resetSeams: () => { _planner = null; _stageRunner = null; _extractor = null; },
  };
}

export { pluginConfig as config, handler };
