// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 MCP MANAGER — .mcp (request owner 12 Sep 2026)
// 🔹 "jadi tool, skills dan mcp banyak yg dipasang lengkap agent sebagai
// 🔹 tool tambahan atau kebutuhan yang dibutuhkan agent"
// 🔹 Kelola server MCP (Model Context Protocol) — tool eksternal yang
// 🔹 ke-merge otomatis ke otak .novaagent (mcp.<server>.<tool>)
// 🔹 Support transport HTTP (remote) + STDIO (server lokal VPS)
// ============================================================
import {
  getMcpServers, mcpAddServer, mcpRemoveServer,
  mcpListTools, mcpCallTool, mcpTestServer, getMcpTools,
} from "../../src/lib/nova-mcp.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mcp",
  alias: ["mcp", "mcptools"],
  category: "ai",
  description: "Kelola server MCP — tool eksternal buat agent novaagent",
  usage: ".mcp [list / add <nama> <url> / adds <nama> <command...> / remove <nama> / tools <nama> / test <nama> / call <nama> <tool> <json>]",
  example: ".mcp add waktu https://mcp.example.com/mcp",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function srvBox(m, servers, title) {
  const lines = Object.entries(servers).map(([n, s]) =>
    `• ${n} — ${s.type === "stdio" ? "stdio: " + s.command : s.url}`
  );
  if (!lines.length) lines.push("(belum ada server MCP terpasang)");
  return claraWrap(title, lines, {
    footer: "Tool MCP ke-merge otomatis ke .novaagent (mcp.<server>.<tool>)",
  });
}

