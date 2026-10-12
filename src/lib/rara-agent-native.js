// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════
// rara-agent-native — AI AGENT TOOL-CALL NATIVE (request owner 12 Okt 2026:
// "buat ai agent ada tool call gt dan edit file gt" — agent beneran, bukan
// cuma AI chat, dengan provider OpenAI-compatible yang punya free tier HARIAN:
// GitHub Models (150 req/hari, models.github.ai, PAT GitHub) + Groq
// (console.groq.com, free tier permanen). Dipakai plugin .aiagent.
//
// BEDA sama agent lama (rara-agent.js = aisuperagent): agent lama pakai
// tool-call BERBASIS TEKS (AI tulis JSON di teks → normalizeToolCall) dengan
// otak 9router lokal → rantai. Agent NATIVE ini pakai parameter `tools`
// resmi OpenAI chat/completions — model bales struktur tool_calls rapi,
// gak butuh parsing teks → jauh lebih presisi buat edit file & shell.
//
// TOOL SET (eksekusi BENERAN di VPS/container bot):
//   read_file   — baca file (cap 8000 char ke model)
//   list_dir    — isi folder (cap 200 entry)
//   write_file  — bikin/timpa file (DANGER — wajib allowWrite, plugin owner)
//   edit_file   — ganti substring di file (DANGER — wajib allowWrite)
//   run_command — shell (DANGER — wajib allowShell, denylist dasar, timeout)
//   finish      — jawaban akhir agent
//
// KEAMANAN (QA Standard v1 gerbang 2+4):
//   • Sandboxing path: SEMUA path di-resolve ke workRoot (default root repo bot)
//     — traversal `..` & absolute di luar root DITOLAK keras.
//   • Tool danger wajib flag allowWrite/allowShell dari plugin (owner-gated).
//   • Input user di-sanitize (buang control char, cap 4000 char) sebelum
//     masuk prompt. GAK ADA eval input mentah — tool args cuma string.
//   • Loop dibatasi: maxSteps (default 8) + total timeout → gak hang.
//   • Tool args malformed → hasil error dikirim balik ke model (self-correct),
//     gak throw keluar loop.
//   • run_command: denylist pola destruktif global + timeout 20 dtk + output cap.
//
// SEAMS E2E: _setNativeDepsForTest({ fetch, exec, keys }) — fetch & exec &
// pembacaan key bisa dimock tanpa jaringan; _resetNativeDepsForTest().
// ═══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec as _execCb } from "child_process";
import { getApiKey } from "./rara-api-keys.js";

const __libFilename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__libFilename), "..", "..");

// ── KONFIGURASI PROVIDER (OpenAI-compatible + native tools) ──
const PROVIDER_DEFS = {
  githubmodels: {
    label: "GitHub Models",
    url: () => "https://models.github.ai/inference/chat/completions",
    modelKey: "githubmodels_model",
    defaultModel: "openai/gpt-4o",
    signup: "github.com → Settings → Developer settings → PAT (fine-grained, permission Models: read) — gratis 150 request/hari",
  },
  groq: {
    label: "Groq",
    url: () => "https://api.groq.com/openai/v1/chat/completions",
    modelKey: "groq_model",
    defaultModel: "llama-3.3-70b-versatile",
    signup: "console.groq.com → API Keys — free tier permanen",
  },
};

const MAX_STEPS = 8;
const LOOP_TIMEOUT_MS = 150 * 1000;
const CMD_TIMEOUT_MS = 20 * 1000;
const READ_CAP = 8000;          // char isi file yang dikirim ke model
const CMD_OUT_CAP = 6000;       // char output shell ke model
const TASK_CAP = 4000;          // char tugas user
const FILE_BYTES_CAP = 256 * 1024;

// pola shell yang GAK PERNAH dibolehin (bahkan owner via agent)
const CMD_DENYLIST = [
  /\brm\s+-[rf]{2,}\s+\//i,     // rm -rf /
  /\bmkfs(\.|\b)/i,             // format filesystem
  /\bdd\s+if=\/dev\/(zero|random)\s+of=\/dev\/[sh]d/i,
  /:\(\)\s*\{.*\};\s*:/,        // fork bomb
  /\b(shutdown|reboot|halt|poweroff)\b/i,
  /\bchmod\s+-R\s+777\s+\//i,
  />\s*\/dev\/[sh]d[a-z]/i,
];

