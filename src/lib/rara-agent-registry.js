// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// rara-agent-registry — REGISTRY TOOL DEKLARATIF (3 Okt 2026)
// Request owner: "ai agent ini kodenya terlalu statis, aku mohon upgrade
// semua kodenya".
//
// MASALAH LAMA: nambah 1 tool (contoh editimage) = edit 5 tempat manual:
//   TOOL_LIST, paragraf SYS_PLAN 2.460 karakter, return{} executor,
//   TOOL_TOPIC, TOOL_NATURAL_DOING — plus normalisasi argumen yang
//   whitelist field satu-satu (field baru dibuang DIAM-DIAM).
//
// SEKARANG: tool mendeklarasikan dirinya SEKALI lewat defineTool({...}).
// Semua turunan dihitung otomatis dari registry:
//   • listToolNames()        → pengganti TOOL_LIST
//   • describeTools()        → paragraf "Tool valid: ..." buat prompt planner
//   • exampleJson()          → contoh JSON planner
//   • normalizeToolCall()    → sanitasi argumen DARI SKEMA (bukan whitelist)
//   • doingPhrase()/topicWord() → status natural + guard halusinasi
//   • buildExecutorMap(ctx)  → {nama: fn(t, context)} buat runAgent
//   • toLegacyTools()        → bentuk TOOLS {perm,args,desc,done,run} raraagent
// Tool tambahan dari luar (plugin/MCP) bisa registerTool() saat runtime.
// ============================================================

const _tools = new Map();

/**
 * Deklarasi tool.
 * @param {object} def
 *  name     : id unik huruf kecil (a-z0-9)
 *  desc     : kapan dipakai (Bahasa Indonesia, 1-2 kalimat) — masuk prompt
 *  args     : { field: { type:'string'|'boolean'|'number'|'any', required?, desc?, max?, enum?[] } }
 *  example  : objek contoh pemanggilan (tanpa "tool") — masuk prompt
 *  perm     : 'user' | 'admin' | 'owner'     (default 'user')
 *  danger   : butuh konfirmasi non-owner      (default false)
 *  doing    : frasa natural saat berjalan ("bikin gambarnya")
 *  topic    : kata topik buat guard halusinasi reply (opsional)
 *  done     : pesan sukses default
 *  order    : urutan di prompt (default 100)
 *  run      : async (args, ctx) => { ok, msg, evidence? }
 */
export function defineTool(def) {
  const name = String(def?.name || "").toLowerCase().trim();
  if (!/^[a-z][a-z0-9]{1,24}$/.test(name)) throw new Error(`nama tool gak valid: "${def?.name}"`);
  if (typeof def.run !== "function") throw new Error(`tool ${name}: run wajib function`);
  if (!def.desc) throw new Error(`tool ${name}: desc wajib`);
  if (_tools.has(name)) throw new Error(`tool ${name} sudah terdaftar`);
  const args = {};
  for (const [k, v] of Object.entries(def.args || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k)) throw new Error(`tool ${name}: nama arg gak valid "${k}"`);
    args[k] = { type: "string", required: false, max: 4000, ...(v || {}) };
  }
  const tool = {
    name,
    desc: String(def.desc),
    args,
    example: def.example || null,
    perm: def.perm || "user",
    danger: !!def.danger,
    doing: def.doing || `ngerjain ${name}-nya`,
    topic: def.topic || null,
    done: def.done || "Selesai.",
    order: Number.isFinite(def.order) ? def.order : 100,
    run: def.run,
  };
  _tools.set(name, tool);
  return tool;
}

/** Daftar runtime (plugin/MCP). Timpa kalau replace=true. */
export function registerTool(def, { replace = false } = {}) {
  if (replace) _tools.delete(String(def?.name || "").toLowerCase().trim());
  return defineTool(def);
}
export function unregisterTool(name) { return _tools.delete(String(name || "").toLowerCase().trim()); }
export function getTool(name) { return _tools.get(String(name || "").toLowerCase().trim()) || null; }
export function hasTool(name) { return _tools.has(String(name || "").toLowerCase().trim()); }

