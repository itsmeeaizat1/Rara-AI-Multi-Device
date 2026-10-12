// Fake MCP server stdio — deterministik buat suite reaaiagent-e2e.
// Protocol: newline-delimited JSON-RPC 2.0 di stdio.
// Behavior:
//   initialize            → serverInfo { name: "fake-rea", version: "0.1.0" }
//   tools/list            → 3 tools (rea_probe_ok, rea_probe_err, rea_die)
//   tools/call rea_probe_ok  { echo } → hasil ok + structuredContent.evidence_id
//   tools/call rea_probe_err     → isError:true (error domain)
//   tools/call rea_die           → process.exit(7) (bukti auto-restart)
//   tools/call <lain>            → JSON-RPC error -32602
import { createInterface } from "node:readline";

const TOOLS = [
  {
    name: "rea_probe_ok",
    description: "Probe ok — balikin evidence sintetis.",
    inputSchema: { type: "object", properties: { echo: { type: "string" } }, required: ["echo"] },
  },
  {
    name: "rea_probe_err",
    description: "Probe error domain — isError true.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rea_die",
    description: "Matikan server (uji restart).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "analyze_javascript_application",
    description: "Fake analyze — buat whitelist loop test.",
    inputSchema: { type: "object", properties: { input_path: { type: "string" } }, required: ["input_path"] },
  },
];

const rl = createInterface({ input: process.stdin });
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");

rl.on("line", (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (!msg || msg.id == null) return; // notification → diam
  const { id, method, params = {} } = msg;
  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: "2025-11-25", serverInfo: { name: "fake-rea", version: "0.1.0" }, capabilities: {} } });
    return;
  }
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }
  if (method === "tools/call") {
    const name = params.name;
    if (name === "rea_die") {
      send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "bye" }] } });
      setTimeout(() => process.exit(7), 30);
      return;
    }
    if (name === "rea_probe_ok") {
      const ev = "ev_" + "a".repeat(64);
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `probe ok: ${params.arguments?.echo || "?"} (evidence ${ev})` }],
          structuredContent: { evidence_id: ev, normalized_result: { echo: params.arguments?.echo || "?" } },
        },
      });
      return;
    }
    if (name === "rea_probe_err") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: "Input validation error: input_path: Invalid input: expected string, received undefined" }],
        },
      });
      return;
    }
    if (name === "analyze_javascript_application") {
      const ev = "ev_" + "b".repeat(64);
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `analysis ok (${params.arguments?.input_path || "?"})` }],
          structuredContent: { evidence_id: ev, normalized_result: { modules: ["index.js", "search.js"] } },
        },
      });
      return;
    }
    send({ jsonrpc: "2.0", id, error: { code: -32602, message: `unknown tool: ${name}` } });
    return;
  }
  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown method: ${method}` } });
});
