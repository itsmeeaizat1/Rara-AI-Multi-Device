// E2E TOOLBOX AGENT (request owner 12 Sep 2026: "jadi tool, skills dan mcp
// banyak yg dipasang lengkap agent sebagai tool tambahan atau kebutuhan yang
// dibutuhkan agent"):
//   * SKILLS registry (14 skill) — offline + http-mock
//   * MCP client — protokol ASLI: stdio server spawn + HTTP server live
//   * merge TOOLS + SKILLS + MCP ke prompt & executor .novaagent
//   * .mcp command: add/remove/tools/call
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { initDatabase } from "../../src/lib/nova-database.js"
import { setSkillsHttp, resetSkillsHttp, getAllSkills, registerSkill } from "../../src/lib/nova-skills.js"
import { setPreviewHttp, resetWebSearchDeps } from "../../src/lib/nova-websearch.js"
import { TOOLS, localParse, buildThinkSystemPrompt, getAgentTools } from "../../src/lib/aiagent.js"
import {
  setMcpRpc, resetMcpRpc, getMcpServers, mcpAddServer, mcpRemoveServer,
  mcpTestServer, mcpCallTool, getMcpTools, mcpFqName, getMcpToolEntries, parseMcpFq,
} from "../../src/lib/nova-mcp.js"

const DB = "/tmp/novaagent-toolbox-e2e-db.json"
fs.rmSync(DB, { recursive: true, force: true })
await initDatabase(DB)
let pass = 0, fail = 0
const w = (s) => process.stdout.write(s + "\n")
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); ok ? pass++ : fail++; }
const sent = []
const conn = { sendMessage: async (chat, msg) => { sent.push(msg); return { key: {} }; } }
const mockM = { chat: "pc@test", sender: "x@test" }
const lastText = () => {
  const m = sent.at(-1)
  if (!m) return ""
  if (m.text) return m.text
  if (m.image) return "[IMAGE " + (Buffer.isBuffer(m.image) ? m.image.length : 0) + "B]"
  if (m.document) return "[DOC " + m.fileName + "]"
  return JSON.stringify(m)
}

// ═══ 1. SKILLS offline ═══
w("\n— skills offline —")
const S = getAllSkills()
t("1a. 14 skill ke-register", Object.keys(S).length >= 14, Object.keys(S).join(","));
await S.calc.run(conn, mockM, { expr: "25*4+10" });
t("1b. calc 25*4+10 = 110", lastText().includes("110"), lastText());
await S.calc.run(conn, mockM, { expr: "2^10" });
t("1c. calc 2^10 = 1.024 (pangkat)", lastText().includes("1.024"), lastText());
let eCalc = ""; try { await S.calc.run(conn, mockM, { expr: "alert(1)" }); } catch (e) { eCalc = e.message; }
t("1d. calc tolak ekspresi bukan matematika (whitelist)", /matematika/i.test(eCalc), eCalc);
await S.base64.run(conn, mockM, { text: "nova bot", mode: "encode" });
t("1e. base64 encode", lastText().includes(Buffer.from("nova bot").toString("base64")), lastText());
const b64 = Buffer.from("rahasia bot").toString("base64");
await S.base64.run(conn, mockM, { text: b64, mode: "decode" });
t("1f. base64 decode roundtrip", lastText().includes("rahasia bot"), lastText());
await S.hash.run(conn, mockM, { text: "abc", algo: "sha256" });
t("1g. hash sha256 'abc' = nilai crypto bener", lastText().includes("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"), lastText());
await S.waktu.run(conn, mockM, { zona: "tokyo" });
t("1h. waktu tokyo → Asia/Tokyo + jam", lastText().includes("Asia/Tokyo") && /Jam/.test(lastText()), lastText());
await S.waktu.run(conn, mockM, { zona: "wib" });
t("1i. waktu alias wib → Asia/Jakarta", lastText().includes("Asia/Jakarta"), lastText());
let eZone = ""; try { await S.waktu.run(conn, mockM, { zona: "kutubbarat" }); } catch (e) { eZone = e.message; }
t("1j. zona gak dikenal → error sopan", /gak dikenal/.test(eZone), eZone);
await S.hitunghari.run(conn, mockM, { tanggal: "25 desember 2026" });
t("1k. hitunghari 25 des 2026 → jumlah hari", /hari/.test(lastText()) && /25 desember/i.test(lastText().replace(/^[^\d]*/, "")) || /hari lagi|HARI INI|lewat/.test(lastText()), lastText());
let eTgl = ""; try { await S.hitunghari.run(conn, mockM, { tanggal: "besok aja" }); } catch (e) { eTgl = e.message; }
t("1l. tanggal gak kebaca → error", /gak kebaca|format/.test(eTgl), eTgl);
await S.randompick.run(conn, mockM, { list: "nasi goreng, mie ayam, bakso" });
t("1m. randompick milih dari 3 pilihan", /nasi goreng|mie ayam|bakso/.test(lastText()), lastText());
let ePick = ""; try { await S.randompick.run(conn, mockM, { list: "satu-pilihan" }); } catch (e) { ePick = e.message; }
t("1n. randompick <2 pilihan → error", /minimal 2/.test(ePick), ePick);
await S.roll.run(conn, mockM, { min: 1, max: 100 });
t("1o. roll 1-100 dalam range", /^[🎰🎲]/.test(lastText()) && /[1-9]\d?|100/.test(lastText()), lastText());
let eRoll = ""; try { await S.roll.run(conn, mockM, { min: 50, max: 10 }); } catch (e) { eRoll = e.message; }
t("1p. roll min>max auto-swap (gak error)", eRoll === "", eRoll);

