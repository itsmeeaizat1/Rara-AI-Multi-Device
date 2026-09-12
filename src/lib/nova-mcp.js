// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-mcp.js — MCP (Model Context Protocol) CLIENT buat agent .novaagent,
// request owner 12 Sep 2026: "jadi tool, skills dan mcp banyak yg dipasang
// lengkap agent sebagai tool tambahan atau kebutuhan yang dibutuhkan agent".
// Agent bisa pake tool dari SERVER MCP eksternal apa pun:
//   * Transport HTTP (streamable HTTP, MCP spec 2025-03-26): POST JSON-RPC 2.0
//   * Transport STDIO: spawn proses server lokal (node/npx/python), RPC via
//     stdin/stdout newline-delimited — buat server MCP yang jalan di VPS.
//   * Config persist: db.setting("mcpServers") { nama: {type,url} | {type:"stdio",command,args[]} }
//   * Tool discovery (tools/list) + pemanggilan (tools/call) + cache 5 menit.
//   * getMcpTools() → daftar flat {server,name,desc} buat ke-merge ke prompt AI.
// Seam: setMcpRpc buat e2e (tanpa network/proses asli).

import { getDatabase } from "./nova-database.js"

const TOOLS_TTL_MS = 5 * 60 * 1000
const toolCache = new Map() // server → { tools, ts }

// ── seam ──
let mcpRpc = defaultMcpRpc
export function setMcpRpc(fn) { mcpRpc = fn || defaultMcpRpc }
export function resetMcpRpc() { mcpRpc = defaultMcpRpc }

// ═══════════ TRANSPORT ═══════════

// HTTP transport — streamable HTTP MCP: POST JSON-RPC, balasan JSON atau
// SSE (text/event-stream, ambil event data pertama).
async function httpRpc(server, method, params, notif = false) {
  const body = notif ? { jsonrpc: "2.0", method } : { jsonrpc: "2.0", id: nextId(), method, params }
  const res = await fetch(server.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(server.headers || {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error("HTTP " + res.status)
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("text/event-stream")) {
    const text = await res.text()
    const m = text.match(/^data:\s*(\{.*\})/m)
    if (!m) throw new Error("SSE tanpa data JSON")
    return notif ? null : JSON.parse(m[1])
  }
  const data = await res.json().catch(() => null)
  if (notif) return null
  if (!data) throw new Error("balasan bukan JSON")
  if (data.error) throw new Error(data.error.message || "RPC error")
  return data
}

// STDIO transport — spawn proses, kirim RPC lewat stdin (1 baris JSON),
// baca balasan dari stdout (1 baris JSON). Satu koneksi per server per call
// (stateless biar simpel + anti-leak; initialize tiap sesi singkat).
import { spawn } from "node:child_process"
async function stdioRpc(server, method, params, notif = false) {
  return new Promise((resolve, reject) => {
    let child
    try {
      const sh = server.shell === true
      child = sh
        ? spawn(server.command, { shell: true })
        : spawn(server.command, server.args || [], { stdio: ["pipe", "pipe", "pipe"] })
    } catch (e) { return reject(new Error("gak bisa spawn: " + e.message)) }
    let buf = ""
    let settled = false
    // request id dipisah eksplisit biar resolve CUMA di balasan method
    // yang diminta (fix: tadinya resolve di balasan initialize → tools/list
    // balik [] karena kepotong response pertama)
    const INIT_ID = 100
    const CALL_ID = 101
    const done = (fn, v) => { if (!settled) { settled = true; clearTimeout(timer); try { child.kill() } catch {} fn(v) } }
    const timer = setTimeout(() => done(reject, new Error("timeout stdio MCP (25 dtk)")), 25000)
    child.stdout.on("data", (d) => {
      buf += d.toString()
      let idx
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (notif || msg.id !== CALL_ID) continue
          if (msg.result !== undefined) return done(resolve, msg)
          if (msg.error) return done(reject, new Error(msg.error.message || "RPC error"))
        } catch {}
      }
    })
    child.stderr.on("data", () => {}) // log server gak relevan
    child.on("error", (e) => done(reject, new Error("spawn gagal: " + e.message)))
    child.on("close", () => done(reject, new Error("proses MCP mati duluan")))
    const reqs = [
      JSON.stringify({ jsonrpc: "2.0", id: INIT_ID, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "nova-agent", version: "1.0.0" } } }),
    ]
    if (!notif) {
      reqs.push(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))
      reqs.push(JSON.stringify({ jsonrpc: "2.0", id: CALL_ID, method, params: params || {} }))
    }
    child.stdin.write(reqs.join("\n") + "\n")
    child.stdin.end()
    if (notif) setTimeout(() => done(resolve, null), 300)
  })
}

