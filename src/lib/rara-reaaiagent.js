// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════
// rara-reaaiagent — AI AGENT REVERSE ENGINEERING via MCP server REA
// (github.com/morluto/rea, npm rea-agents, MIT). Request owner 12 Okt
// 2026: pasang REA ke bot dengan command .reaaiagent (mode agent penuh:
// tools REA masuk ke loop tool-call, otak fallback GitHub Models → Groq
// — provider reuse dari rara-agent-native).
//
// CARA KERJA:
//   1. Loop tool-call OpenAI resmi (parameter `tools`) — sama pola
//      kayak .aiagent native, tapi TOOL SET-nya = tools MCP REA
//      (kurasi whitelist, bukan 170 tools sekaligus — hemat konteks).
//   2. Model milih tool → bridge MCP stdio callTool → hasil Evidence
//      (JSON) diringkas (cap) → dikirim balik ke model buat langkah
//      berikutnya (self-correct kalau args salah).
//   3. Model panggil `finish` dengan laporan akhir + bukti
//      (evidence_id) + limitasi analisis.
//
// KEAMANAN (QA Standard v1):
//   • Semua tool = READ-ONLY analisis lokal (reverse engineering file
//     target) — gak ada tool tulis file/shell/exec berasal dari model.
//   • Input user di-sanitize (reuse sanitizeTask native).
//   • Args model diparse JSON, malformed → dibales ke model (gak throw).
//   • maxSteps 12 + timeout total 240 dtk + timeout per-request MCP.
//   • Output tool di-cap sebelum masuk prompt (anti blow-up konteks).
//   • Whitelist tool: REAAIAGENT_TOOLS (env, comma-separated) di atas
//     default kurasi.
//
// SEAMS E2E: _setReaAgentDepsForTest({ fetch, session, keys }) — fetch
// (provider LLM) & sesi MCP bisa dimock; provider REA ASLI tetap bisa
// dites live lewat sesi nyata.
// ═══════════════════════════════════════════════════════════════

import path from "node:path";
import {
  sanitizeTask,
  listNativeProviders,
  chatOnce,
  readKey,
  PROVIDER_DEFS,
} from "./rara-agent-native.js";
import { getReaMcpSession } from "./rara-mcp-bridge.js";

export const REA_AGENT_META = {
  version: "1.0.0",
  maxSteps: 12,
  timeoutMs: 240 * 1000,
};

// kurasi default — producer Evidence + follow-up + management.
// Native (Ghidra/Hopper) bakal keliatan "unavailable" di binary_session
// kalau engine-nya gak ada — tetap aman dipanggil (error jelas ke model).
const DEFAULT_TOOLS = [
  "binary_session",
  "analyze_javascript_application",
  "inspect_binary_layout",
  "inspect_artifact",
  "inspect_wasm_artifact",
  "inspect_analysis_view",
  "trace_application_feature",
  "trace_javascript_semantics",
  "compare_application_versions",
  "compare_source_to_bundle",
  "compare_javascript_export_shapes",
  "get_evidence_bundle",
  "export_evidence_bundle",
  "close_binary",
];

const OUT_CAP = 9000;   // char hasil tool yang dikirim ke model per langkah
const TASK_CAP = 4000;

// Seam e2e: { fetch, session } (fetch LLM dimock di sini; key LLM dimock
// via _setNativeDepsForTest({ keys }) milik rara-agent-native — provider
// loop nge-read key dari native readKey).
let _sessionForTest;
export function _setReaAgentDepsForTest({ session } = {}) {
  if (session !== undefined) _sessionForTest = session;
}
export function _resetReaAgentDepsForTest() {
  _sessionForTest = undefined;
}

const session = () => _sessionForTest !== undefined ? _sessionForTest : getReaMcpSession();

export function reaToolWhitelist() {
  const raw = String(process.env.REAAIAGENT_TOOLS || "").trim();
  if (!raw) return DEFAULT_TOOLS;
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

// ── SCHEMA TOOL buat model (format OpenAI function) ──
function buildReaToolSchemas(mcpTools) {
  const allow = new Set(reaToolWhitelist());
  const schemas = [];
  for (const t of mcpTools) {
    if (!allow.has(t.name)) continue;
    schemas.push({
      type: "function",
      function: {
        name: t.name,
        description: t.description || `Tool MCP REA: ${t.name}`,
        parameters: t.inputSchema && t.inputSchema.type === "object"
          ? t.inputSchema
          : { type: "object", properties: {} },
      },
    });
  }
  schemas.push({
    type: "function",
    function: {
      name: "finish",
      description: "Selesaikan analisis — kirim laporan akhir ke user. WAJIB dipanggil setelah analisis cukup (atau gak bisa dilanjutkan).",
      parameters: {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description: "laporan akhir bahasa Indonesia: temuan, cara kerja fitur, evidence_id bukti, limitasi",
          },
        },
        required: ["answer"],
      },
    },
  });
  return schemas;
}