// ═══ 2. SKILLS http-mock ═══
w("\n— skills http (mock) —");
setSkillsHttp(async (url) => {
  const u = String(url)
  if (u.includes("translate.googleapis.com")) {
    return { ok: true, status: 200, json: async () => [[["Halo dunia", "Hello world", null, null, 1]], null, "en", null, null, null, 1] }
  }
  if (u.includes("open.er-api.com")) {
    return { ok: true, status: 200, json: async () => ({ result: "success", rates: { IDR: 15750, JPY: 149.5 } }) }
  }
  if (u.includes("qrserver.com")) return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }
  if (u.includes("is.gd")) return { ok: true, status: 200, json: async () => ({ shorturl: "https://is.gd/abc123" }) }
  if (u.includes("wikipedia.org") && u.includes("rest_v1")) return { ok: true, status: 200, json: async () => ({ title: "Soekarno", extract: "Soekarno adalah presiden pertama Indonesia.", content_urls: { desktop: { page: "https://id.wikipedia.org/wiki/Soekarno" } } }) }
  if (u.includes("geocoding-api")) return { ok: true, status: 200, json: async () => ({ results: [{ name: "Jakarta", country: "Indonesia", latitude: -6.2, longitude: 106.8 }] }) }
  if (u.includes("open-meteo.com/v1/forecast")) return { ok: true, status: 200, json: async () => ({ current: { temperature_2m: 31.5, relative_humidity_2m: 70, weather_code: 2, wind_speed_10m: 12 } }) }
  return { ok: false, status: 404, json: async () => ({}) }
})
await S.translate.run(conn, mockM, { text: "Hello world", to: "id" });
t("2a. translate en→id", lastText().includes("Halo dunia"), lastText());
await S.kurs.run(conn, mockM, { from: "USD", to: "IDR", amount: 100 });
t("2b. kurs 100 USD → IDR pakai rate mock", lastText().includes("1.575.000"), lastText());
await S.qr.run(conn, mockM, { text: "https://bot.com" });
t("2c. qr → kirim gambar buffer", lastText().includes("[IMAGE"), lastText());
await S.shorturl.run(conn, mockM, { url: "https://situs.com/panjang/banget/sekali" });
t("2d. shorturl is.gd", lastText().includes("https://is.gd/abc123"), lastText());
await S.wiki.run(conn, mockM, { topic: "soekarno" });
t("2e. wiki ringkasan + link", lastText().includes("Soekarno") && lastText().includes("wikipedia.org"), lastText());
await S.cuaca.run(conn, mockM, { kota: "jakarta" });
t("2f. cuaca kota (open-meteo mock)", lastText().includes("Jakarta") && lastText().includes("31.5"), lastText());
setPreviewHttp(async () => '<html><head><title>Halaman Tes</title></head><body>Isi halaman web ini panjang sekali dan bisa dibaca.</body></html>');
await S.webread.run(conn, mockM, { url: "https://contoh.com/artikel" });
t("2g. webread baca halaman via fetchPagePreview", lastText().includes("Halaman Tes") && lastText().includes("Isi halaman"), lastText());
resetSkillsHttp();
resetWebSearchDeps();

// ═══ 3. REGISTRY + PROMPT MERGE ═══
w("\n— registry & prompt —");
registerSkill({ name: "customtest", desc: "skill uji", run: async () => {} });
t("3a. registerSkill custom ke-terima", !!getAllSkills().customtest);
const prompt = buildThinkSystemPrompt({ botname: "Nova AI" });
t("3b. prompt ke-list skills (calc, translate, wiki, cuaca)", prompt.includes("KALKULATOR") && prompt.includes("TERJEMAHIN") && prompt.includes("Wikipedia") && prompt.includes("CEK CUACA"));
t("3c. prompt ke-list TOOLS lama (download, createfile) + skill custom", prompt.includes("UNDUH FILE") && prompt.includes("MEMBUAT FILE") && prompt.includes("customtest"));
const promptMcp = buildThinkSystemPrompt({ botname: "Nova AI", mcpTools: [{ name: "mcp.tes.echo", desc: "TOOL MCP [tes] echo" }] });
t("3d. ctx.mcpTools ke-list di prompt", promptMcp.includes("mcp.tes.echo"), "mcpTools gak nempel");

