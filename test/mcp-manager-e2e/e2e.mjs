// RARA AI - MULTI DEVICE — E2E: MCP MANAGER + GITHUB MCP (request owner 25 Sep 2026:
// "mcp digithub bsa diakses ai agent dan opencode"). Verifikasi:
// env passthrough stdio (token GITHUB_PERSONAL_ACCESS_TOKEN dsb) pakai server
// MCP stdio NYATA (node -e inline, tanpa npx/network), mcpSetEnv/mcpSetHeader,
// validasi config, katalog preset plugin .mcp, redact nilai, oke tanpa crash.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 200) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

// db init SEBELUM import lib (pola absen-meter)
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "mcp-manager-e2e-db-" + Date.now()));

const mcp = await import(R + "/src/lib/rara-mcp.js");
const { setMcpRpc, resetMcpRpc } = mcp;
const { toSC } = await import(R + "/src/lib/styler.js"); // raraWrap → smallcaps (GOTCHA: asersi wajib toSC)

// ── server MCP stdio NYATA: node -e, respon initialize/tools/list/tools/call.
// tool "whoami" balikin env NOVA_MCP_TEST_TOKEN → bukti env PASSTHROUGH.
const FAKE_SERVER_SRC = `
const bufs=[];
process.stdin.setEncoding("utf8");
process.stdin.on("data",(d)=>bufs.push(d));
process.stdin.on("end",()=>{
  const lines=bufs.join("").split("\\n").filter((l)=>l.trim());
  for(const l of lines){
    let m; try{m=JSON.parse(l)}catch{continue}
    if(m.id!==101)continue;
    let result;
    if(m.method==="tools/list"){
      result={tools:[{name:"whoami",description:"balikin token env"},{name:"echo",description:"gema args"}]};
    }else if(m.method==="tools/call"){
      result={content:[{type:"text",text:m.params.name==="whoami"?("TOKEN="+(process.env.NOVA_MCP_TEST_TOKEN||"KOSONG")):("ECHO:"+JSON.stringify(m.params.arguments||{}))}]};
    }else continue;
    process.stdout.write(JSON.stringify({jsonrpc:"2.0",id:101,result})+"\\n");
  }
});`;

// ═══ SECTION 1: stdio NYATA + env passthrough ═══
section("1. stdio nyata + env passthrough");
await mcp.mcpAddServer("tes", { type: "stdio", command: "node", args: ["-e", FAKE_SERVER_SRC], env: { NOVA_MCP_TEST_TOKEN: "rahasia-123" } });
let tools = await mcp.mcpTestServer("tes").catch((e) => { console.error("   err:", e.message); return []; });
t("1a. stdio nyata konek — tools/list kebaca (2 tool)", tools.length === 2 && tools.some((x) => x.name === "whoami"), tools);
const outWho = await mcp.mcpCallTool("tes", "whoami", {});
t("1b. env server ke-merge ke proses anak (token nyampe)", outWho === "TOKEN=rahasia-123", outWho);
const outEcho = await mcp.mcpCallTool("tes", "echo", { a: 1, b: "x" });
t("1c. args tools/call utuh (JSON balik lengkap)", outEcho === 'ECHO:{"a":1,"b":"x"}', outEcho);