// ── seams e2e ──
let _fetchForTest;
let _execForTest;
let _keysForTest; // { githubmodels: "x", groq: "y", ... } — kalau di-set, getApiKey dimock
let _cmdTimeoutForTest; // ms — override CMD_TIMEOUT_MS (biar e2e gak nunggu 20 dtk)
export function _setNativeDepsForTest({ fetch, exec, keys, cmdTimeoutMs } = {}) {
  if (fetch) _fetchForTest = fetch;
  if (exec) _execForTest = exec;
  if (keys) _keysForTest = keys;
  if (cmdTimeoutMs) _cmdTimeoutForTest = cmdTimeoutMs;
}
export function _resetNativeDepsForTest() {
  _fetchForTest = undefined;
  _execForTest = undefined;
  _keysForTest = undefined;
  _cmdTimeoutForTest = undefined;
}
const cmdTimeout = () => _cmdTimeoutForTest || CMD_TIMEOUT_MS;

function readKey(name) {
  if (_keysForTest && Object.prototype.hasOwnProperty.call(_keysForTest, name)) {
    return String(_keysForTest[name] || "").trim();
  }
  try { return String(getApiKey(name) || "").trim(); } catch { return ""; }
}

async function _fetch(url, opts) {
  const call = _fetchForTest || globalThis.fetch;
  if (!call) throw new Error("fetch tidak tersedia di runtime ini");
  return call(url, opts);
}

// ── SANITASI INPUT (gerbang 4) ──
export function sanitizeTask(raw) {
  let s = String(raw || "");
  // buang control char (kecuali newline & tab) — anti injection prompt/log
  s = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "");
  s = s.trim();
  if (s.length > TASK_CAP) s = s.slice(0, TASK_CAP) + "\n…(tugas dipotong, terlalu panjang)";
  return s;
}

function safeJson(v, cap = 400) {
  try { return JSON.stringify(v).slice(0, cap); } catch { return "(objek gak bisa di-serialize)"; }
}

// ── PATH SANDBOX ──
export function _resolveInside(root, rel) {
  const rootN = path.resolve(root);
  const p = path.resolve(rootN, String(rel || ""));
  if (p === rootN) return p;
  if (!p.startsWith(rootN + path.sep)) {
    throw new Error(`path di luar folder bot (dilarang): ${String(rel).slice(0, 80)}`);
  }
  return p;
}

// ── TOOL SCHEMA (OpenAI function calling format) ──
function buildToolSchemas({ allowWrite, allowShell }) {
  const tools = [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Baca isi file teks di dalam folder bot. Balikan: isi file (maks 8000 karakter).",
        parameters: {
          type: "object",
          properties: { path: { type: "string", description: "path relatif terhadap root bot, contoh: package.json" } },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_dir",
        description: "Lihat isi folder di dalam folder bot. Balikan: daftar nama (d=folder, f=file).",
        parameters: {
          type: "object",
          properties: { path: { type: "string", description: "path relatif, kosong = root bot" } },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "finish",
        description: "Selesaikan tugas — kirim jawaban akhir ke user. WAJIB dipanggil setelah tugas beres (atau gak bisa dilanjutkan).",
        parameters: {
          type: "object",
          properties: { answer: { type: "string", description: "jawaban/laporan akhir untuk user, bahasa Indonesia, ringkas & jelas" } },
          required: ["answer"],
        },
      },
    },
  ];
  if (allowWrite) {
    tools.push(
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Bikin atau TIMPA file dengan isi baru (di dalam folder bot). Hati-hati: menimpa file lama.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "path relatif terhadap root bot" },
              content: { type: "string", description: "isi lengkap file (bukan potongan)" },
            },
            required: ["path", "content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "edit_file",
          description: "Edit file: ganti kemunculan TEPAT SATU teks lama jadi teks baru. Kalau teks lama muncul >1x, sebutkan versi lebih panjang biar unik.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "path relatif terhadap root bot" },
              old_text: { type: "string", description: "teks lama yang persis ada di file (cukup panjang biar unik)" },
              new_text: { type: "string", description: "penggantinya" },
            },
            required: ["path", "old_text", "new_text"],
          },
        },
      }
    );
  }
  if (allowShell) {
    tools.push({
      type: "function",
      function: {
        name: "run_command",
        description: "Jalankan perintah shell di folder bot (timeout 20 detik). Pakai buat verifikasi hasil (node -e, ls, cat, dll). JANGAN untuk instalasi/destructive.",
        parameters: {
          type: "object",
          properties: { command: { type: "string", description: "perintah shell satu baris" } },
          required: ["command"],
        },
      },
    });
  }
  return tools;
}