// ═══ 4. MCP — protokol STDIO asli (spawn server) ═══
w("\n— mcp stdio (protokol asli) —");
const srvPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "mcp-stdio-server.mjs")
await mcpAddServer("echo", { type: "stdio", command: process.execPath, args: [srvPath] });
t("4a. server stdio kepasang di config", !!(await getMcpServers()).echo);
const stdioTools = await mcpTestServer("echo");
t("4b. tools/list via stdio → 2 tool (echo, add)", stdioTools.length === 2 && stdioTools.some((x) => x.name === "echo"), JSON.stringify(stdioTools));
const echoOut = await mcpCallTool("echo", "echo", { text: "halo agent" });
t("4c. tools/call via stdio → ECHO:halo agent", echoOut === "ECHO:halo agent", echoOut);
const addOut = await mcpCallTool("echo", "add", { a: 40, b: 2 });
t("4d. tools/call add 40+2 = 42", addOut === "42", addOut);
let eMcp = ""; try { await mcpCallTool("echo", "ngaco", {}); } catch (e) { eMcp = e.message; }
t("4e. tool gak ada → error jelas", /tool gak ada/.test(eMcp), eMcp);
let eSrv = ""; try { await mcpAddServer("bad", { type: "stdio", command: "command-ngaco-tidak-ada" }); await mcpTestServer("bad"); } catch (e) { eSrv = e.message; }
t("4f. server command gak ada → error spawn", /spawn|mati duluan/.test(eSrv), eSrv);
await mcpRemoveServer("bad");

// ═══ 5. MCP — protokol HTTP asli (server http lokal) ═══
w("\n— mcp http (protokol asli) —");
const httpTools = [{ name: "jam", description: "Jam sekarang zona tertentu", inputSchema: {} }]
const httpSrv = http.createServer((req, res) => {
  let body = ""
  req.on("data", (c) => (body += c))
  req.on("end", () => {
    let msg; try { msg = JSON.parse(body) } catch { res.writeHead(400); return res.end() }
    const send = (obj, sse) => {
      res.writeHead(200, { "Content-Type": sse ? "text/event-stream" : "application/json" })
      res.end(sse ? `event: message\ndata: ${JSON.stringify(obj)}\n\n` : JSON.stringify(obj))
    }
    if (msg.method === "initialize") return send({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-03-26", capabilities: {}, serverInfo: { name: "http-mcp", version: "1" } } })
    if (msg.method === "tools/list") return send({ jsonrpc: "2.0", id: msg.id, result: { tools: httpTools } })
    if (msg.method === "tools/call") {
      if (msg.params?.name === "jam") return send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "13:00 WIB" }] } })
      return send({ jsonrpc: "2.0", id: msg.id, result: { isError: true, content: [{ type: "text", text: "tool gak ada" }] } })
    }
    res.writeHead(404); res.end()
  })
})
await new Promise((r) => httpSrv.listen(0, "127.0.0.1", r))
const httpUrl = `http://127.0.0.1:${httpSrv.address().port}/mcp`
await mcpAddServer("jamku", { type: "http", url: httpUrl })
const httpListed = await mcpTestServer("jamku");
t("5a. tools/list via HTTP → tool jam", httpListed.length === 1 && httpListed[0].name === "jam", JSON.stringify(httpListed));
const jamOut = await mcpCallTool("jamku", "jam", {});
t("5b. tools/call via HTTP → 13:00 WIB", jamOut === "13:00 WIB", jamOut);
// balasan SSE (text/event-stream) — ngetes parser SSE
httpSrv.close()
const sseSrv = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    const msg = JSON.parse(body)
    if (msg.method === "initialize") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-03-26" } })) }
    if (msg.method === "tools/list") { res.writeHead(200, { "Content-Type": "text/event-stream" }); return res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { tools: [{ name: "sse", description: "tool lewat SSE" }] } })}\n\n`) }
    res.writeHead(404); res.end()
  })
})
await new Promise((r) => sseSrv.listen(0, "127.0.0.1", r))
await mcpAddServer("ssesrv", { type: "http", url: `http://127.0.0.1:${sseSrv.address().port}/mcp` })
const sseTools = await mcpTestServer("ssesrv");
t("5c. balasan SSE (text/event-stream) ke-parse → tool sse", sseTools.length === 1 && sseTools[0].name === "sse", JSON.stringify(sseTools));
sseSrv.close()

