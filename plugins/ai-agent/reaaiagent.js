// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Rea AI Agent (.reaaiagent)
 * Fitur: AI AGENT REVERSE ENGINEERING beneran — tools MCP server REA
 *        (github.com/morluto/rea, npm rea-agents, MIT, 144k★) masuk ke
 *        loop tool-call, otak fallback GitHub Models → Groq. Analisis
 *        tanpa source code: aplikasi JS/Electron, binary (layout), file
 *        (apk/asar/zip/wasm), trace fitur + bukti Evidence.
 *
 * MODE (request owner 12 Okt 2026: "no 2" = mode agent penuh):
 *   • .reaaiagent <pertanyaan>              — analisis target default
 *   • .reaaiagent <pertanyaan> (reply file) — target = dokumen WA
 *     (zip diekstrak otomatis, .asar/.apk/.wasm/.exe dll dipakai polos)
 *   • .reaaiagent status  — koneksi MCP server REA + jumlah tools
 *   • .reaaiagent tools   — daftar tools aktif (whitelist kurasi)
 *   • .reaaiagent stop    — matikan sesi MCP (ledger evidence hilang)
 *
 * KEAMANAN: owner-only. Semua tool REA = analisis read-only lokal; file
 * target disimpan di tmp; ekstraksi zip pakai guard zip-slip (path
 * traversal DITOLAK — gerbang QA 4). Pesan non-teks → kartu usage.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import {
  runReaAgent,
  reaStatusCardData,
  reaToolWhitelist,
} from "../../src/lib/rara-reaaiagent.js";
import {
  closeReaMcpSession,
  getReaMcpSession,
} from "../../src/lib/rara-mcp-bridge.js";
import { listNativeProviders } from "../../src/lib/rara-agent-native.js";
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "reaaiagent",
  alias: ["reaaiagent"],
  category: "ai agent",
  description: "AI Agent reverse engineering via MCP REA — analisis app/binary/file tanpa source code, hasil pakai bukti Evidence",
  usage: ".reaaiagent <pertanyaan> (reply file = target)",
  example: ".reaaiagent cara kerja fitur search di aplikasi ini (reply zip app)\n.reaaiagent status\n.reaaiagent tools\n.reaaiagent stop",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

const TARGET_DIR = () => path.join(os.tmpdir(), "rara-rea");
const TARGET_MAX_BYTES = 60 * 1024 * 1024; // 60 MB
const ZIP_SLIP_RE = /(^\/|\.\.[\\/]|[\\/]\.\.($|[\\/])|^[A-Za-z]:)/; // abs / .. traversal / drive

function usageCard(prefix, providers) {
  const provLines = (providers || []).length
    ? providers.map((p) => `▪ ${p.hasKey ? "🟢" : "🔴"} *${p.label}*${p.hasKey ? "" : " — belum di-set"}`).join("\n")
    : "🔴 Belum ada provider yang punya key";
  const lines = [
    `🔎 *REA AI AGENT — REVERSE ENGINEERING*`,
    `Agent reverse engineering beneran via MCP server REA (github.com/morluto/rea).`,
    `Analisis tanpa source code: aplikasi JS/Electron, binary, file (apk/asar/zip/wasm).`,
    `Hasil pakai bukti Evidence + limitasi yang jujur (gak ngarang).`,
    "",
    `*PERINTAH*`,
    `ᯓ \`${prefix}reaaiagent <pertanyaan>\` — analisis (target default = folder bot)`,
    `ᯓ \`${prefix}reaaiagent <pertanyaan>\` + reply file/zip — target = file itu`,
    `ᯓ \`${prefix}reaaiagent status\` — status koneksi MCP REA`,
    `ᯓ \`${prefix}reaaiagent tools\` — daftar tools REA aktif`,
    `ᯓ \`${prefix}reaaiagent stop\` — matikan sesi MCP REA`,
    "",
    `*TARGET YANG DISUKAI*`,
    `▪ Aplikasi JS/Electron: folder atau .zip / .asar`,
    `▪ Binary: .exe / .dll / .so / .apk (native perlu Ghidra di server)`,
    `▪ WebAssembly: .wasm`,
    "",
    `*OTAK (free tier)*`,
    provLines,
    `ᯓ Key: \`${prefix}setkey githubmodels <PAT>\` / \`${prefix}setkey groq <key>\``,
    "",
    `Owner-only — analisis jalan lokal di server bot.`,
  ];
  return raraWrap("Rea Ai Agent", lines);
}