async function handler(m, { args, sock }) {
  const sub = String(args[0] || "").toLowerCase();

  // ── daftar server ──
  if (!sub || sub === "list" || sub === "status") {
    const servers = await getMcpServers();
    if (!Object.keys(servers).length) {
      return m.reply(claraWrap("mcp", [
        "Belum ada server MCP terpasang.",
        "",
        "Pasang server HTTP:",
        `${m.prefix}mcp add <nama> <url>`,
        "",
        "Pasang server lokal (VPS):",
        `${m.prefix}mcp adds <nama> <command...>`,
        "",
        "Tool MCP ke-merge otomatis ke .novaagent —",
        "AI bisa pake mcp.<nama>.<tool> pas dibutuhkan.",
      ]));
    }
    return m.reply(srvBox(m, servers, "server mcp terpasang"));
  }

  // ── add server HTTP ──
  if (sub === "add") {
    const nama = String(args[1] || "").toLowerCase();
    const url = String(args[2] || "");
    if (!nama || !url) return m.reply(claraWrap("mcp", [
      `Format: ${m.prefix}mcp add <nama> <url>`,
      "",
      `Contoh: ${m.prefix}mcp add waktu https://mcp.example.com/mcp`,
    ]));
    try {
      await mcpAddServer(nama, { type: "http", url });
      let tools = [];
      try { tools = await mcpTestServer(nama); } catch (e) { /* koneksi gagal masih kepasang, kasih note */ }
      return m.reply(claraWrap("mcp", [
        `✅ Server "${nama}" (HTTP) terpasang.`,
        ...(tools.length ? [`Terdeteksi ${tools.length} tool: ${tools.slice(0, 10).map((t) => t.name).join(", ")}${tools.length > 10 ? " …" : ""}`] : ["⚠️ Server kepasang tapi belum kebaca tool-nya — cek: " + m.prefix + "mcp test " + nama]),
      ]));
    } catch (e) {
      return m.reply(claraWrap("mcp", `Gagal: ${e.message}`, "error"));
    }
  }

  // ── add server STDIO (command lokal VPS) ──
  if (sub === "adds" || sub === "addstdio") {
    const nama = String(args[1] || "").toLowerCase();
    const cmdParts = (args.slice(2) || []).map(String);
    if (!nama || !cmdParts.length) return m.reply(claraWrap("mcp", [
      `Format: ${m.prefix}mcp adds <nama> <command> [arg...]`,
      "",
      `Contoh: ${m.prefix}mcp adds waktu npx -y @modelcontextprotocol/server-everything`,
    ]));
    try {
      await mcpAddServer(nama, { type: "stdio", command: cmdParts[0], args: cmdParts.slice(1) });
      let tools = [];
      try { tools = await mcpTestServer(nama); } catch {}
      return m.reply(claraWrap("mcp", [
        `✅ Server "${nama}" (STDIO) terpasang.`,
        ...(tools.length ? [`Terdeteksi ${tools.length} tool`] : ["⚠️ Tool belum kebaca — pastikan command jalan di VPS: " + m.prefix + "mcp test " + nama]),
      ]));
    } catch (e) {
      return m.reply(claraWrap("mcp", `Gagal: ${e.message}`, "error"));
    }
  }

  // ── remove ──
  if (sub === "remove" || sub === "hapus" || sub === "del") {
    const nama = String(args[1] || "").toLowerCase();
    try {
      await mcpRemoveServer(nama);
      return m.reply(claraWrap("mcp", `✅ Server "${nama}" dihapus`));
    } catch (e) {
      return m.reply(claraWrap("mcp", `Gagal: ${e.message}`, "error"));
    }
  }

  // ── tools: semua / per server ──
  if (sub === "tools" || sub === "tool") {
    const nama = String(args[1] || "").toLowerCase();
    if (nama && nama !== "semua" && nama !== "all") {
      let tools;
      try { tools = await mcpTestServer(nama); }
      catch (e) { return m.reply(claraWrap("mcp", `Gagal: ${e.message}`, "error")); }
      return m.reply(claraWrap(`tool server ${nama}`,
        tools.length ? tools.map((t) => `• ${t.name} — ${(t.desc || "").slice(0, 120)}`) : ["(server gak nge-expose tool)"]));
    }
    const flat = await getMcpTools();
    return m.reply(claraWrap("semua tool mcp",
      flat.length ? flat.map((t) => `• mcp.${t.server}.${t.tool} — ${(t.desc || "").slice(0, 100)}`) : ["(belum ada tool MCP — pasang server dulu)"]));
  }

  // ── test koneksi ──
  if (sub === "test") {
    const nama = String(args[1] || "").toLowerCase();
    if (!nama) return m.reply(claraWrap("mcp", `Format: ${m.prefix}mcp test <nama>`));
    try {
      const tools = await mcpTestServer(nama);
      return m.reply(claraWrap("mcp", [
        `✅ Server "${nama}" konek & responsif.`,
        `${tools.length} tool: ${tools.map((t) => t.name).join(", ").slice(0, 300) || "(kosong)"}`,
      ]));
    } catch (e) {
      return m.reply(claraWrap("mcp", `❌ Gagal konek: ${e.message}`, "error"));
    }
  }

  // ── call manual ──
  if (sub === "call") {
    const nama = String(args[1] || "").toLowerCase();
    const tool = String(args[2] || "");
    const jsonRaw = (args.slice(3) || []).join(" ");
    if (!nama || !tool) return m.reply(claraWrap("mcp", [
      `Format: ${m.prefix}mcp call <nama> <tool> '{json args}'`,
      "",
      `Contoh: ${m.prefix}mcp call waktu get_current_time '{"timezone":"Asia/Jakarta"}'`,
    ]));
    let callArgs = {};
    if (jsonRaw) {
      try { callArgs = JSON.parse(jsonRaw); }
      catch { return m.reply(claraWrap("mcp", "JSON args-nya gak valid", "error")); }
    }
    try {
      const out = await mcpCallTool(nama, tool, callArgs);
      return m.reply(claraWrap(`hasil ${nama}.${tool}`, [String(out).slice(0, 3000)]));
    } catch (e) {
      return m.reply(claraWrap("mcp", `Gagal: ${e.message}`, "error"));
    }
  }

  return m.reply(claraWrap("mcp", [
    `Subcommand: list / add / adds / remove / tools / test / call`,
    "",
    `Usage: ${pluginConfig.usage}`,
  ]));
}

export { pluginConfig as config, handler };
