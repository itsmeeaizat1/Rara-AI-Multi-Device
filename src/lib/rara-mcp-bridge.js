// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════
// rara-mcp-bridge — MCP (Model Context Protocol) client stdio generik.
// Dipakai fitur .reaaiagent buat ngomong ke MCP server REA
// (npm rea-agents, github.com/morluto/rea — reverse engineering with
// agents, MIT). TERVERIFIKASI LIVE di sandbox 12 Okt 2026: handshake
// initialize + tools/list (170 tools) + tools/call
// analyze_javascript_application → Evidence ID lengkap.
//
// TRANSPORT: stdio JSON-RPC, satu pesan per baris (newline-delimited),
// sesuai spesifikasi MCP stdio transport.
//
// DESAIN:
//   • Sesi PERSISTEN singleton per server (getReaMcpSession) — ledger
//     Evidence REA hidup per-koneksi (docs REA: "References belong to
//     the current connection's Evidence ledger"), jadi koneksi
//     dipertahankan antar command biar evidence_id tetap bisa dirujuk.
//   • Auto-restart: kalau proses mati (crash), request berikutnya
//     spawn ulang bersih (gerbang QA 2 — gak hang, gak nyasar).
//   • Semua request dibungkus timeout per-request → gak nge-hook
//     event loop walau server diam (gerbang QA 3+5).
//   • stderr server dicapture (cap) buat diagnosa, gak pernah throw
//     keluar — error jadi { ok:false } yang jelas.
//
// SEAMS E2E: _setMcpDepsForTest({ spawn }) + command override via
// opsi createReaMcpSession({ command }) — test integrasi nyambung
// ke server MCP FAKE deterministik ATAU server REA asli.
// ═══════════════════════════════════════════════════════════════

import { spawn as _spawnDefault } from "node:child_process";

export const MCP_BRIDGE_META = {
  version: "1.0.0",
  defaultReaCommand: "npx rea-agents mcp",
};

const REQUEST_TIMEOUT_MS = 180 * 1000;  // analisis native bisa lama
const STDERR_CAP = 4000;
// budget resmi MCP REA: hasil lengkap masuk 10 MiB buffer (docs: "REA prepares
// complete MCP results within the pinned stdio client's 10 MiB receive-buffer
// budget") — tools/list full profile aja ~500KB, jadi cap HARUS di atas itu.
const MAX_RESPONSE_CHARS = 10 * 1024 * 1024;

let _spawnForTest;
export function _setMcpDepsForTest({ spawn } = {}) { _spawnForTest = spawn; }
export function _resetMcpDepsForTest() { _spawnForTest = undefined; }
const spawnFn = () => _spawnForTest || _spawnDefault;

/**
 * parseMcpCommand — pecah string command jadi { cmd, args } (quoted-aware,
 * tanpa shell → gak ada injection). "npx rea-agents mcp" → { cmd:"npx",
 * args:["rea-agents","mcp"] }.
 */
export function parseMcpCommand(raw) {
  const s = String(raw || "").trim();
  if (!s) return { cmd: "", args: [] };
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ""; } continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  const [cmd, ...args] = out;
  return { cmd: cmd || "", args };
}

/**
 * McpStdioSession — satu koneksi MCP stdio dengan lifecycle aman.
 */
export class McpStdioSession {
  constructor({ id = "mcp", command, cwd, env = {}, requestTimeoutMs = REQUEST_TIMEOUT_MS, logger } = {}) {
    if (!command) throw new Error("command MCP wajib diisi");
    this.id = id;
    this.command = String(command);
    this.cwd = cwd || undefined;
    this.env = { ...env };
    this.requestTimeoutMs = requestTimeoutMs;
    this.logger = logger || null;
    this.proc = null;
    this.serverInfo = null;
    this.protocolVersion = null;
    this.tools = null;          // hasil tools/list terakhir
    this.lastError = null;
    this.stderrTail = "";
    this._buf = "";
    this._pending = new Map();
    this._nextId = 1;
    this._starting = null;      // guard anti dobel-start paralel
  }

  _log(level, msg) {
    try { this.logger?.[level]?.(msg); } catch { /* logger gak boleh bikin crash */ }
  }