let idc = 100
function nextId() { return ++idc }
async function defaultMcpRpc(server, method, params, notif) {
  if (server.type === "stdio") return stdioRpc(server, method, params, notif)
  return httpRpc(server, method, params, notif)
}

// ═══════════ CONFIG (persist db) ═══════════

export async function getMcpServers() {
  const db = getDatabase()
  return (await db.setting("mcpServers")) || {}
}
export async function mcpAddServer(name, cfg) {
  if (!name || !/^[a-z0-9_-]{2,20}$/i.test(name)) throw new Error("nama server 2-20 huruf (a-z, 0-9, -, _)")
  if (cfg.type === "http") {
    if (!/^https?:\/\//i.test(cfg.url || "")) throw new Error("URL http/https wajib")
  } else if (cfg.type === "stdio") {
    if (!cfg.command) throw new Error("command wajib buat stdio")
  } else throw new Error("type harus http atau stdio")
  const db = getDatabase()
  const servers = await getMcpServers()
  servers[name] = { ...cfg, added: new Date().toISOString() }
  await db.setting("mcpServers", servers)
  toolCache.delete(name)
  return servers[name]
}
export async function mcpRemoveServer(name) {
  const db = getDatabase()
  const servers = await getMcpServers()
  if (!servers[name]) throw new Error(`server "${name}" gak ada`)
  delete servers[name]
  await db.setting("mcpServers", servers)
  toolCache.delete(name)
}

// ═══════════ TOOL DISCOVERY & CALL ═══════════

export async function mcpListTools(name, { force = false } = {}) {
  const servers = await getMcpServers()
  const server = servers[name]
  if (!server) throw new Error(`server "${name}" gak ada`)
  if (!force && toolCache.has(name)) {
    const c = toolCache.get(name)
    if (Date.now() - c.ts < TOOLS_TTL_MS) return c.tools
  }
  const resp = await mcpRpc(server, "tools/list", {})
  const tools = (resp?.result?.tools || []).map((t) => ({
    name: t.name,
    desc: (t.description || "").slice(0, 300),
    schema: t.inputSchema || null,
  }))
  toolCache.set(name, { tools, ts: Date.now() })
  return tools
}

export async function mcpCallTool(name, tool, args = {}) {
  const servers = await getMcpServers()
  const server = servers[name]
  if (!server) throw new Error(`server "${name}" gak ada`)
  const resp = await mcpRpc(server, "tools/call", { name: tool, arguments: args })
  const content = resp?.result?.content || []
  const text = content.map((c) => c.text || "").join("\n").trim()
  if (resp?.result?.isError) throw new Error(text || "tool MCP error")
  return text || "(tool selesai, tanpa output teks)"
}

// ═══════════ MERGE KE AGENT ═══════════

// Daftar flat semua tool semua server — buat ditempel di prompt think().
export async function getMcpTools() {
  const servers = await getMcpServers()
  const out = []
  for (const [name, cfg] of Object.entries(servers)) {
    try {
      const tools = await mcpListTools(name)
      for (const t of tools) out.push({ server: name, tool: t.name, desc: t.desc })
    } catch { /* server mati gak boleh matiin agent */ }
  }
  return out
}

// Nama tool gabungan: "mcp.<server>.<tool>"
export function mcpFqName(server, tool) { return `mcp.${server}.${tool}` }
export function parseMcpFq(fq) {
  const m = String(fq || "").match(/^mcp\.([a-z0-9_-]+)\.(.+)$/i)
  return m ? { server: m[1], tool: m[2] } : null
}

// Bungkus tool MCP jadi entry bentuk TOOLS (perm/args/desc/run) supaya
// executor novaai.js jalan tanpa edit alur.
export async function getMcpToolEntries() {
  const flat = await getMcpTools()
  const entries = {}
  for (const t of flat) {
    const fq = mcpFqName(t.server, t.tool)
    entries[fq] = {
      perm: "user", danger: false, args: ["args"],
      desc: `TOOL MCP [${t.server}] ${t.tool}: ${t.desc || "(tanpa deskripsi)"}`,
      done: "✅ Hasil tool MCP-nya di atas ya.",
      run: async (conn, m, a) => {
        const args = a?.args && typeof a.args === "object" ? a.args : a || {}
        const text = await mcpCallTool(t.server, t.tool, args)
        await conn.sendMessage(m.chat, { text: String(text).slice(0, 3500) }, { quoted: m })
      },
    }
  }
  return entries
}

// Tes koneksi server: initialize + tools/list
export async function mcpTestServer(name) {
  const tools = await mcpListTools(name, { force: true })
  return tools
}