// ═══ 6. MERGE KE AGENT ═══
w("\n— merge agent —");
const flat = await getMcpTools();
t("6a. getMcpTools flat dari semua server (echo + jamku + ssesrv)", flat.length >= 3 && flat.some((x) => x.server === "echo" && x.tool === "echo") && flat.some((x) => x.server === "jamku" && x.tool === "jam"), JSON.stringify(flat.map((x) => x.server + "." + x.tool)));
t("6b. mcpFqName + parseMcpFq roundtrip", mcpFqName("echo", "echo") === "mcp.echo.echo" && parseMcpFq("mcp.echo.echo")?.server === "echo");
const entries = await getMcpToolEntries();
t("6c. entry MCP bentuk TOOLS (run function + desc)", typeof entries["mcp.echo.echo"]?.run === "function" && entries["mcp.echo.echo"]?.desc?.includes("echo"));
sent.length = 0
await entries["mcp.echo.echo"].run(conn, mockM, { args: { text: "dari agent" } });
t("6d. run entry MCP → panggil tool asli + kirim hasil ke chat", lastText() === "ECHO:dari agent", lastText());
const REG = await getAgentTools();
t("6e. getAgentTools = TOOLS + SKILLS + MCP semua ada", !!REG.calc && !!REG.translate && !!REG.download && !!REG.createfile && !!REG["mcp.echo.echo"], Object.keys(REG).filter((k) => k.startsWith("mcp.")).join(","));
// prompt via think() — mcpTools auto-preload (panggil buildThinkSystemPrompt dgn ctx dari think)
const prompt2 = buildThinkSystemPrompt({ botname: "Nova AI", mcpTools: Object.entries(entries).map(([name, v]) => ({ name, desc: v.desc })) });
t("6f. prompt final ke-list tool MCP", prompt2.includes("mcp.echo.echo") && prompt2.includes("mcp.jamku.jam"));

// ═══ 7. localParse calc instan ═══
w("\n— localParse calc —");
t("7a. '25*4+10' → calc instan", localParse("25*4+10")?.tool === "calc");
t("7b. '5+5' → calc", localParse("5+5")?.tool === "calc");
t("7c. '+62 812-345-678' (nomor telepon) → BUKAN calc", localParse("+62 812-345-678") === null, JSON.stringify(localParse("+62 812-345-678")));
t("7d. 'halo apa kabar' → null (tetap ke AI)", localParse("halo apa kabar") === null);
t("7e. 'tutup grup' tetep closegc (regresi)", localParse("tutup grup")?.tool === "closegc");

// ═══ 8. cleanup config ═══
await mcpRemoveServer("echo"); await mcpRemoveServer("jamku"); await mcpRemoveServer("ssesrv")
t("8a. semua server ke-remove, config bersih", Object.keys(await getMcpServers()).length === 0)
resetMcpRpc()

// ═══ 9. PRESET — server MCP publik curated ═══
w("\n— preset server mcp —")
const { fromSC } = await import("../../src/lib/styler.js")
const norm = (s) => fromSC(String(s)).toLowerCase()
const { pluginConfig, handler } = await import("../../plugins/ai/mcp.js")
const mp = { chat: "pc@t", prefix: ".", reply: (x) => { sent2.push(String(x)); return sent2.length }, argsRaw: "" }
const sent2 = []
await handler(mp, { args: ["preset"] })
let plist = sent2.at(-1) || ""
t("9a. .mcp preset nampilin 4 preset + status", ["context7","deepwiki","mslearn","gitmcp"].every((x) => norm(plist).includes(x)), norm(plist).slice(0, 90));
t("9b. status kepasang ⬜/✅ ke-format", plist.includes("⬜") || plist.includes("✅"));
await handler(mp, { args: ["preset", "add", "ngaco"] })
t("9c. preset gak ada → pesan error sopan", norm(sent2.at(-1) || "").includes("gak ada di preset"), norm(sent2.at(-1) || "").slice(0, 80));
await handler(mp, { args: ["preset", "add", "context7"] })
const afterPreset = await getMcpServers()
t("9d. preset add context7 → kepasang di config (url bener)", afterPreset.context7?.url === "https://mcp.context7.com/mcp", JSON.stringify(afterPreset.context7 || {}));
await mcpRemoveServer("context7")
const afterRemove = await getMcpServers()
t("9e. remove bersih lagi", !afterRemove.context7);

w(`\n===== ${pass} PASS, ${fail} FAIL =====`)
process.exit(fail ? 1 : 0)