  _spawn() {
    const { cmd, args } = parseMcpCommand(this.command);
    if (!cmd) throw new Error("command MCP kosong");
    const child = spawnFn()(cmd, args, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.env },
    });
    child.stdout.setEncoding?.("utf8");
    child.stdout.on("data", (d) => this._onStdout(d));
    child.stderr.setEncoding?.("utf8");
    child.stderr.on("data", (d) => this._onStderr(d));
    child.on("error", (e) => { this.lastError = `spawn-error: ${e.message}`; this._failAll(e); });
    child.on("exit", (code, sig) => {
      const stale = this.proc !== child; // child lama: pending sekarang MILIK sesi baru
      if (this.proc === child) this.proc = null;
      if (stale) return;
      this.lastError = this.lastError || `server-exit: code=${code} sig=${sig || "-"}`;
      this._failAll(new Error(`MCP server mati (code=${code} sig=${sig || "-"})`));
    });
    return child;
  }

  _onStderr(d) {
    const s = String(d || "");
    this.stderrTail = (this.stderrTail + s).slice(-STDERR_CAP);
  }

  _onStdout(d) {
    this._buf += String(d || "");
    if (this._buf.length > MAX_RESPONSE_CHARS * 2) {
      // defensive: baris kegedean tanpa newline → buang (gak pernah nge-hook loop)
      this._buf = "";
      this.lastError = "response-oversize";
      return;
    }
    let idx;
    while ((idx = this._buf.indexOf("\n")) >= 0) {
      const line = this._buf.slice(0, idx).trim();
      this._buf = this._buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { this._log("warn", `[${this.id}] baris bukan JSON: ${line.slice(0, 120)}`); continue; }
      if (msg && msg.id != null && this._pending.has(msg.id)) {
        const { resolve, timer } = this._pending.get(msg.id);
        clearTimeout(timer);
        this._pending.delete(msg.id);
        resolve(msg);
      }
      // notification (tanpa id) diabaikan — REA gak kirim tools/list_changed (docs)
    }
  }

  _failAll(err) {
    for (const [, { reject, timer }] of this._pending) {
      clearTimeout(timer);
      reject(err);
    }
    this._pending.clear();
  }

  /** start — spawn + initialize + initialized (idempoten, race-safe). */
  async start() {
    if (this.proc) return this;
    if (this._starting) return this._starting;
    this._starting = (async () => {
      this.proc = this._spawn();
      const init = await this.request("initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "rara-ai-multi-device", version: "1.0.0" },
      });
      if (init.error) throw new Error(`initialize gagal: ${init.error.message || "?"}`);
      this.serverInfo = init.result?.serverInfo || null;
      this.protocolVersion = init.result?.protocolVersion || null;
      // notification initialized — wajib sebelum tools/call
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      this.lastError = null;
      return this;
    })();
    try {
      const r = await this._starting;
      return r;
    } catch (e) {
      // handshake gagal (timeout/spawn) → bunuh proses zombie biar gak
      // nyangkut hidup tanpa initialize (status jadi konsisten)
      const p = this.proc;
      this.proc = null;
      this.serverInfo = null;
      this._failAll(new Error("start gagal"));
      if (p) { try { p.stdin?.end?.(); } catch {} try { p.kill(); } catch {} }
      throw e;
    } finally {
      this._starting = null;
    }
  }

  /** request — satu JSON-RPC call dengan timeout per-request. */
  async request(method, params, timeoutMs) {
    if (!this.proc && !this._starting) await this.start();
    if (!this.proc) throw new Error("MCP server gak nyala");
    const id = this._nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params: params || {} });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`timeout ${method} (${Math.round((timeoutMs || this.requestTimeoutMs) / 1000)}s)`));
      }, timeoutMs || this.requestTimeoutMs);
      this._pending.set(id, { resolve, reject, timer });
      try {
        this.proc.stdin.write(payload + "\n");
      } catch (e) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(e);
      }
    });
  }

  /** listTools — tools/list (cache-able; REA katalog statis per docs). */
  async listTools({ refresh = false } = {}) {
    if (this.tools && !refresh) return this.tools;
    const res = await this.request("tools/list", {});
    if (res.error) throw new Error(`tools/list gagal: ${res.error.message || "?"}`);
    const tools = Array.isArray(res.result?.tools) ? res.result.tools : [];
    this.tools = tools.map((t) => ({
      name: String(t.name || ""),
      description: String(t.description || "").slice(0, 1200),
      inputSchema: t.inputSchema && typeof t.inputSchema === "object" ? t.inputSchema : { type: "object", properties: {} },
    })).filter((t) => t.name);
    return this.tools;
  }

  /**
   * callTool — tools/call. Balikan GAK PERNAH throw:
   *   { ok, isError, text, structured, raw }
   * ok=false hanya buat kegagalan transport (server mati/timeout/spawn),
   * isError=true = error domain dari server (validasi input, dsb) —
   * dua-duanya tetap balik ke model biar bisa self-correct.
   */
  async callTool(name, args = {}, timeoutMs) {
    try {
      const res = await this.request("tools/call", { name, arguments: args || {} }, timeoutMs);
      if (res.error) {
        return { ok: false, isError: true, text: `JSON-RPC error: ${res.error.message || "?"}`, structured: null, raw: res.error };
      }
      const r = res.result || {};
      const text = (Array.isArray(r.content) ? r.content : [])
        .map((c) => (c?.type === "text" ? String(c.text || "") : ""))
        .join("\n").slice(0, MAX_RESPONSE_CHARS);
      return {
        ok: true,
        isError: r.isError === true,
        text,
        structured: r.structuredContent || null,
        raw: r,
      };
    } catch (e) {
      this.lastError = String(e?.message || e);
      return { ok: false, isError: false, text: this.lastError, structured: null, raw: null };
    }
  }

  /** status — snapshot buat kartu .reaaiagent status. */
  status() {
    return {
      id: this.id,
      command: this.command,
      running: !!this.proc,
      serverInfo: this.serverInfo,
      protocolVersion: this.protocolVersion,
      toolCount: this.tools ? this.tools.length : null,
      lastError: this.lastError,
      stderrTail: this.stderrTail.slice(-600),
    };
  }

  /** close — matikan server dengan sopan. */
  async close() {
    const p = this.proc;
    this.proc = null;
    this._failAll(new Error("session ditutup"));
    if (p) {
      try { p.stdin?.end?.(); } catch {}
      try { p.kill(); } catch {}
    }
  }
}

