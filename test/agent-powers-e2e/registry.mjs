// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e registry tool deklaratif
import * as R from "../../src/lib/rara-agent-registry.js";
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const throws = (fn, re, n) => { try { fn(); ok(false, n + " (harusnya throw)"); } catch (e) { ok(re.test(e.message), n); } };

R._resetRegistryForTest();
console.log("[1] defineTool validasi");
throws(() => R.defineTool({ name: "X!", desc: "d", run() {} }), /gak valid/, "nama ilegal");
throws(() => R.defineTool({ name: "abc", run() {} }), /desc wajib/, "desc wajib");
throws(() => R.defineTool({ name: "abc", desc: "d" }), /run wajib/, "run wajib");
throws(() => R.defineTool({ name: "abc", desc: "d", args: { "1x": {} }, run() {} }), /nama arg/, "nama arg ilegal");
R.defineTool({
  name: "readfile", desc: "baca file", perm: "owner", order: 20, doing: "baca filenya", topic: "berkas",
  args: { path: { required: true, desc: "path relatif", max: 50 }, from: { type: "number" }, full: { type: "boolean" }, mode: { enum: ["a", "b"] } },
  example: { path: "src/a.js" },
  run: async (c) => ({ ok: true, msg: "baca " + c.path, got: c }),
});
R.defineTool({ name: "halo", desc: "sapa", order: 10, example: { text: "x" }, args: { text: {} }, run: async (c) => ({ ok: true, msg: "halo " + (c.text || "") }) });
throws(() => R.defineTool({ name: "halo", desc: "d", run() {} }), /sudah terdaftar/, "duplikat ditolak");

console.log("[2] turunan otomatis");
ok(R.listToolNames().join() === "halo,readfile", "urutan sesuai order");
ok(R.hasTool("HALO") && !R.hasTool("nope"), "hasTool case-insensitive");
const d = R.describeTools();
ok(/halo \(sapa/.test(d) && /readfile \(baca file — isi "path" \(wajib, path relatif\)/.test(d) && /\[OWNER saja\]/.test(d), "describeTools memuat skema + penanda owner");
ok(JSON.parse(R.exampleJson()).length === 2, "exampleJson valid JSON");
ok(R.topicMap().readfile === "berkas" && R.doingMap().readfile === "baca filenya", "topicMap/doingMap dari registry");
ok(R.doingPhrase("gaada") === "ngerjain gaada-nya", "doingPhrase fallback");

console.log("[3] normalizeToolCall — sanitasi dari skema");
{
  const n = R.normalizeToolCall({ tool: "readfile", path: "a.js", from: "5", full: "ya", mode: "A", liar: "x", __proto__x: 1 });
  ok(n.path === "a.js" && n.from === 5 && n.full === true && n.mode === "a", "tipe dipaksa + enum dinormalkan");
  ok(!("liar" in n), "field di luar skema DIBUANG");
  ok(R.normalizeToolCall({ tool: "readfile", path: "x".repeat(500) }).path.length === 50, "dipotong max");
  ok(!("mode" in R.normalizeToolCall({ tool: "readfile", path: "a", mode: "zzz" })), "enum tak valid dibuang");
  ok(!("from" in R.normalizeToolCall({ tool: "readfile", path: "a", from: "abc" })), "number tak valid dibuang");
  ok(R.normalizeToolCall({ tool: "readfile", args: "lib/b.js" }).path === "lib/b.js", "alias args → field string pertama");
  ok(R.normalizeToolCall({ tool: "readfile", data: { path: "c.js" } }).path === "c.js", "ambil dari data{}");
  ok(R.normalizeToolCall({ tool: "readfile" }).__missing?.[0] === "path", "arg wajib kosong ditandai");
  ok(R.normalizeToolCall({ tool: "tidakada" }) === null, "tool asing → null");
  ok(R.normalizeToolCall(null) === null, "null aman");
}

console.log("[4] buildExecutorMap — gate level kode");
{
  const asUser = R.buildExecutorMap({ m: { isOwner: false } });
  const asOwner = R.buildExecutorMap({ m: { isOwner: true } });
  ok(Object.keys(asUser).join() === "halo,readfile", "semua tool masuk peta");
  const u = await asUser.readfile({ tool: "readfile", path: "a" });
  ok(u.ok === false && /owner/.test(u.msg), "non-owner ditolak di tool owner");
  const o = await asOwner.readfile({ tool: "readfile", path: "a" });
  ok(o.ok === true && o.msg === "baca a", "owner lolos");
  const miss = await asOwner.readfile({ tool: "readfile", __missing: ["path"] });
  ok(miss.ok === false && /butuh: path/.test(miss.msg), "arg wajib kosong → pesan jelas");
  const seam = R.buildExecutorMap({ m: { isOwner: false }, deps: { halo: async () => ({ ok: true, msg: "SEAM" }) } });
  ok((await seam.halo({})).msg === "SEAM", "deps seam menimpa run bawaan");
  R.registerTool({ name: "boom", desc: "d", run: async () => { throw new Error("meledak"); } });
  const b = await R.buildExecutorMap({ m: { isOwner: true } }).boom({ tool: "boom" });
  ok(b.ok === false && /meledak/.test(b.msg), "exception tool ditangkap, tak menjatuhkan agent");
  R.unregisterTool("boom");
}

console.log("[5] runtime register + legacy TOOLS");
{
  R.registerTool({ name: "plugx", desc: "dari plugin", run: async () => ({ ok: true, msg: "x" }) });
  ok(R.listToolNames().includes("plugx"), "registerTool runtime");
  R.registerTool({ name: "plugx", desc: "v2", run: async () => ({ ok: true }) }, { replace: true });
  ok(R.getTool("plugx").desc === "v2", "replace=true menimpa");
  const legacy = R.toLegacyTools((conn, m) => ({ m, sock: conn }));
  ok(legacy.readfile.perm === "owner" && legacy.readfile.args.includes("path") && typeof legacy.readfile.run === "function", "bentuk legacy TOOLS");
  await legacy.halo.run({}, {}, { text: "dunia" });
  let threw = false; try { await legacy.readfile.run({}, { isOwner: true }, {}); } catch { threw = true; }
  ok(threw, "legacy: arg wajib kosong → throw (raraai.js nangkep)");
}

console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