function sorted() {
  return [..._tools.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
export function listToolNames() { return sorted().map((t) => t.name); }

/** Paragraf deskripsi tool buat prompt planner — dihitung dari registry. */
export function describeTools() {
  return sorted().map((t) => {
    const a = Object.entries(t.args).map(([k, v]) => {
      const bits = [];
      if (v.required) bits.push("wajib");
      if (v.enum) bits.push(v.enum.join("/"));
      if (v.desc) bits.push(v.desc);
      return `"${k}"${bits.length ? " (" + bits.join(", ") + ")" : ""}`;
    });
    const perm = t.perm === "owner" ? " [OWNER saja]" : t.perm === "admin" ? " [admin grup]" : "";
    return `${t.name} (${t.desc}${a.length ? " — isi " + a.join(", ") : ""})${perm}`;
  }).join(", ");
}

/** Contoh JSON array tools buat prompt planner. */
export function exampleJson() {
  return JSON.stringify(
    sorted().filter((t) => t.example).map((t) => ({ tool: t.name, ...t.example })),
  );
}

/**
 * Sanitasi 1 panggilan tool dari output LLM, BERDASARKAN SKEMA:
 *  - field di luar skema dibuang (anti injeksi arg liar)
 *  - tipe dipaksa (string/boolean/number/any), dipotong `max`
 *  - enum divalidasi (nilai di luar enum → dibuang)
 *  - alias umum (args/text/query/prompt) dipetakan ke field pertama string
 * Return null kalau tool gak dikenal / arg wajib kosong.
 */
export function normalizeToolCall(raw) {
  const name = String(raw?.tool || "").toLowerCase().trim();
  const tool = _tools.get(name);
  if (!tool) return null;
  const out = { tool: name };
  const src = raw && typeof raw === "object" ? raw : {};
  const keys = Object.keys(tool.args);
  for (const k of keys) {
    const spec = tool.args[k];
    let v = src[k];
    if (v === undefined && src.data && typeof src.data === "object" && !Array.isArray(src.data)) v = src.data[k];
    if (v === undefined && typeof src.args === "object" && src.args && !Array.isArray(src.args)) v = src.args[k];
    if (v === undefined || v === null) continue;
    switch (spec.type) {
      case "boolean": v = v === true || /^(true|ya|yes|1|on)$/i.test(String(v).trim()); break;
      case "number": { const n = Number(v); if (!Number.isFinite(n)) continue; v = n; break; }
      case "any": break;
      default: v = String(v).slice(0, spec.max);
    }
    if (spec.enum && !spec.enum.includes(String(v).toLowerCase())) continue;
    out[k] = spec.enum ? String(v).toLowerCase() : v;
  }
  // alias longgar: planner sering taruh nilai di args/text/query/prompt
  const firstStr = keys.find((k) => tool.args[k].type === "string" && !tool.args[k].enum);
  if (firstStr && out[firstStr] === undefined) {
    for (const alias of ["args", "text", "query", "prompt", "value"]) {
      if (typeof src[alias] === "string" && src[alias].trim()) { out[firstStr] = src[alias].slice(0, tool.args[firstStr].max); break; }
    }
  }
  for (const k of keys) if (tool.args[k].required && (out[k] === undefined || out[k] === "")) out.__missing = (out.__missing || []).concat(k);
  return out;
}

export function doingPhrase(name) { return getTool(name)?.doing || `ngerjain ${name}-nya`; }
export function topicWord(name) { return getTool(name)?.topic || null; }

/** Peta topik {tool: kata} — pengganti TOOL_TOPIC statis. */
export function topicMap() {
  const o = {};
  for (const t of _tools.values()) if (t.topic) o[t.name] = t.topic;
  return o;
}
export function doingMap() {
  const o = {};
  for (const t of _tools.values()) o[t.name] = t.doing;
  return o;
}

/**
 * Bangun peta executor {nama: fn(toolCall, runCtx)} buat runAgent().
 * ctx = { m, sock, db, mediaBuffer, deps, onStatus, isOwner }.
 * Gate `perm` dicek di sini (level KODE): owner-only ditolak untuk non-owner.
 * `deps[nama]` (seam e2e) menimpa run bawaan.
 */
export function buildExecutorMap(ctx = {}) {
  const map = {};
  for (const t of sorted()) {
    map[t.name] = async (call, runCtx) => {
      if (typeof ctx.deps?.[t.name] === "function") return ctx.deps[t.name](call, runCtx);
      if (t.perm === "owner" && !ctx.m?.isOwner) return { ok: false, msg: `Tool ${t.name} cuma bisa dipakai owner bot` };
      if (t.perm === "admin" && ctx.m?.isGroup && !ctx.m?.isAdmin && !ctx.m?.isOwner) return { ok: false, msg: `Tool ${t.name} cuma buat admin grup` };
      const missing = (call.__missing || []);
      if (missing.length) return { ok: false, msg: `Tool ${t.name} butuh: ${missing.join(", ")}` };
      try {
        return await t.run(call, ctx, runCtx);
      } catch (e) {
        return { ok: false, msg: `Gagal ${t.name}: ${e?.message || "error"}` };
      }
    };
  }
  return map;
}

/**
 * Bentuk legacy TOOLS raraagent {perm,args:[..],danger,desc,done,run(conn,m,a)}.
 * Dipakai supaya raraai.js (yang baca TOOLS[decision.tool]) tetap jalan
 * tanpa dirombak — tapi SUMBERNYA sekarang registry yang sama.
 */
export function toLegacyTools(ctxFactory) {
  const o = {};
  for (const t of sorted()) {
    o[t.name] = {
      perm: t.perm,
      danger: t.danger,
      args: Object.keys(t.args),
      desc: t.desc,
      done: t.done,
      run: async (conn, m, a) => {
        const call = normalizeToolCall({ tool: t.name, ...(a || {}) });
        if (!call) throw new Error("argumen tool gak valid");
        if (call.__missing?.length) throw new Error(`butuh: ${call.__missing.join(", ")}`);
        const r = await t.run(call, ctxFactory(conn, m), {});
        if (r && r.ok === false) throw new Error(r.msg || "gagal");
      },
    };
  }
  return o;
}

export function _resetRegistryForTest() { _tools.clear(); }