// ── SINGLETON REA (ledger Evidence per-koneksi → koneksi dipertahankan) ──
let _reaSession;

/**
 * createReaMcpSession — pabrik sesi REA dari konfigurasi.
 * Env: REA_MCP_CMD (default "npx rea-agents mcp" — npx otomatis pakai
 * instalasi lokal node_modules kalo ada, jadi cocok juga di container).
 * REA_MCP_INPUT_SCHEMA_PROFILE default "compact" (schema tools kecil →
 * hemat token konteks model; REA tetap validasi input lengkap).
 */
export function createReaMcpSession({ command, env = {}, requestTimeoutMs } = {}) {
  const cmd = String(command || process.env.REA_MCP_CMD || MCP_BRIDGE_META.defaultReaCommand);
  const e = {
    REA_MCP_INPUT_SCHEMA_PROFILE: process.env.REA_MCP_INPUT_SCHEMA_PROFILE || "compact",
    ...env,
  };
  return new McpStdioSession({
    id: "rea",
    command: cmd,
    env: e,
    requestTimeoutMs,
  });
}

/** getReaMcpSession — sesi REA bersama (persisten antar command). */
export function getReaMcpSession() {
  if (!_reaSession) _reaSession = createReaMcpSession();
  return _reaSession;
}

/** _setReaSessionForTest / _resetReaSessionForTest — seam e2e. */
export function _setReaSessionForTest(s) { _reaSession = s; }
export function _resetReaSessionForTest() { if (_reaSession) { try { _reaSession.close(); } catch {} } _reaSession = undefined; }

/** closeReaMcpSession — dipakai subcommand .reaaiagent stop. */
export async function closeReaMcpSession() {
  if (!_reaSession) return false;
  await _reaSession.close();
  _reaSession = undefined;
  return true;
}