function buildSystemPrompt({ target, toolNames }) {
  const lines = [
    "Kamu AI AGENT REVERSE ENGINEERING yang memakai tools MCP server REA (Reverse Engineer Anything).",
    "Tugas: analisis target tanpa source code, jelaskan cara kerjanya DENGAN BUKTI.",
    "",
    `TOOLS TERSEDIA (${toolNames.length}): ${toolNames.join(", ")}.`,
    "",
    "ALUR BAIK:",
    "1. Mulai dari producer: aplikasi JS/Electron/website → analyze_javascript_application; binary → inspect_binary_layout; file (apk/asar/zip/wasm) → inspect_artifact atau inspect_wasm_artifact.",
    "2. Hasil = Evidence dengan evidence_id. SIMPAN evidence_id — tool lanjutan (trace_*, compare_*, inspect_analysis_view, get_evidence_bundle) menerima evidence_id itu.",
    "3. Hasil besar → pakai inspect_analysis_view (view summary/halaman) atau get_evidence_bundle detail 'summary' — JANGAN minta semua sekaligus.",
    "4. Laporan akhir WAJIB sebutkan: cara kerja (module/fungsi kunci), evidence_id tiap klaim penting, dan limitations yang dilaporkan REA.",
    "",
    "ATURAN:",
    "- Satu tool call per langkah, baca hasilnya dulu sebelum lanjut — jangan nebak.",
    "- Args HARUS valid sesuai schema tool. Kalau REA balas error input, perbaiki args (nama field ada di pesan error) — jangan ganti tool seenaknya.",
    "- Kalau tool bilang unavailable (misal analisis native butuh Ghidra yang belum terpasang), laporkan sebagai limitasi — JANGAN ngarang hasil.",
    "- Panggil finish dengan jawaban lengkap bahasa Indonesia. Jawaban tanpa finish akan dibuang.",
  ];
  if (target) {
    lines.push("", `TARGET ANALISIS (dari user, sudah tersimpan lokal):`, `- path: ${target.path}`, `- jenis: ${target.kind}${target.note ? `\n- catatan: ${target.note}` : ""}`);
  }
  return lines.join("\n");
}

// ── format hasil tool MCP → string ringkas buat model ──
function formatToolResult(r) {
  if (!r.ok) {
    return `[KESALAHAN TRANSPORT] ${String(r.text).slice(0, 1500)}\nCoba ulang tool yang sama (server mungkin baru restart).`;
  }
  if (r.isError) {
    return `[ERROR REA] ${String(r.text).slice(0, 3000)}\nBaca error-nya: perbaiki args sesuai pesan di atas, atau ganti tool yang tepat.`;
  }
  const sc = r.structured || {};
  const evId = sc.evidence_id ? `\n[evidence_id: ${sc.evidence_id}]` : "";
  // prefer text (proyeksi ringkas dari server), sisipkan id evidence
  const body = String(r.text || "").slice(0, OUT_CAP);
  const extra = body.length >= OUT_CAP ? "\n…(hasil dipotong — pakai inspect_analysis_view / get_evidence_bundle detail 'summary' buat detail lanjutan)" : "";
  return `${body}${evId}${extra}`;
}

/**
 * runReaAgent — loop agent RE.
 * @param {object} o
 *   task         — pertanyaan/tugas user (di-sanitize)
 *   target?      — { path, kind, note } target tersimpan (opsional)
 *   session?     — override sesi MCP (e2e/live)
 *   provider?    — paksa provider LLM id
 *   maxSteps?    — default 12
 *   timeoutMs?   — default 240 dtk
 * @returns { ok, answer, steps[], provider, model, tools?, elapsedMs?, error?, detail? }
 */