// ── EKSEKUTOR TOOL ──
// Semua balikan { ok, out } — gak pernah throw keluar (malformed args → ok:false
// + pesan buat model self-correct; gerbang QA 2+4: gak hang, gak unhandled).
async function execTool(name, args, { root, allowWrite, allowShell }) {
  const a = args || {};
  const p = String(a.path || "");
  try {
    switch (name) {
      case "read_file": {
        if (!p) return { ok: false, out: "args salah: 'path' wajib diisi" };
        const fp = _resolveInside(root, p);
        if (!fs.existsSync(fp)) return { ok: false, out: `file gak ketemu: ${p}` };
        const st = fs.statSync(fp);
        if (st.isDirectory()) return { ok: false, out: `${p} itu folder, bukan file — pakai list_dir` };
        if (st.size > FILE_BYTES_CAP) return { ok: false, out: `file kegedean (${Math.round(st.size / 1024)}KB, max 256KB)` };
        let content = fs.readFileSync(fp, "utf8");
        if (content.length > READ_CAP) content = content.slice(0, READ_CAP) + "\n…(dipotong)";
        return { ok: true, out: content || "(file kosong)" };
      }
      case "list_dir": {
        const dir = _resolveInside(root, p || ".");
        if (!fs.existsSync(dir)) return { ok: false, out: `folder gak ketemu: ${p || "(root)"}` };
        const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 200);
        if (!entries.length) return { ok: true, out: "(folder kosong)" };
        return { ok: true, out: entries.map((e) => (e.isDirectory() ? "d " : "f ") + e.name).join("\n") };
      }
      case "write_file": {
        if (!allowWrite) return { ok: false, out: "tool write_file gak diaktifkan (butuh izin owner)" };
        if (!p) return { ok: false, out: "args salah: 'path' wajib diisi" };
        const content = String(a.content ?? "");
        if (content.length > FILE_BYTES_CAP) return { ok: false, out: "isi kegedean (max 256KB)" };
        const fp = _resolveInside(root, p);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, content, "utf8");
        return { ok: true, out: `file ditulis: ${p} (${content.length} char)` };
      }
      case "edit_file": {
        if (!allowWrite) return { ok: false, out: "tool edit_file gak diaktifkan (butuh izin owner)" };
        const oldT = String(a.old_text ?? "");
        const newT = String(a.new_text ?? "");
        if (!p || !oldT) return { ok: false, out: "args salah: 'path' dan 'old_text' wajib diisi" };
        const fp = _resolveInside(root, p);
        if (!fs.existsSync(fp)) return { ok: false, out: `file gak ketemu: ${p}` };
        const buf = fs.readFileSync(fp, "utf8");
        const hits = buf.split(oldT).length - 1;
        if (hits === 0) return { ok: false, out: `teks lama gak ketemu di ${p} — coba potongan yang persis (cek spasi/indent)` };
        if (hits > 1) return { ok: false, out: `teks lama muncul ${hits}x di ${p} — kirim potongan lebih panjang biar unik` };
        fs.writeFileSync(fp, buf.replace(oldT, newT), "utf8");
        return { ok: true, out: `edit OK: ${p} (${oldT.length}→${newT.length} char)` };
      }
      case "run_command": {
        if (!allowShell) return { ok: false, out: "tool run_command gak diaktifkan (butuh izin owner)" };
        const cmd = String(a.command || "").trim();
        if (!cmd) return { ok: false, out: "args salah: 'command' wajib diisi" };
        for (const bad of CMD_DENYLIST) {
          if (bad.test(cmd)) return { ok: false, out: "perintah DITOLAK (terdeteksi pola destruktif/global)" };
        }
        return await new Promise((resolve) => {
          const done = (r) => resolve(r);
          const run = _execForTest || _execCb;
          const cto = cmdTimeout();
          const timer = setTimeout(() => done({ ok: false, out: `timeout ${cto / 1000}s: ${cmd.slice(0, 120)}` }), cto);
          run(cmd, { cwd: root, timeout: cto, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
            clearTimeout(timer);
            if (err && !stdout && !stderr) return done({ ok: false, out: `gagal: ${String(err.message || err).slice(0, 300)}` });
            let out = String(stdout || "");
            const errS = String(stderr || "").trim();
            if (out.length > CMD_OUT_CAP) out = out.slice(0, CMD_OUT_CAP) + "\n…(dipotong)";
            const tail = errS ? `\n[stderr] ${errS.slice(0, 500)}` : "";
            done({ ok: true, out: (out || "(tanpa output)") + tail });
          });
        });
      }
      default:
        return { ok: false, out: `tool gak dikenal: ${name}` };
    }
  } catch (e) {
    return { ok: false, out: `error tool ${name}: ${String(e?.message || e).slice(0, 300)}` };
  }
}