// simpan file target + ekstrak zip (guard zip-slip, QA gerbang 4)
async function saveTarget(quoted) {
  const buffer = await quoted.download();
  if (!buffer || buffer.length < 16) throw new Error("file kosong / gagal didownload");
  if (buffer.length > TARGET_MAX_BYTES) throw new Error(`file kegedean (${(buffer.length / 1048576).toFixed(1)} MB, maks 60 MB)`);
  const fileName = String(quoted.msg?.fileName || quoted.fileName || "target.bin").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "target.bin";
  fs.mkdirSync(TARGET_DIR(), { recursive: true });
  const stamp = Date.now().toString(36);
  const base = path.join(TARGET_DIR(), `${stamp}-${fileName}`);

  // zip → ekstrak ke folder (target REA paling enak = directory)
  if (/\.zip$/i.test(fileName)) {
    const zip = new AdmZip(buffer);
    const outDir = base + "-x";
    fs.mkdirSync(outDir, { recursive: true });
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const name = String(entry.entryName || "");
      if (ZIP_SLIP_RE.test(name)) continue; // tolak path jahat — skip senyap
      const dest = path.join(outDir, name);
      if (!path.resolve(dest).startsWith(path.resolve(outDir) + path.sep)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, entry.getData());
    }
    return { path: outDir, kind: "folder (hasil ekstrak zip)", note: `asal: ${fileName}` };
  }
  fs.writeFileSync(base, buffer);
  const kinds = {
    ".asar": "asar archive (aplikasi Electron)",
    ".apk": "apk Android (inventory + native via engine kalau ada)",
    ".wasm": "wasm binary",
    ".exe": "binary Windows",
    ".dll": "binary Windows (DLL)",
    ".so": "binary Linux (shared object)",
  };
  const kind = kinds[path.extname(fileName).toLowerCase()] || `file ${path.extname(fileName) || "(tanpa ekstensi)"}`;
  return { path: base, kind, note: `asal: ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)` };
}