export async function runReaAgent(o = {}) {
  const task = sanitizeTask(o.task).slice(0, TASK_CAP);
  const startedAt = Date.now();
  const maxSteps = Math.max(1, Math.min(20, o.maxSteps || REA_AGENT_META.maxSteps));
  const timeoutMs = o.timeoutMs || REA_AGENT_META.timeoutMs;

  if (!task) return { ok: false, error: "empty-task" };

  const sess = o.session || session();

  // 1. pastikan sesi + tools list (server mungkin baru pertama nyala)
  let mcpTools;
  try {
    await sess.start();
    mcpTools = await sess.listTools({ refresh: true });
  } catch (e) {
    return {
      ok: false,
      error: "mcp-unavailable",
      detail: String(e?.message || e).slice(0, 300),
      status: sess.status ? sess.status() : null,
    };
  }
  const tools = buildReaToolSchemas(mcpTools);
  const toolNames = tools.map((t) => t.function.name).filter((n) => n !== "finish");
  if (!toolNames.length) {
    return { ok: false, error: "no-tools", detail: `REA tools/list kosong / whitelist gak match (server: ${sess.status()?.serverInfo?.name || "?"})` };
  }

  // 2. provider LLM (reuse native — GitHub Models → Groq)
  const providers = listNativeProviders();
  if (!providers.length) {
    return { ok: false, error: "no-provider", providers: Object.entries(PROVIDER_DEFS).map(([id, d]) => ({ id, label: d.label, signup: d.signup })) };
  }
  let order = providers;
  if (o.provider) {
    const pick = providers.find((p) => p.id === o.provider);
    if (pick) order = [pick, ...providers.filter((p) => p.id !== o.provider)];
  }

  const system = buildSystemPrompt({ target: o.target, toolNames });
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
        const turn = await chatOnce(prov.id, def, key, prov.model, messages, tools, 90000);

        if (!turn.toolCalls.length) {
          if (!turn.content) throw new Error("model balas kosong");
          return { ok: true, answer: turn.content, steps, provider: prov.id, model: turn.model, elapsedMs: Date.now() - startedAt };
        }

        messages.push({ role: "assistant", content: turn.content || null, tool_calls: turn.toolCalls });

        for (const tc of turn.toolCalls) {
          const fn = tc?.function || {};
          let args = {};
          try { args = fn.arguments ? JSON.parse(fn.arguments) : {}; } catch { args = null; }
          const toolName = String(fn.name || "");

          if (toolName === "finish") {
            const answer = args && typeof args.answer === "string" ? args.answer : turn.content || "(agent selesai tanpa jawaban)";
            steps.push({ tool: "finish", ok: true });
            return { ok: true, answer, steps, provider: prov.id, model: turn.model, elapsedMs: Date.now() - startedAt };
          }

          if (!toolNames.includes(toolName)) {
            steps.push({ tool: toolName, ok: false, note: "tool di luar whitelist" });
            messages.push({
              role: "tool",
              tool_call_id: String(tc.id || `t${i}`),
              content: `[TOOL DILARANG] ${toolName} gak ada di daftar tool sesi ini. Pilih dari: ${toolNames.slice(0, 10).join(", ")}…`,
            });
            continue;
          }

          const r = await sess.callTool(toolName, args || {});
          steps.push({
            tool: toolName,
            ok: r.ok && !r.isError,
            note: (r.structured?.evidence_id || String(r.text || "").split("\n")[0] || "").slice(0, 120),
          });
          messages.push({
            role: "tool",
            tool_call_id: String(tc.id || `t${i}`),
            content: formatToolResult(r).slice(0, OUT_CAP + 2000),
          });
        }
      }
      messages.push({ role: "user", content: "Batas langkah tercapai. Panggil finish SEKARANG dengan laporan singkat yang sudah didapat." });
      const last = await chatOnce(prov.id, def, key, prov.model, messages, tools, 90000);
      return { ok: true, answer: last.content || "(agent mentok langkah maksimal)", steps, provider: prov.id, model: last.model, maxed: true, elapsedMs: Date.now() - startedAt };
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  return { ok: false, error: "all-providers-failed", detail: String(lastError?.message || lastError).slice(0, 200), steps };
}

/** reaStatusCardData — data buat kartu status (plugin pakai ini). */
export async function reaStatusCardData() {
  const sess = session();
  try {
    await sess.start();
    const tools = await sess.listTools({ refresh: true });
    const st = sess.status();
    const allow = new Set(reaToolWhitelist());
    return { ...st, connected: true, totalTools: tools.length, activeTools: tools.filter((t) => allow.has(t.name)).length };
  } catch (e) {
    const st = sess.status ? sess.status() : null;
    return { ...(st || {}), connected: false, error: String(e?.message || e).slice(0, 200) };
  }
}