// ── SYSTEM PROMPT ──
function buildSystemPrompt({ root, allowWrite, allowShell }) {
  const rules = [
    "Kamu AI AGENT yang mengendalikan bot WhatsApp 'Rara AI - Multi Device' langsung dari filesystem-nya.",
    `Root kerja kamu: folder bot (${root}). Semua path tool RELATIF terhadap root ini. JANGAN minta path absolut.`,
    "ALUR WAJIB: pahami tugas → baca file/folder yang relevan dulu (read_file/list_dir) SEBELUM mengedit → lakukan aksi → verifikasi hasilnya dengan baca ulang / run_command → panggil finish dengan laporan.",
    "Satu tool call per langkah. Setelah tiap hasil tool, putuskan langkah berikutnya dari BUKTI nyata, jangan nebak isi file.",
    "Kalau tugas mustahil / file gak ada / butuh info tambahan, JANGAN ngarang — panggil finish dan jelaskan apa yang kurang.",
    "Jawaban akhir (finish.answer) bahasa Indonesia, ringkas, sebutkan file yang disentuh & hasil verifikasi.",
  ];
  if (!allowWrite) rules.push("Mode ini READ-ONLY: tool tulis/edit gak tersedia. Laporkan apa yang sebaiknya diubah.");
  if (!allowShell) rules.push("Perintah shell gak tersedia di mode ini.");
  return rules.join("\n");
}

// ── DAFTAR PROVIDER AKTIF (key terpasang) ──
export function listNativeProviders() {
  return Object.entries(PROVIDER_DEFS)
    .map(([id, def]) => {
      const key = readKey(id);
      const model = readKey(def.modelKey) || def.defaultModel;
      return { id, label: def.label, model, hasKey: !!key, signup: def.signup };
    })
    .filter((p) => p.hasKey);
}

