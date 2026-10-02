// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e integrasi: registry + powers di semua jalur agent (aisuperagent/anovaagent,
// raraagent, automation) — termasuk pengaman lintas-pengguna & allowlist automation
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildExecutors, buildAutomationExecutors, AUTOMATION_TOOLS } from "../../plugins/ai-agent/agent.js";
import { runAgent, renderPlanPrompt, getToolList } from "../../src/lib/rara-agent.js";
import { getAgentTools, buildThinkSystemPrompt, TOOL_TOPIC, TOOL_NATURAL_DOING } from "../../src/lib/aiagent.js";
import * as P from "../../src/lib/rara-agent-powers.js";
import * as R from "../../src/lib/rara-agent-registry.js";

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const mkUser = (chat, isOwner = false) => {
  const sent = [];
  return { sent, m: { chat, sender: chat, isOwner, isGroup: false, prefix: ".", key: {} }, sock: { sendMessage: async (jid, c) => { sent.push({ jid, c }); } } };
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "integ-"));
P._setRootForTest(tmp);
fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
fs.writeFileSync(path.join(tmp, "src/app.js"), "export const versi = 1;\n");
fs.writeFileSync(path.join(tmp, ".env"), "RAHASIA=1");
P._setScreenshotForTest(async (url) => ({ title: "Judul " + url, description: "d", text: "isi halaman " + url, screenshot: Buffer.alloc(5000, 3) }));

