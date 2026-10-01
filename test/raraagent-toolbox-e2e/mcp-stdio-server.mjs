// Fixture: server MCP STDIO minimal buat e2e (JSON-RPC over stdin/stdout).
// Implement initialize / notifications/initialized / tools/list / tools/call.
import readline from "node:readline"
const rl = readline.createInterface({ input: process.stdin })
const send = (obj) => process.stdout.write(JSON.stringify(obj) + "\n")
rl.on("line", (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "echo-server", version: "1.0.0" } } })
  } else if (msg.method === "tools/list") {
    send({ jsonrpc: "2.0", id: msg.id, result: { tools: [
      { name: "echo", description: "Balikin teks yang dikirim", inputSchema: { type: "object", properties: { text: { type: "string" } } } },
      { name: "add", description: "Tambah dua angka", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } } } },
    ] } })
  } else if (msg.method === "tools/call") {
    const n = msg.params?.name
    const a = msg.params?.arguments || {}
    if (n === "echo") send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "ECHO:" + String(a.text ?? "") }] } })
    else if (n === "add") send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: String((Number(a.a) || 0) + (Number(a.b) || 0)) }] } })
    else send({ jsonrpc: "2.0", id: msg.id, result: { isError: true, content: [{ type: "text", text: "tool gak ada: " + n }] } })
  }
})