// ── SATU PERMINTAAN CHAT COMPLETIONS ──
async function chatOnce(provider, def, key, model, messages, tools, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 60000);
  let res;
  try {
    res = await _fetch(def.url(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let detail = "";
    try { detail = String((await res.text()).slice(0, 200)); } catch {}
    throw new Error(`HTTP ${res.status}${detail ? " — " + detail : ""}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const content = String(msg?.content || "").trim();
  const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];
  return { content, toolCalls, model: data?.model || model, provider: provider.id };
}

// ── LOOP UTAMA ──
/**
 * runNativeAgent — jalankan agent tool-call native.
 * @param {object} o
 *   task         — tugas dari user (akan di-sanitize)
 *   provider?    — paksa provider id ("githubmodels"|"groq"); default: urutan key terpasang
 *   allowWrite?  — aktifkan write_file/edit_file (plugin WAJIB owner-gate)
 *   allowShell?  — aktifkan run_command (plugin WAJIB owner-gate)
 *   workRoot?    — root sandbox (default root repo bot)
 *   maxSteps?    — batas iterasi (default 8)
 *   timeoutMs?   — batas total (default 150 dtk)
 * @returns { ok, answer, steps[], provider, model, error? }
 */
export async function runNativeAgent(o = {}) {
  const task = sanitizeTask(o.task);
  const allowWrite = !!o.allowWrite;
  const allowShell = !!o.allowShell;
  const root = path.resolve(o.workRoot || DEFAULT_ROOT);
  const maxSteps = Math.max(1, Math.min(15, o.maxSteps || MAX_STEPS));
  const startedAt = Date.now();
  const timeoutMs = o.timeoutMs || LOOP_TIMEOUT_MS;

  if (!task) return { ok: false, error: "empty-task" };

  const providers = listNativeProviders();
  if (!providers.length) {
    return { ok: false, error: "no-provider", providers: Object.entries(PROVIDER_DEFS).map(([id, d]) => ({ id, label: d.label, signup: d.signup })) };
  }
  let order = providers;
  if (o.provider) {
    const pick = providers.find((p) => p.id === o.provider);
    if (pick) order = [pick, ...providers.filter((p) => p.id !== o.provider)];
  }

  const tools = buildToolSchemas({ allowWrite, allowShell });
  const system = buildSystemPrompt({ root, allowWrite, allowShell });
  const messages = [
    { role: "system", content: system },
    { role: "user", content: task },
  ];
  const steps = [];

  let lastError = null;
  for (const prov of order) {
    const def = PROVIDER_DEFS[prov.id];
    const key = readKey(prov.id);
    try {
      for (let i = 0; i < maxSteps; i++) {
        if (Date.now() - startedAt > timeoutMs) {
          return { ok: false, error: "timeout", steps, provider: prov.id, model: prov.model };
        }
        const turn = await chatOnce(prov.id, def, key, prov.model, messages, tools, 60000);

        // tanpa tool call → anggap jawaban final (model gak makai finish)
        if (!turn.toolCalls.length) {
          if (!turn.content) throw new Error("model balas kosong");
          return {
            ok: true,
            answer: turn.content,
            steps,
            provider: prov.id,
            model: turn.model,
            elapsedMs: Date.now() - startedAt,
          };
        }

        // push pesan assistant berisi tool_calls (WAJIB utk protokol)
        messages.push({
          role: "assistant",
          content: turn.content || null,
          tool_calls: turn.toolCalls,
        });

        for (const tc of turn.toolCalls) {
          const fn = tc?.function || {};
          let args = {};
          try { args = fn.arguments ? JSON.parse(fn.arguments) : {}; } catch {
            args = null;
          }
          const toolName = String(fn.name || "");
          if (toolName === "finish") {
            const answer = args && typeof args.answer === "string" ? args.answer : turn.content || "(agent selesai tanpa jawaban)";
            steps.push({ tool: "finish", ok: true });
            return {
              ok: true,
              answer,
              steps,
              provider: prov.id,
              model: turn.model,
              elapsedMs: Date.now() - startedAt,
            };
          }
          const r = args
            ? await execTool(toolName, args, { root, allowWrite, allowShell })
            : { ok: false, out: "args tool bukan JSON valid — kirim ulang dengan JSON yang benar" };
          steps.push({
            tool: toolName,
            ok: r.ok,
            note: String(r.out).split("\n")[0].slice(0, 120),
            args: { ...args, content: undefined, new_text: undefined, old_text: undefined },
          });
          messages.push({
            role: "tool",
            tool_call_id: String(tc.id || `t${i}`),
            content: String(r.out).slice(0, READ_CAP),
          });
        }
      }
      // maxSteps habis → minta model wrap up dalam 1 langkah terakhir
      messages.push({ role: "user", content: "Batas langkah tercapai. Panggil finish SEKARANG dengan laporan singkat apa yang sudah/belum selesai." });
      const last = await chatOnce(prov.id, def, key, prov.model, messages, tools, 60000);
      return {
        ok: true,
        answer: last.content || "(agent mentok langkah maksimal)",
        steps,
        provider: prov.id,
        model: last.model,
        maxed: true,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (e) {
      lastError = e;
      // provider gagal → coba provider berikutnya (fallback)
      continue;
    }
  }
  return { ok: false, error: "all-providers-failed", detail: String(lastError?.message || lastError).slice(0, 200), steps };
}

export const NATIVE_AGENT_META = {
  providers: PROVIDER_DEFS,
  maxSteps: MAX_STEPS,
  version: "1.0.0",
};