console.log("[1] semua jalur melihat tool baru");
{
  const NEW = ["browse", "screenshot", "listfiles", "readfile", "editfile", "writefile"];
  const ex = buildExecutors(mkUser("a@g.us", true).m, mkUser("a@g.us").sock, {}, null, {}, null);
  ok(NEW.every((k) => typeof ex[k] === "function"), "aisuperagent/anovaagent: 6 tool baru ada");
  const tl = getToolList();
  ok(NEW.every((k) => tl.includes(k)), "runAgent: daftar tool memuat 6 tool baru");
  const plan = renderPlanPrompt();
  ok(NEW.every((k) => plan.includes(k + " (")), "prompt planner memuat deskripsi tool baru");
  ok(!/\{\{TOOL_/.test(plan), "tidak ada placeholder mentah tersisa di prompt");
  const ra = await getAgentTools();
  ok(NEW.every((k) => typeof ra[k]?.run === "function"), "raraagent: 6 tool baru ada");
  ok(ra.closegc && ra.kick, "raraagent: tool aksi grup lama tetap ada");
  const think = buildThinkSystemPrompt({ botname: "Rara" });
  ok(NEW.every((k) => think.includes("- " + k + ":")), "raraagent think(): model melihat tool baru");
  ok(TOOL_TOPIC.screenshot !== undefined || TOOL_NATURAL_DOING.screenshot === "ngambil screenshot", "status natural tool baru");
}

console.log("[2] browse SELALU menyertakan screenshot");
{
  const u = mkUser("b@g.us", false);
  const ex = buildExecutors(u.m, u.sock, {}, null, {}, null);
  const r = await ex.browse({ tool: "browse", url: "https://contoh.com/a" });
  ok(r.ok && u.sent.length === 1 && Buffer.isBuffer(u.sent[0].c.image), "browse mengirim gambar screenshot");
  ok(/Judul https:\/\/contoh\.com\/a/.test(u.sent[0].c.caption), "caption memuat judul halaman");
  ok(/isi halaman/.test(r.evidence || ""), "evidence teks tetap ada untuk jawaban");
  const r2 = await ex.browse({ tool: "browse", url: "http://localhost:3000/admin" });
  ok(r2.ok === false, "browse menolak alamat lokal (SSRF)");
  ok(u.sent.length === 1, "tidak ada screenshot terkirim untuk URL ditolak");
  const r3 = await ex.screenshot({ tool: "screenshot", url: "https://contoh.com/x", full: true });
  ok(r3.ok && u.sent.length === 2, "tool screenshot terpisah bekerja");
}

console.log("[3] tool file: owner-only di level kode");
{
  const user = mkUser("c@g.us", false), owner = mkUser("d@g.us", true);
  const exU = buildExecutors(user.m, user.sock, {}, null, {}, null);
  const exO = buildExecutors(owner.m, owner.sock, {}, null, {}, null);
  for (const [tool, args] of [["readfile", { path: "src/app.js" }], ["listfiles", {}], ["editfile", { path: "src/app.js", find: "1", replace: "2" }], ["writefile", { path: "x.js", content: "export const a=1;" }]]) {
    const r = await exU[tool]({ tool, ...args });
    ok(r.ok === false && /owner/i.test(r.msg), `non-owner ditolak: ${tool}`);
  }
  ok(fs.readFileSync(path.join(tmp, "src/app.js"), "utf8") === "export const versi = 1;\n", "file tak berubah setelah percobaan non-owner");
  const rd = await exO.readfile({ tool: "readfile", path: "src/app.js" });
  ok(rd.ok && /versi = 1/.test(rd.evidence), "owner: readfile");
  const ed = await exO.editfile({ tool: "editfile", path: "src/app.js", find: "versi = 1", replace: "versi = 2" });
  ok(ed.ok && /versi = 2/.test(fs.readFileSync(path.join(tmp, "src/app.js"), "utf8")), "owner: editfile");
  const bad = await exO.editfile({ tool: "editfile", path: "src/app.js", find: "versi = 2;", replace: "versi = {{{;" });
  ok(bad.ok === false && /syntax/.test(bad.msg) && /versi = 2/.test(fs.readFileSync(path.join(tmp, "src/app.js"), "utf8")), "owner: edit merusak syntax → ditolak + rollback");
  const env = await exO.readfile({ tool: "readfile", path: ".env" });
  ok(env.ok === false && /diproteksi/.test(env.msg), "owner pun tak bisa baca .env");
  const wf = await exO.writefile({ tool: "writefile", path: "src/baru.js", content: "export const b = 1;\n" });
  ok(wf.ok && fs.existsSync(path.join(tmp, "src/baru.js")), "owner: writefile");
  const ls = await exO.listfiles({ tool: "listfiles", path: "src" });
  ok(ls.ok && /app\.js/.test(ls.evidence) && /baru\.js/.test(ls.evidence), "owner: listfiles");
}

console.log("[4] BUG LINTAS-PENGGUNA: hasil tiap chat ke chat-nya sendiri");
{
  globalThis.fetch = async () => new Response(new Uint8Array(3000), { status: 200, headers: { "content-type": "application/zip", "content-length": "3000" } });
  const A = mkUser("chatA@g.us"), B = mkUser("chatB@g.us");
  const exA = buildExecutors(A.m, A.sock, {}, null, {}, null);
  const exB = buildExecutors(B.m, B.sock, {}, null, {}, null);
  await exA.download({ tool: "download", url: "https://x.com/a.zip" });
  await exB.download({ tool: "download", url: "https://x.com/b.zip" });
  ok(A.sent.length === 1 && A.sent[0].jid === "chatA@g.us", "tool lama: chat A menerima miliknya");
  ok(B.sent.length === 1 && B.sent[0].jid === "chatB@g.us", "tool lama: chat B menerima miliknya (tidak bocor ke A)");
  const A2 = mkUser("chatA2@g.us"), B2 = mkUser("chatB2@g.us");
  const e1 = buildExecutors(A2.m, A2.sock, {}, null, {}, null), e2 = buildExecutors(B2.m, B2.sock, {}, null, {}, null);
  await e1.browse({ tool: "browse", url: "https://contoh.com/1" });
  await e2.browse({ tool: "browse", url: "https://contoh.com/2" });
  ok(A2.sent.length === 1 && B2.sent.length === 1 && A2.sent[0].jid === "chatA2@g.us", "tool baru: screenshot ke chat masing-masing");
}

console.log("[5] AUTOMATION: allowlist aman");
{
  const sock = mkUser("x").sock;
  const sent = []; sock.sendMessage = async (jid, c) => { sent.push({ jid, c }); };
  const ex = buildAutomationExecutors(sock, "6281@s.whatsapp.net", null, null);
  const names = Object.keys(ex);
  ok(names.every((n) => AUTOMATION_TOOLS.includes(n)), "hanya tool allowlist yang ada: " + names.join(","));
  for (const bad of ["editfile", "writefile", "create", "command", "download", "code", "createfile", "image", "editimage"]) {
    ok(!(bad in ex), `TIDAK ada di automation: ${bad}`);
  }
  ok("browse" in ex && "screenshot" in ex && "readfile" in ex, "tool aman tersedia (browse/screenshot/readfile)");
  const r = await ex.browse({ tool: "browse", url: "https://contoh.com/auto" });
  ok(r.ok && sent[0]?.jid === "6281@s.whatsapp.net" && Buffer.isBuffer(sent[0].c.image), "screenshot automation → DM owner");
  const rf = await ex.readfile({ tool: "readfile", path: "src/app.js" });
  ok(rf.ok, "automation boleh baca file");
  ok(Object.keys(buildAutomationExecutors(null, "6281@s.whatsapp.net")).length === 0, "tanpa sock → kosong (aman)");
  ok(Object.keys(buildAutomationExecutors(sock, "")).length === 0, "tanpa owner → kosong (aman)");
}

console.log("[6] runAgent end-to-end dengan tool registry");
{
  const u = mkUser("e@g.us", true);
  const ex = buildExecutors(u.m, u.sock, {}, null, {}, null);
  let n = 0;
  const ai = async (p) => {
    n++;
    if (p.includes("BUKTI")) return "RINGKASAN AKHIR";
    return JSON.stringify({ mode: "tools", tools: [
      { tool: "browse", url: "https://contoh.com/berita", liar: "dibuang" },
      { tool: "readfile", path: "src/app.js" },
      { tool: "tidakada", x: 1 },
    ] });
  };
  const res = await runAgent("buka berita lalu baca app.js", { ai, execTools: ex });
  ok(res.mode === "tools", "mode tools");
  ok(res.results.length === 2, "tool tak dikenal DIBUANG, 2 tool jalan: " + res.results.map((r) => r.tool).join(","));
  ok(res.results.every((r) => r.ok), "kedua tool sukses");
  ok(u.sent.some((s) => Buffer.isBuffer(s.c.image)), "screenshot terkirim selama runAgent");
  ok(/RINGKASAN AKHIR/.test(res.answer), "jawaban dirangkai dari bukti tool");
  // tool runtime baru langsung dikenali TANPA ubah file lain
  R.registerTool({ name: "pingtest", desc: "tes runtime", args: { x: {} }, example: { x: "1" }, run: async () => ({ ok: true, msg: "pong", evidence: "PONG-BUKTI" }) });
  ok(renderPlanPrompt().includes("pingtest ("), "tool runtime langsung muncul di prompt planner");
  const ex2 = buildExecutors(u.m, u.sock, {}, null, {}, null);
  ok(typeof ex2.pingtest === "function", "tool runtime langsung punya executor");
  R.unregisterTool("pingtest");
}

P._clearScreenshotForTest();
P._setRootForTest(null);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