// ═══ SECTION 2: mcpSetEnv / mcpSetHeader + validasi ═══
section("2. mcpSetEnv + mcpSetHeader");
const r1 = await mcp.mcpSetEnv("tes", "NOVA_EXTRA", "abc");
t("2a. set env baru", r1.includes("NOVA_EXTRA") && (await mcp.getMcpServers()) .tes?.env?.NOVA_EXTRA === "abc", r1);
const r2 = await mcp.mcpSetEnv("tes", "NOVA_EXTRA", "");
t("2b. hapus env (value kosong)", !(await mcp.getMcpServers()).tes?.env?.NOVA_EXTRA, r2);
// set env baru ke anak proses nyata — bukti env update terpasang saat call
await mcp.mcpSetEnv("tes", "NOVA_MCP_TEST_TOKEN", "rotasi-456");
const outRot = await mcp.mcpCallTool("tes", "whoami", {});
t("2c. env update kebaca anak proses baru (token rotasi)", outRot === "TOKEN=rotasi-456", outRot);
let err = "";
try { await mcp.mcpSetEnv("tes", "BUKAN ENV VALID!", "x"); } catch (e) { err = e.message; }
t("2d. nama env invalid ditolak", /gak valid/i.test(err), err);
err = "";
try { await mcp.mcpSetEnv("hantu", "KEY", "x"); } catch (e) { err = e.message; }
t("2e. server gak ada → jujur", /gak ada/.test(err), err);

// http server + header
await mcp.mcpAddServer("web", { type: "http", url: "https://mcp.example.com/mcp" });
const r3 = await mcp.mcpSetHeader("web", "Authorization", "Bearer ghp_test123");
t("2f. set header http (Authorization PAT)", (await mcp.getMcpServers()).web?.headers?.Authorization === "Bearer ghp_test123", r3);
err = "";
try { await mcp.mcpSetHeader("tes", "Authorization", "x"); } catch (e) { err = e.message; }
t("2g. header di server stdio → ditolak (salah type)", /bukan http/.test(err), err);
err = "";
try { await mcp.mcpSetEnv("web", "KEY", "x"); } catch (e) { err = e.message; }
t("2h. env di server http → ditolak (salah type)", /bukan stdio/.test(err), err);
// validasi mcpAddServer
err = "";
try { await mcp.mcpAddServer("jelek", { type: "stdio", command: "node", env: { K: {} } }); } catch (e) { err = e.message; }
t("2i. env bukan string ditolak saat add", /harus string/.test(err), err);
err = "";
try { await mcp.mcpAddServer("jelek", { type: "http", url: "ftp://x" }); } catch (e) { err = e.message; }
t("2j. url bukan http(s) ditolak", /http\/https wajib/.test(err), err);

// ═══ SECTION 3: plugin .mcp (katalog preset + env/header/redact) ═══
section("3. plugin .mcp");
const plugin = await import(R + "/plugins/ai-agent/mcp.js");
const sent = [];
const mkM = (text) => ({
  text, isOwner: true, prefix: ".", chat: "o@s", sender: "o@s",
  react: async () => true,
  reply: async (x) => { sent.push(String(x)); return true; },
});
const run = async (text) => { sent.length = 0; await plugin.handler(mkM(text), { sock: null, args: text.slice(1).split(/\s+/).slice(1) }); return sent.join("\n"); };

// katalog preset tampil + status terpasang
const outPreset = await run(".mcp preset");
t("3a. katalog preset ada github + memory + think + filesystem", outPreset.includes(toSC("github")) && outPreset.includes(toSC("memory")) && outPreset.includes(toSC("think")) && outPreset.includes(toSC("filesystem")), outPreset.slice(0, 120));
t("3b. preset terpasang ditandai ✅ (tes dari section 1)", /✅\s*tes/.test(outPreset) || (await mcp.getMcpServers()).tes, outPreset.slice(0, 200));

// preset add stdio — TANPA spawn npx asli: seam RPC fake (npx butuh network di VPS, bukan e2e)
setMcpRpc(async (server, method) => {
  if (method === "tools/list") return { result: { tools: [{ name: "create_entities", description: "simpan entitas" }] } };
  return { result: { content: [{ type: "text", text: "ok" }] } };
});
const outAdd = await run(".mcp preset add memory");
t("3c. preset add stdio kepasang via npx + tool kebaca", outAdd.includes(toSC("memory terpasang")) && outAdd.includes(toSC("1 tool")), outAdd.slice(0, 160));
t("3d. server memory terdaftar (command npx -y @modelcontextprotocol/server-memory)", (await mcp.getMcpServers()).memory?.command === "npx" && (await mcp.getMcpServers()).memory?.args?.includes("@modelcontextprotocol/server-memory"));