async function handler(m, { sock, config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  try {
    const args = m.args || [];
    const text = String(m.text || "").trim();
    const task = (args || []).join(" ").trim();
    const sub = (args[0] || "").toLowerCase();

    // ── subcommand tanpa agent ──
    if (sub === "status") {
      await m.react?.("📡");
      const st = await reaStatusCardData();
      if (!st.connected) {
        return m.reply(raraError("Rea Ai Agent", `MCP server REA gak nyambung: ${st.error || "?"}\n\nCek rea-agents terpasang di server (\`npm i -g rea-agents\`) lalu \`${prefix}reaaiagent status\` ulang.`));
      }
      const lines = [
        `📡 *STATUS MCP REA*`,
        "",
        `▪ Server: *${st.serverInfo?.name || "?"}* ${st.serverInfo?.version ? `v${st.serverInfo.version}` : ""}`,
        `▪ Protokol: \`${st.protocolVersion || "?"}\``,
        `▪ Command: \`${String(st.command || "").slice(0, 60)}\``,
        `▪ Tools total: *${st.totalTools ?? "?"}* — aktif (whitelist): *${st.activeTools ?? "?"}*`,
        `▪ Otak agent: ${(listNativeProviders().map((p) => p.label).join(" → ") || "BELUM ADA KEY")}`,
        "",
        st.lastError ? `⚠️ Catatan: ${String(st.lastError).slice(0, 160)}` : `Sesi hidup — evidence ledger aktif antar command.`,
      ];
      return m.reply(raraWrap("Rea Ai Agent", lines));
    }

    if (sub === "tools") {
      const st = await reaStatusCardData();
      if (!st.connected) {
        return m.reply(raraError("Rea Ai Agent", `MCP REA gak nyambung: ${st.error || "?"}`));
      }
      const sess = getReaMcpSession();
      const tools = await sess.listTools({});
      const allowSet = new Set(reaToolWhitelist());
      const aktif = tools.filter((t) => allowSet.has(t.name));
      const lines = [
        `🧰 *TOOLS REA AKTIF (${aktif.length})*`,
        "",
        ...aktif.map((t) => `▪ \`${t.name}\` — ${String(t.description).split("\n")[0].slice(0, 90)}`),
        "",
        `Total katalog REA: ${tools.length} tools (sisanya gak di-whitelist biar hemat konteks). Override: env REAAIAGENT_TOOLS.`,
      ];
      return m.reply(raraWrap("Rea Ai Agent", lines));
    }

    if (sub === "stop") {
      const closed = await closeReaMcpSession();
      return m.reply(raraWrap("Rea Ai Agent", closed
        ? `🔌 *SESI MCP REA DITUTUP*\n\nServer dimatikan — ledger Evidence sesi ini hilang (evidence gak bisa dirujuk lagi). Sesi baru nyala otomatis di command berikutnya.`
        : `ℹ️ Sesi MCP REA memang gak lagi jalan.`));
    }

    // tanpa tugas → kartu usage (gerbang 4: non-teks/kosong nyasar sini)
    if (!task) {
      await m.react?.("❓");
      return m.reply(usageCard(prefix, listNativeProviders()));
    }

    // cek key otak dulu biar error-nya jelas
    if (!listNativeProviders().length) {
      await m.react?.("🔌");
      return m.reply(raraWrap("Rea Ai Agent", [
        `🔌 *BELUM ADA OTAK AGENT*`,
        "",
        `REA butuh key LLM salah satu (gratis):`,
        `ᯓ \`${prefix}setkey githubmodels <PAT GitHub>\` — 150 req/hari`,
        `ᯓ \`${prefix}setkey groq <key>\` — free tier permanen`,
      ].join("\n")));
    }

    await m.react?.("⏳");

    // target: reply file → simpan + ekstrak
    let target = null;
    const quoted = m.quoted;
    if (quoted && (quoted.type === "documentMessage" || quoted.isDocument)) {
      try {
        target = await saveTarget(quoted);
      } catch (e) {
        await m.react?.("❌");
        return m.reply(raraError("Rea Ai Agent", `Target gagal disimpan: ${e?.message || "?"}`));
      }
    }

    const fullTask = target
      ? `${task}\n\n(TARGET di-attach di system prompt — mulai dari producer yang cocok untuk jenis target itu.)`
      : task;

    const result = await runReaAgent({ task: fullTask, target });

    if (!result.ok) {
      await m.react?.("❌");
      if (result.error === "mcp-unavailable") {
        return m.reply(raraError("Rea Ai Agent", `MCP server REA gak bisa nyala: ${result.detail || "?"}\n\nPastikan \`npm i -g rea-agents\` udah dijalanin di server + Node >= 22.19.`));
      }
      if (result.error === "no-provider") {
        return m.reply(usageCard(prefix, listNativeProviders()));
      }
      if (result.error === "all-providers-failed") {
        return m.reply(raraError("Rea Ai Agent", `Semua provider gagal: ${result.detail || result.error}`));
      }
      return m.reply(raraError("Rea Ai Agent", `Agent gagal: ${result.error || "tidak diketahui"}`));
    }

    await m.react?.("✅");

    const icon = (s) => (s.ok ? "✅" : "❌");
    const stepLines = (result.steps || [])
      .map((s) => `▪ ${icon(s)} *${s.tool}*${s.note ? " — " + s.note : ""}`)
      .join("\n");
    const lines = [
      `🔎 *HASIL REVERSE ENGINEERING*`,
      "",
      String(result.answer || "").slice(0, 3500),
    ];
    if (target) {
      lines.push("", `▪ Target: ${target.kind}`);
    }
    if (stepLines) {
      lines.push("", `*JEJAK ANALISIS (${(result.steps || []).length})*`, stepLines);
    }
    lines.push(
      "",
      `▪ Otak: *${result.provider || "?"}* (${result.model || "?"})${result.maxed ? " — batas langkah" : ""}`,
      `▪ Waktu: ${result.elapsedMs ? Math.round(result.elapsedMs / 100) / 10 : "?"} dtk`,
      "",
      `Lanjut tanya: \`${prefix}reaaiagent <pertanyaan>\` (evidence sesi masih tersimpan)`,
      `Matikan sesi: \`${prefix}reaaiagent stop\``
    );
    return m.reply(raraWrap("Rea Ai Agent", lines));
  } catch (e) {
    await m.react?.("❌").catch?.(() => {});
    return m.reply(raraError("Rea Ai Agent", e?.message || "error gak diketahui"));
  }
}

export default { config: pluginConfig, handler };
export { pluginConfig as config, handler };