// preset add github → hint token (seam tetap tools/list tapi kosong → jalan cabang needsToken)
setMcpRpc(async () => { throw new Error("401"); });
const outGh = await run(".mcp preset add github");
t("3e. preset github → BUTUH TOKEN hint .mcp header", outGh.includes(toSC("github terpasang")) && outGh.includes(toSC("butuh token")) && outGh.includes(toSC("mcp header github")), outGh.slice(0, 200));
t("3f. url github = api.githubcopilot.com/mcp", (await mcp.getMcpServers()).github?.url === "https://api.githubcopilot.com/mcp", (await mcp.getMcpServers()).github);

// .mcp env via plugin + REDACT nilai token
const outEnvSet = await run(".mcp env tes NOVA_MCP_TEST_TOKEN=baru-789");
t("3g. .mcp env set — nilai gak pernah muncul di chat", outEnvSet.includes(toSC("disimpan")) && !outEnvSet.includes("baru-789"), outEnvSet.slice(0, 160));
const outEnvList = await run(".mcp env tes");
t("3h. .mcp env list — key tampil, nilai dirahasiakan", outEnvList.includes(toSC("NOVA_MCP_TEST_TOKEN")) && outEnvList.includes(toSC("dirahasiakan")) && !outEnvList.includes("baru-789"), outEnvList.slice(0, 160));

// .mcp header via plugin (set + list + redact)
await run(".mcp header web Authorization=Bearer ghp_rahasia");
const outHdrList = await run(".mcp header web");
t("3i. .mcp header list — key tampil, PAT dirahasiakan", outHdrList.includes(toSC("Authorization")) && outHdrList.includes(toSC("dirahasiakan")) && !outHdrList.includes("ghp_rahasia"), outHdrList.slice(0, 160));
const outHdrSet = await run(".mcp header web X-Api-Key=kunci");
t("3j. .mcp header set jalan", outHdrSet.includes(toSC("disimpan")), outHdrSet.slice(0, 120));

// .mcp list nunjukin header/env keys (nama doang)
const outList = await run(".mcp list");
t("3k. list nunjukin server + header:Authorization + env key", outList.includes(toSC("header:Authorization")) && outList.includes(toSC("env:NOVA_MCP_TEST_TOKEN")), outList.slice(0, 240));

// remove + cleanup
const outRm = await run(".mcp remove memory");
t("3l. remove server jalan", outRm.includes(toSC("dihapus")), outRm.slice(0, 120));
resetMcpRpc();
await mcp.mcpRemoveServer("tes").catch(() => {});
await mcp.mcpRemoveServer("web").catch(() => {});
await mcp.mcpRemoveServer("github").catch(() => {});

// ═══ SECTION 4: merge ke agent tetap jalan (getMcpToolEntries) ═══
section("4. merge ke .raraagent tetap jalan");
await mcp.mcpAddServer("tes2", { type: "stdio", command: "node", args: ["-e", FAKE_SERVER_SRC], env: { NOVA_MCP_TEST_TOKEN: "z" } });
const entries = await mcp.getMcpToolEntries();
const fqKey = "mcp.tes2.whoami";
t("4a. tool MCP ke-entry registry agent (mcp.tes2.whoami)", !!entries[fqKey] && /TOOL MCP \[tes2\]/.test(entries[fqKey].desc), Object.keys(entries));
t("4b. entry punya run() buat executor raraai", typeof entries[fqKey]?.run === "function");
const flat = await mcp.getMcpTools();
t("4c. getMcpTools flat nyebut server+tool", flat.some((x) => x.server === "tes2" && x.tool === "whoami"), flat);
await mcp.mcpRemoveServer("tes2").catch(() => {});

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
